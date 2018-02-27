const path = require('path');
const electron = require('electron');
const { dialog } = require('electron');
const fs = require('fs');
const JSONStorage = require('node-localstorage').JSONStorage;
// const APPVERSION = require('./package.json').version;
// const compareVersions = require('compare-versions');
const minimist = require('minimist');
const fileWatcher = require('chokidar');

const { app, BrowserWindow, ipcMain: ipc, Menu: menu, globalShortcut: gsc, shell } = electron;

let fileWatcherEnabled = true;
let fileWatcherDisabledTimeout = null;

if (process.env.NODE_ENV === 'development') {
	require('electron-debug')(); // eslint-disable-line global-require
}

const argv = minimist(process.argv.slice(process.env.NODE_ENV === 'development' ? 2 : 1), {
	boolean: ['help'],
	string: ['portable'],
	alias: {
		help: 'h',
		portable: 'p',
	},
});

if (argv.help) {
	console.log(`Usage: todox [OPTION]...

Optional arguments:
	-p, --portable [DIRECTORY] run in portable mode, saving data in executable directory, or in alternate path
	-h, --help                 show this usage text.
	`);

	process.exit(0);
}

// get data location
const getDataLocation = () => {
	const location = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']
		+ '/.todox'
		+ (process.env.NODE_ENV === 'development' ? '/dev' : '');

	// if (typeof argv.portable !== 'undefined') {
	// 	location = argv.portable !== '' ? argv.portable : process.cwd() + '/userdata';
	// 	app.setPath('userData', location);
	// }

	return location;
};

const storageLocation = getDataLocation();

global.nodeStorage = new JSONStorage(storageLocation);

global.handleContent = {
	filename: '',
	write(content) {
		fs.writeFileSync(this.filename, content, 'utf8');
	},
	read() {
		console.log('=====> reading file: ' + this.filename);
		return fs.existsSync(this.filename) ? fs.readFileSync(this.filename, 'utf8') : false;
	},
	setFile(filename) {
		this.filename = filename;
	}
};

global.setFileLocation = (win) => {
	// console.log('====> opening file selector dialog...');
	dialog.showOpenDialog(win, {
		properties: ['openFile'],
		filters: [{ name: 'Text File', extensions: ['txt'] }]
	}, (filepaths) => {
		// console.log(filepaths);
		if (!filepaths || filepaths.length === 0) return;
		global.handleContent.setFile(filepaths[0]);
		mainWindow.webContents.send('loadNewContent');
		global.nodeStorage.setItem('todo_filepath', filepaths[0]);
	});
};

const installExtensions = () => {
	if (process.env.NODE_ENV === 'development') {
		const installer = require('electron-devtools-installer'); // eslint-disable-line
		const extensions = [
			'REACT_DEVELOPER_TOOLS'
		];
		const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
		extensions.map((ext) => {
			try {
				installer.default(installer[ext], forceDownload);
			} catch (e) {} // eslint-disable-line
			return ext;
		});
	}
};

// app init
let mainWindow = null;
app.on('window-all-closed', () => {
	app.quit();
});

app.on('ready', () => {
	installExtensions();

	const todoFilePath = global.nodeStorage.getItem('todo_filepath') || storageLocation + '/todo.txt';
	global.handleContent.setFile(todoFilePath);

	const watcher = fileWatcher.watch(todoFilePath, { persistent: true });
	watcher.on('change', () => {
		if (fileWatcherEnabled) mainWindow.webContents.send('loadNewContent');
	});

	let windowState = {};
	try {
		windowState = global.nodeStorage.getItem('windowstate') || {};
	}
	catch (err) {
		console.log('empty window state file, creating new one.');
	}

	ipc.on('writeContent', (event, arg) => {
		clearTimeout(fileWatcherDisabledTimeout);
		fileWatcherEnabled = false;
		global.handleContent.write(arg);
		fileWatcherDisabledTimeout = setTimeout(() => { fileWatcherEnabled = true; }, 1000);
	});

	const windowSettings = {
		show: false,
		title: app.getName(),
		icon: path.join(__dirname, '/app/assets/img/icon.png'),
		x: (windowState.bounds && windowState.bounds.x) || undefined,
		y: (windowState.bounds && windowState.bounds.y) || undefined,
		width: (windowState.bounds && windowState.bounds.width) || 550,
		height: (windowState.bounds && windowState.bounds.height) || 450,
		darkTheme: true,
		backgroundColor: '#002b36',
		titleBarStyle: 'hidden',
		autoHideMenuBar: true
	};

	mainWindow = new BrowserWindow(windowSettings);
	mainWindow.loadURL(path.join('file://', __dirname, '/app/app.html'));

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
		// Restore maximised state if it is set. not possible via options so we do it here
		if (windowState.isMaximized) {
			mainWindow.maximize();
		}
		mainWindow.focus();
		mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
	});

	const dispatchShortcutEvent = (ev) => {
		mainWindow.webContents.send('executeShortCut', ev);
	};

	const registerShortcuts = () => {
		gsc.register('CmdOrCtrl+0', () => { dispatchShortcutEvent('reset-font'); });
		gsc.register('CmdOrCtrl+-', () => { dispatchShortcutEvent('decrease-font'); });
		gsc.register('CmdOrCtrl+=', () => { dispatchShortcutEvent('increase-font'); });
		gsc.register('CmdOrCtrl+Plus', () => { dispatchShortcutEvent('increase-font'); });
		gsc.register('CmdOrCtrl+i', () => { dispatchShortcutEvent('toggle-theme'); });
		gsc.register('CmdOrCtrl+s', () => { dispatchShortcutEvent('save'); });
		gsc.register('CmdOrCtrl+t', () => { dispatchShortcutEvent('toggle-toolbar'); });
		gsc.register('CmdOrCtrl+f', () => { dispatchShortcutEvent('focus-search'); });
		gsc.register('Alt+Up', () => { dispatchShortcutEvent('increase-priority'); });
		gsc.register('Alt+Down', () => { dispatchShortcutEvent('decrease-priority'); });
		gsc.register('CmdOrCtrl+r', () => { mainWindow.webContents.reload(); });
		gsc.register('CmdOrCtrl+w', () => { app.quit(); });
		gsc.register('CmdOrCtrl+q', () => { app.quit(); });
		gsc.register('f11', () => { mainWindow.setFullScreen(!mainWindow.isFullScreen()); });
	};

	registerShortcuts();

	mainWindow.on('focus', () => {
		registerShortcuts();
	});

	mainWindow.on('blur', () => {
		gsc.unregisterAll();
	});

	const storeWindowState = () => {
		windowState.isMaximized = mainWindow.isMaximized();
		if (!windowState.isMaximized) {
			// only update bounds if the window isn't currently maximized
			windowState.bounds = mainWindow.getBounds();
		}
		global.nodeStorage.setItem('windowstate', windowState);
	};

	['resize', 'move', 'close'].forEach((e) => {
		mainWindow.on(e, () => {
			storeWindowState();
		});
	});

	let template = [{
		label: app.getName(),
		submenu: [
			{
				label: 'Open Todo File',
				accelerator: 'Command+O',
				click() { global.setFileLocation(); }
			},
			{
				label: 'Website',
				click() { shell.openExternal('https://github.com/mfyz/todox'); }
			},
			{
				label: 'Support',
				click() { shell.openExternal('https://github.com/mfyz/todox/issues'); }
			},
			// {
			//   label: 'Check for updates (current: ' + APPVERSION + ')',
			//   click() { shell.openExternal('https://github.com/mfyz/todox/releases'); }
			// },
			{
				type: 'separator'
			},
			{
				label: 'Quit',
				accelerator: 'CmdOrCtrl+Q',
				click() { app.quit(); }
			}]
	}];

	if (process.platform === 'darwin') {
		template = [{
			label: app.getName(),
			submenu: [
				{
					label: 'About ' + app.getName(),
					click() { shell.openExternal('https://github.com/mfyz/todox'); }
				},
				{
					label: 'Support',
					click() { shell.openExternal('https://github.com/mfyz/todox/issues'); }
				},
				// {
				// 	label: 'Check for updates (current: ' + APPVERSION + ')',
				// 	click() { shell.openExternal('https://github.com/mfyz/todox/releases'); }
				// },
				{
					type: 'separator'
				},
				{
					label: 'Open Todo File',
					accelerator: 'Command+O',
					click() { global.setFileLocation(mainWindow); }
				},
				{
					type: 'separator'
				},
				{
					label: 'Hide ' + app.getName(),
					accelerator: 'Command+H',
					role: 'hide'
				},
				{
					label: 'Hide Others',
					accelerator: 'Command+Alt+H',
					role: 'hideothers'
				},
				{
					label: 'Show All',
					role: 'unhide'
				},
				{
					type: 'separator'
				},
				{
					label: 'Quit',
					accelerator: 'Command+Q',
					click() { app.quit(); }
				}
			]
		}, {
			label: 'Edit',
			submenu: [
				{
					label: 'Undo',
					accelerator: 'CmdOrCtrl+Z',
					selector: 'undo:'
				}, {
					label: 'Redo',
					accelerator: 'Shift+CmdOrCtrl+Z',
					selector: 'redo:'
				}, {
					type: 'separator'
				}, {
					label: 'Cut',
					accelerator: 'CmdOrCtrl+X',
					selector: 'cut:'
				}, {
					label: 'Copy',
					accelerator: 'CmdOrCtrl+C',
					selector: 'copy:'
				}, {
					label: 'Paste',
					accelerator: 'CmdOrCtrl+V',
					selector: 'paste:'
				}, {
					label: 'Select All',
					accelerator: 'CmdOrCtrl+A',
					selector: 'selectAll:'
				}
			]
		}, {
			label: 'Task',
			submenu: [{
				label: 'Toggle Task Done',
				accelerator: 'CmdOrCtrl+/',
				click() { dispatchShortcutEvent('task-check'); }
			}, {
				label: 'Move Task Up',
				accelerator: 'CmdOrCtrl+Up',
				click() { dispatchShortcutEvent('task-move-up'); }
			}, {
				label: 'Move Task Down',
				accelerator: 'CmdOrCtrl+Down',
				click() { dispatchShortcutEvent('task-move-down'); }
			}, {
				label: 'Toggle Subtasks Collapse',
				accelerator: 'CmdOrCtrl+]',
				click() { dispatchShortcutEvent('task-toggle-subtasks'); }
			}, {
				label: 'Move Completed Tasks Down',
				accelerator: 'CmdOrCtrl+\\',
				click() { dispatchShortcutEvent('task-move-completed'); }
			}]
		}, {
			label: 'Priority',
			submenu: [{
				label: 'Increase Priority',
				// accelerator: 'Alt+Up',
				click() { dispatchShortcutEvent('increase-priority'); }
			}, {
				label: 'Decrease Priority',
				// accelerator: 'Alt+Down',
				click() { dispatchShortcutEvent('decrease-priority'); }
			}]
		}, {
			label: 'View',
			submenu: [
				{
					label: 'Toggle Filter Bar',
					accelerator: 'CmdOrCtrl+T',
					click() { dispatchShortcutEvent('toggle-toolbar'); }
				}, {
					type: 'separator'
				}, {
					label: 'Toggle Theme',
					accelerator: 'CmdOrCtrl+i',
					click() { dispatchShortcutEvent('toggle-theme'); }
				}, {
					type: 'separator'
				}, {
					label: 'Increase Font Size',
					accelerator: 'CmdOrCtrl+Plus',
					click() { dispatchShortcutEvent('increase-font'); }
				}, {
					label: 'Decrease Font Size',
					accelerator: 'CmdOrCtrl+-',
					click() { dispatchShortcutEvent('decrease-font'); }
				}, {
					label: 'Reset Font Size',
					accelerator: 'CmdOrCtrl+0',
					click() { dispatchShortcutEvent('reset-font'); }
				}, {
					type: 'separator'
				},
				// {role: 'reload'},
				{
					label: 'Open Developer Tools',
					accelerator: 'CmdOrCtrl+Option+J',
					click() { mainWindow.openDevTools(); }
				}
			]
		}];
	}

	const menuBar = menu.buildFromTemplate(template);
	menu.setApplicationMenu(menuBar);

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	if (process.env.NODE_ENV === 'development') {
		// mainWindow.openDevTools();
	}
});
