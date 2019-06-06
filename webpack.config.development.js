/* eslint strict: 0 */

'use strict';

let webpack = require('webpack');
let webpackTargetElectronRenderer = require('webpack-target-electron-renderer');
let baseConfig = require('./webpack.config.base');


let config = Object.create(baseConfig);

config.debug = true;

config.devtool = 'cheap-module-eval-source-map';

config.entry = [
	'webpack-hot-middleware/client?path=http://localhost:5849/__webpack_hmr',
	'./app/mainApp'
];

config.output.publicPath = 'http://localhost:5849/dist/';

config.plugins.push(
	new webpack.HotModuleReplacementPlugin(),
	new webpack.NoErrorsPlugin(),
	new webpack.DefinePlugin({
		__DEV__: true,
		'process.env': JSON.stringify('development')
	})
);

config.target = webpackTargetElectronRenderer(config);

module.exports = config;
