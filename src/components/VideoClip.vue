<template>
  <video
    :src="`/videos/${file}`"
    class="video"
    :class="{ visible }"
    @loadedmetadata="setDuration"
    @timeupdate="checkTime"
    @ended="loop"
  />
</template>

<script>
import random from 'random';
import seedrandom from 'seedrandom';

const CLIP_LENGTH = 30;
const SHOW_VIDEO_AT = 20;
const PREVIEW_LENGTH = 15;
const REVIEW_LENGTH = 10;

random.use(seedrandom(new Date().setHours(0, 0, 0, 0)));

export default {
  data() {
    return {
      visible: false,
      looped: false,
      startClipAt: 0,
      showVideoAt: 0,
      endClipAt: 0,
    };
  },
  props: {
    file: String,
    playing: Boolean,
    reviewing: Boolean,
    previewing: Boolean,
  },
  watch: {
    playing(playing) {
      this.$el[playing ? 'play' : 'pause']();
    },
    reviewing(reviewing) {
      if (!reviewing) return;
      let { currentTime } = this.$el;
      if (this.looped) currentTime += this.$el.duration;
      this.endClipAt = currentTime + REVIEW_LENGTH;
      this.visible = true;
      this.$el.play();
    },
    previewing(previewing) {
      if (!previewing) return;
      let { currentTime } = this.$el;
      if (this.looped) currentTime += this.$el.duration;
      this.endClipAt = currentTime + PREVIEW_LENGTH;
      this.$el.play();
    },
  },
  methods: {
    setDuration() {
      this.startClipAt = random.float(0, this.$el.duration);
      if (this.startClipAt + CLIP_LENGTH >= this.$el.duration) this.startClipAt = 0;
      this.showVideoAt = this.startClipAt + SHOW_VIDEO_AT;
      this.endClipAt = this.startClipAt + CLIP_LENGTH;
      this.$el.currentTime = this.startClipAt;
    },
    checkTime() {
      let { currentTime } = this.$el;
      if (this.looped) currentTime += this.$el.duration;
      if (currentTime >= this.showVideoAt) this.visible = true;
      if (currentTime >= this.endClipAt) this.$el.pause();
    },
    loop() {
      this.looped = true;
      this.$el.play();
    },
  },
};
</script>

<style lang="scss" scoped>
  .video {
    @include position(absolute, 0);
    @include size(100vw, 100vh);
    background-color: black;
    object-fit: contain;
  }

  :not(.visible) {
    display: none;
  }
</style>
