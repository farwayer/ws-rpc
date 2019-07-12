const caniuse  = require('caniuse-api')


const esm = !!process.env.ESM
const wsSupport = Object.entries(caniuse.getSupport('websocket'))
  .filter(([_, {y}]) => y)
  .map(([name, {y}]) => `${name} >= ${y}`)

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: [
        ...wsSupport,
        'not dead',
      ],
      ...(esm ? {modules: false} : {}),
    }],
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-export-default-from',
    ['@babel/plugin-transform-runtime', {useESModules: esm}],
  ],
}
