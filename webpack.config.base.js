const path = require('path')

module.exports = {
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: 'babel-loader'
			},
			{
				test: /\.(otf)/,
				loader: 'url-loader'
			},
			{
				test: /\.scss$/,
				loaders: [
					'style-loader',
					'css-loader',
					'sass-loader'
				]
			}
		]
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'bundle.js',
		libraryTarget: 'commonjs2'
	},
	resolve: {
		extensions: ['.js', '.jsx', '.css', '.scss'],
		mainFields: ['webpack', 'browser', 'web', 'browserify', ['jam', 'main'], 'main']
	},
	plugins: [

	]
}
