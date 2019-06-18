const path = require('path') // eslint-disable-line
const express = require('express') // eslint-disable-line
const webpack = require('webpack') // eslint-disable-line
const config = require('./webpack.config.development') // eslint-disable-line

const app = express()
const compiler = webpack(config)

// eslint-disable-next-line
app.use(require('webpack-dev-middleware')(compiler, { 
	publicPath: config.output.publicPath,
	stats: {
		colors: true
	}
}))

// eslint-disable-next-line
app.use(require('webpack-hot-middleware')(compiler))

app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'app', 'app.html'))
})

app.listen(5849, 'localhost', (err) => {
	if (err) {
		console.log(err)
		return
	}

	console.log('Listening at http://localhost:5849')
})
