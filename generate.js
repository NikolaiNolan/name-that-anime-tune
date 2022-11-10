const { createWriteStream, emptyDir, writeFileSync } = require('fs-extra');
const { gql } = require('graphql-request');
const {
  compact,
  filter,
  find,
  findIndex,
  flatMap,
  intersection,
  isNil,
  map,
  omitBy,
  orderBy,
} = require('lodash');
const sequential = require('promise-sequential');
const { pipeline } = require('stream');
const { promisify } = require('util');

const MAX_MEDIA = 750;
const MAX_EASY = 200;
const MAX_HARD = 100;

const popularAnimeQuery = gql`
  query($page: Int) {
    Page(page: $page) {
      pageInfo {
        currentPage
        hasNextPage
        perPage
      }
      media(isAdult: false, type: ANIME, sort: POPULARITY_DESC) {
        id
        format
        relations {
          edges {
            node {
              id
              title {
                english
              }
              relations {
                edges {
                  node {
                    id
                    title {
                      english
                    }
                  }
                  relationType(version: 2)
                }
              }
            }
            relationType(version: 2)
          }
        }
        title {
          english
          romaji
        }
      }
    }
  }
`;

(async () => {
  const { got } = await import('got');

  let media = await got.paginate.all({
    url: 'https://graphql.anilist.co',
    method: 'POST',
    searchParams: {
      query: popularAnimeQuery,
    },
    pagination: {
      transform: (response) => JSON.parse(response.body).data.Page.media,
      paginate: ({ response }) => {
        const { currentPage, hasNextPage, perPage } = JSON.parse(response.body).data.Page.pageInfo;
        if (!hasNextPage) return false;
        return {
          searchParams: {
            query: popularAnimeQuery,
            variables: JSON.stringify({
              page: currentPage + 1,
              perPage,
            }),
          },
        };
      },
      countLimit: MAX_MEDIA,
    },
  });

  media = media.filter(({ format }) => /^TV(_SHORT)?|OVA|ONA$/.test(format));

  const filterParents = (edges) => edges.filter(({ relationType }) => ['ALTERNATIVE', 'PARENT', 'PREQUEL', 'SEQUEL'].includes(relationType));

  media = media.filter(({ id, relations }, index) => {
    const prevMedia = media.slice(0, index);
    const prevMediaIds = map(prevMedia, 'id');

    const parents = filterParents(relations.edges);
    let grandparents = filterParents(flatMap(parents, 'node.relations.edges'));
    grandparents = grandparents.filter(({ node }) => node.id !== id);
    const parentIds = map([...parents, ...grandparents], 'node.id');

    return !intersection(prevMediaIds, parentIds).length;
  });

  const getAtm = async ({ path, paginate, ...params }) => {
    const func = paginate ? got.paginate.all : got;
    return func({
      url: `https://api.animethemes.moe/${path}`,
      resolveBodyOnly: true,
      responseType: paginate ? 'text' : 'json',
      ...params,
    });
  };

  getAtm.paginate = ({ countLimit = Number.POSITIVE_INFINITY, searchParams, ...params }) => getAtm({
    paginate: true,
    searchParams: {
      'page[size]': 100,
      ...searchParams,
    },
    pagination: {
      transform: (response) => {
        const body = JSON.parse(response.body);
        const mainKey = Object.keys(body).find((key) => key !== 'links' && key !== 'meta');
        return body[mainKey];
      },
      paginate: ({ response }) => {
        const { links } = JSON.parse(response.body);
        if (links.next) return { url: new URL(links.next) };
        return false;
      },
      countLimit,
    },
    ...params,
  });

  let resources = await getAtm.paginate({
    path: 'resource',
    searchParams: {
      'filter[external_id]': map(media, 'id').join(),
      'filter[site]': 'AniList',
      include: 'anime',
    },
  });
  resources = filter(resources, 'anime.length');
  resources = resources.map((resource) => ({
    ...resource,
    title: find(media, { id: resource.external_id }).title,
    rank: findIndex(media, { id: resource.external_id }),
  }));

  const atmAnimeIds = compact(map(resources, 'anime[0].id'));

  const animes = await getAtm.paginate({
    path: 'anime',
    searchParams: {
      'fields[anime]': 'id',
      'fields[animetheme]': 'id,type',
      'fields[animethemeentry]': 'episodes,nsfw,spoiler',
      'fields[video]': 'link,lyrics,nc,resolution,subbed',
      'filter[anime][id]': atmAnimeIds.join(),
      include: 'animethemes.animethemeentries.videos',
    },
  });

  let videoLinks = animes.map(({ animethemes, id }) => {
    let themes = filter(animethemes, { type: 'OP' });
    if (!themes.length) themes = filter(animethemes, { type: 'ED' });

    const themeEntries = flatMap(themes, 'animethemeentries');
    const nonFirstEpEntries = themeEntries.filter(({ episodes }) => episodes !== '1');
    const safeThemeEntry = find(nonFirstEpEntries, { nsfw: false, spoiler: false });
    if (!safeThemeEntry) return null;

    const bestVideos = filter(safeThemeEntry.videos, { lyrics: false, subbed: false });
    const bestVideo = orderBy(bestVideos, ['nc', 'resolution'], ['desc', 'desc'])[0];
    if (!bestVideo) return null;

    const { rank, title } = resources.find(({ anime }) => anime[0].id === id);
    const { pathname } = new URL(bestVideo.link);
    return {
      link: bestVideo.link,
      pathname,
      rank,
      title,
    };
  });
  videoLinks = orderBy(compact(videoLinks), 'rank');

  const easyVideoLinks = videoLinks.slice(0, MAX_EASY);
  const hardVideoLinks = videoLinks.slice(MAX_EASY, MAX_EASY + MAX_HARD);

  await emptyDir('./public/videos');

  const pipelinePromise = promisify(pipeline);
  await sequential(
    [...easyVideoLinks, ...hardVideoLinks].map(({ link, pathname }) => async () => pipelinePromise(got.stream(link), createWriteStream(`./public/videos${pathname}`))),
  );

  const lettersOnly = (text) => text.toLowerCase().replace(/\W/g, '');
  [easyVideoLinks, hardVideoLinks].forEach((videoLinkGroup, index) => {
    const videos = videoLinkGroup.map(({ pathname, title }) => {
      const englishTitle = title.english || title.romaji;
      const romajiTitle = title.romaji || '';
      let subtitle;
      if (!lettersOnly(englishTitle).includes(lettersOnly(romajiTitle))) {
        subtitle = title.romaji;
      }

      return omitBy(
        {
          title: englishTitle,
          subtitle,
          file: pathname,
        },
        isNil,
      );
    });

    writeFileSync(`./src/assets/videos-${index ? 'hard' : 'easy'}.json`, JSON.stringify(videos));
  });
})();
