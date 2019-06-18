/* eslint-disable import/no-extraneous-dependencies */
const os = require('os')
const webpack = require('webpack')
const packager = require('electron-packager')
const assign = require('object-assign')
const del = require('del')
const argv = require('minimist')(process.argv.slice(2))
const cfg = require('./webpack.config.production.js')
const devDeps = Object.keys(require('./package.json').devDependencies)
/* eslint-enable */

const appName = argv.name || argv.n || 'TodoX'
const shouldUseAsar = argv.asar || argv.a || true
const shouldBuildAll = argv.all || false

const DEFAULT_OPTS = {
	dir: './',
	name: appName,
	win32metadata: {
		FileDescription: appName,
		ProductName: appName
	},
	asar: shouldUseAsar,
	packageManager: false,
	prune: false,
	ignore: [
		'/.vscode',
		'/README.md',
		'/server.js',
		'/webpack.*',
		'/app/mainApp.jsx',
		'/app/containers($|/)',
		'/app/assets/style($|/)',
		'/build($|/)',
		'/test($|/)',
		'/tools($|/)',
		'/release($|/)'
	].concat(devDeps.map(name => '/node_modules/' + name + '($|/)'))
}

const icon = argv.icon || argv.i || 'build/icon'

if (icon) {
	DEFAULT_OPTS.icon = icon
}

const version = argv.version || argv.v || '1.0.0'
DEFAULT_OPTS.version = version
startPack()


function startPack() {
	console.log('start pack...')
	// pack(os.platform(), os.arch(), log(os.platform(), os.arch()));return
	webpack(cfg, (err, /* stats */) => {
		if (err) return console.error(err)
		del('release')
			.then((/* paths */) => {
				if (shouldBuildAll) {
					// build for all platforms
					const archs = ['ia32', 'x64']
					const platforms = ['linux', 'win32', 'darwin']

					platforms.forEach((plat) => {
						archs.forEach((arch) => {
							pack(plat, arch, log(plat, arch))
						})
					})
				}
				else {
					// build for current platform only
					pack(os.platform(), os.arch(), log(os.platform(), os.arch()))
				}
			})
			.catch((err2) => {
				console.error(err2)
			})
	})
}

function pack(plat, arch, cb) {
	// there is no darwin ia32 electron
	if (plat === 'darwin' && arch === 'ia32') return

	const iconObj = {
		icon: DEFAULT_OPTS.icon + (() => {
			let extension = '.png'
			if (plat === 'darwin') {
				extension = '.icns'
			}
			else if (plat === 'win32') {
				extension = '.ico'
			}
			return extension
		})()
	}

	const opts = assign({}, DEFAULT_OPTS, iconObj, {
		platform: plat,
		arch,
		out: 'release/' + plat + '-' + arch
	})

	packager(opts, cb)
}


function log(plat, arch) {
	return (err, /* filepath */) => {
		if (err) return console.error(err)
		console.log(plat + '-' + arch + ' finished!')
	}
}
