const webpack = require('webpack')
// const webpackTargetElectronRenderer = require('webpack-target-electron-renderer')
const baseConfig = require('./webpack.config.base')

const config = Object.assign({}, baseConfig)

config.mode = 'development'

config.entry = [
	'webpack-hot-middleware/client?path=http://localhost:5849/__webpack_hmr',
	'./app/mainApp'
]

config.output.publicPath = 'http://localhost:5849/dist/'

config.plugins.push(
	new webpack.HotModuleReplacementPlugin(),
	new webpack.DefinePlugin({
		__DEV__: true,
		'process.env': JSON.stringify('development')
	})
)

config.target = 'electron-renderer'

module.exports = config
