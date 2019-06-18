const webpack = require('webpack')
const baseConfig = require('./webpack.config.base')

const config = Object.assign({}, baseConfig)

config.mode = 'production'
config.entry = './app/mainApp'
config.output.publicPath = '/dist/'

config.plugins.push(
	new webpack.optimize.OccurrenceOrderPlugin(),
	new webpack.DefinePlugin({
		__DEV__: false,
		'process.env': JSON.stringify('production')
	}),
)

config.target = 'electron-renderer'

module.exports = config
