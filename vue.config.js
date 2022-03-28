const { includePaths } = require('bourbon');

module.exports = {
  lintOnSave: false,

  pages: {
    index: 'src/main.js',
    controls: 'src/controls/main.js',
  },

  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'scss',
      patterns: [`${includePaths[0]}/*.scss`],
    },
  },
};
