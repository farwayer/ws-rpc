module.exports = {
  presets: [
    ['@babel/preset-env', {
      bugfixes: true,
      loose: true,
      modules: false,
      useBuiltIns: 'entry',
      corejs: 3,
      targets: [
        'supports websockets and ' +
        // do not transform arrow functions
        'chrome 47, edge 13, firefox 45, opera 34'
      ],
    }],
  ],
  plugins: [
    ['@babel/plugin-proposal-class-properties', {loose: true}],
    '@babel/plugin-transform-runtime',
  ],
}
