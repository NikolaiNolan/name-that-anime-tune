<template>
  <div>
    <header
      v-if="reviewing"
      class="title"
    >
      {{currentVideo.title}}
      <div class="subtitle">{{currentVideo.subtitle}}</div>
    </header>
    <VideoClip
      :key="currentVideo.file"
      :file="currentVideo.file"
      :playing="playing"
      :reviewing="reviewing"
      :previewing="previewing"
    />
    <VideoClip
      :key="nextVideo.file"
      :file="nextVideo.file"
      :style="{ display: 'none' }"
    />
    <div class="score score--left">
      {{score.left || null}}
      <div
        class="name"
        :class="{ buzzing: leftBuzzing }"
      >
        {{name.left}}
      </div>
    </div>
    <div class="score score--center">
      {{score.center || null}}
      <div
        class="name"
        :class="{ buzzing: centerBuzzing }"
      >
        {{name.center}}
      </div>
    </div>
    <div class="score score--right">
      {{score.right || null}}
      <div
        class="name"
        :class="{ buzzing: rightBuzzing }"
      >
        {{name.right}}
      </div>
    </div>
    <footer class="footer">
      Name That Anime Tune
    </footer>
    <audio
      ref="leftSound"
      src="/sounds/buzzin.ogg"
    />
    <audio
      ref="timeUpSound"
      src="/sounds/timeup.ogg"
    />
    <a v-if="!initialized" href="/controls.html" target="_blank">
      Click to initialize
    </a>
    <div
      v-if="!name.left && !name.center && !name.right"
      class="credit"
    >
      Illustration: deviantart.com/armyovskul
    </div>
  </div>
</template>

<script>
import shuffleSeed from 'shuffle-seed';

import easyVideoList from './assets/videos-easy.json';
import hardVideoList from './assets/videos-hard.json';

import VideoClip from './components/VideoClip.vue';

const easyVideos = shuffleSeed.shuffle(easyVideoList, new Date().setHours(0, 0, 0, 0));
const hardVideos = shuffleSeed.shuffle(hardVideoList, new Date().setHours(0, 0, 0, 0));

const channel = new BroadcastChannel('channel');

const ANSWER_WAIT = 10;

export default {
  components: {
    VideoClip,
  },
  data() {
    return {
      initialized: false,
      difficulty: 'easy',
      index: 0,
      playing: false,
      reviewing: false,
      previewing: false,
      name: {},
      lastBuzz: null,
      leftBuzzing: false,
      centerBuzzing: false,
      rightBuzzing: false,
      leftBuzzed: false,
      centerBuzzed: false,
      rightBuzzed: false,
      score: { left: 0, center: 0, right: 0 },
      timeout: () => {},
    };
  },
  computed: {
    videos() {
      return this.difficulty === 'easy' ? easyVideos : hardVideos;
    },
    currentVideo() {
      return this.videos[this.index];
    },
    nextVideo() {
      return this.videos[this.index + 1];
    },
  },
  watch: {
    currentVideo: {
      handler(video) {
        this.postMessage({ video });
      },
      deep: true,
    },
  },
  methods: {
    receiveMessage({ data }) {
      if (data.name) {
        this.name = data.name;
        return;
      }
      if (data.score) {
        this.score = data.score;
        return;
      }
      if (this[data] && typeof this[data] === 'function') this[data]();
    },
    postMessage(message) {
      channel.postMessage(message);
    },
    init() {
      this.postMessage({ video: this.currentVideo });
      this.initialized = true;
    },
    easy() {
      this.difficulty = 'easy';
    },
    hard() {
      this.difficulty = 'hard';
    },
    preview() {
      this.previewing = true;
    },
    play() {
      this.leftBuzzing = false;
      this.centerBuzzing = false;
      this.rightBuzzing = false;
      this.playing = true;
    },
    pause() {
      this.playing = false;
    },
    correct() {
      this.leftBuzzing = false;
      this.centerBuzzing = false;
      this.rightBuzzing = false;
      clearTimeout(this.timeout);
      this.postMessage(`${this.lastBuzz}Plus`);
      this.reviewing = true;
    },
    incorrect() {
      this.$refs.timeUpSound.play();
      clearTimeout(this.timeout);
      this.play();
    },
    reveal() {
      this.reviewing = true;
    },
    previous() {
      this.pause();
      this.reviewing = false;
      this.previewing = false;
      this.index -= 1;
    },
    next() {
      this.leftBuzzing = false;
      this.centerBuzzing = false;
      this.rightBuzzing = false;
      this.leftBuzzed = false;
      this.centerBuzzed = false;
      this.rightBuzzed = false;
      this.reviewing = false;
      this.previewing = false;
      this.playing = false;
      this.index += 1;
    },
    nextPlay() {
      this.next();
      this.playing = true;
    },
    leftBuzz() {
      if (!this.playing || this.leftBuzzed) return;
      this.$refs.leftSound.play();
      this.leftBuzzing = true;
      this.leftBuzzed = true;
      this.lastBuzz = 'left';
      this.pause();
      this.timeout = setTimeout(this.timeUp, ANSWER_WAIT * 1000);
    },
    centerBuzz() {
      if (!this.playing || this.centerBuzzed) return;
      this.$refs.leftSound.play();
      this.centerBuzzing = true;
      this.centerBuzzed = true;
      this.lastBuzz = 'center';
      this.pause();
      this.timeout = setTimeout(this.timeUp, ANSWER_WAIT * 1000);
    },
    rightBuzz() {
      if (!this.playing || this.rightBuzzed) return;
      this.$refs.leftSound.play();
      this.rightBuzzing = true;
      this.rightBuzzed = true;
      this.lastBuzz = 'right';
      this.pause();
      this.timeout = setTimeout(this.timeUp, ANSWER_WAIT * 1000);
    },
    timeUp() {
      this.$refs.timeUpSound.play();
    },
  },
  created() {
    window.addEventListener('click', this.init);
    channel.addEventListener('message', this.receiveMessage);
  },
  destroyed() {
    channel.removeEventListener('message', this.receiveMessage);
  },
};
</script>

<style lang="scss">
  html,
  body {
    height: 100%;
  }

  body {
    margin: 0;
    overflow: hidden;
    background: black url(/background.png) center {
      size: cover;
    };
    color: white;
    font: 7.5vmin Montserrat, $font-stack-system;
    line-height: 1.2;
    text: {
      shadow: 0 0 2vmin black;
      align: center;
    }
  }
</style>

<style lang="scss" scoped>
  .title {
    @include position(absolute, 5vmin 5vmin null);
    z-index: 1;
    font-weight: bold;
  }

  .subtitle {
    margin-top: 1vmin;
    font: {
      size: 5vmin;
      weight: 600;
    }
  }

  .score {
    @include position(absolute, null null 12vmin);
    font: {
      size: 12.5vmin;
      weight: bold;
    }
    line-height: 1;

    &--left {
      left: 5vmin;
      text-align: left;
    }
    &--center {
      left: 5vmin;
      right: 5vmin;
      text-align: center;
    }
    &--right {
      right: 5vmin;
      text-align: right;
    }
  }

  .name {
    font: {
      size: 5vmin;
      weight: 600;
    }
    line-height: 1.2;
  }

  .buzzing {
    color: gold;
  }

  .footer {
    @include position(absolute, null 5vmin 5.5vmin);
    font: {
      size: 3.3vmin;
      weight: 300;
    }
  }

  .credit {
    @include position(absolute, null 1vmin 1vmin null);
    font: {
      size: 1.5vmin;
      weight: normal;
    }
  }
</style>
