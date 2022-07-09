<template>
  <div>
    #{{index}}<br>
    <div class="title">{{video.title}}<br></div>
    <div class="title">{{video.subtitle}}<br></div>
    Left player: <input v-model="name.left" /><br>
    <input
      type="number"
      v-model.number="score.left"
    /><br>
    Center player: <input v-model="name.center" /><br>
    <input
      type="number"
      v-model.number="score.center"
    /><br>
    Right player: <input v-model="name.right" /><br>
    <input
      type="number"
      v-model.number="score.right"
    /><br>
    <button @click="index = 0">Reset count</button>
    <br>
    <button @click="postMessage('preview')">Preview</button>
    <button @click="postMessage('play')">Play</button>
    <button @click="postMessage('pause')">Pause</button>
    <br>
    <button @click="postMessage('correct')">Correct</button>
    <button @click="postMessage('incorrect')">Incorrect</button>
    <button @click="postMessage('reveal')">Reveal</button>
    <br>
    <button @click="index -= 1; postMessage('previous')">Previous song</button>
    <button @click="index += 1; postMessage('next')">Next song</button>
    <button @click="index += 1; postMessage('nextPlay')">Next song and play</button>
    <br>
    <button @click="postMessage('easy')">Easy</button>
    <button @click="postMessage('hard')">Hard</button>
  </div>
</template>

<script>
const channel = new BroadcastChannel('channel');

export default {
  data() {
    return {
      name: { left: null, center: null, right: null },
      score: { left: 0, center: 0, right: 0 },
      index: 1,
      video: {},
    };
  },
  watch: {
    name: {
      handler(name) {
        channel.postMessage({ name });
      },
      deep: true,
    },
    score: {
      handler(score) {
        channel.postMessage({ score });
      },
      deep: true,
    },
  },
  methods: {
    receiveMessage({ data }) {
      if (data.video) {
        this.video = data.video;
        return;
      }
      if (this[data] && typeof this[data] === 'function') this[data]();
    },
    postMessage(message) {
      channel.postMessage(message);
    },
    leftPlus() {
      this.score.left += 1;
    },
    centerPlus() {
      this.score.center += 1;
    },
    rightPlus() {
      this.score.right += 1;
    },
    checkKey({ key }) {
      if (key === '[') this.postMessage('leftBuzz');
      if (key === ']') this.postMessage('centerBuzz');
      if (key === '\\') this.postMessage('rightBuzz');
    },
  },
  created() {
    channel.addEventListener('message', this.receiveMessage);
    window.addEventListener('keydown', this.checkKey);
  },
  destroyed() {
    channel.removeEventListener('message', this.receiveMessage);
    window.removeEventListener('keydown', this.checkKey);
  },
};
</script>

<style lang="scss">
  body {
    font: 32px $font-stack-system;
  }
</style>

<style lang="scss" scoped>
  input,
  button {
    font: inherit;
  }

  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
