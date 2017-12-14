import React from 'react';
import Codemirror from 'react-codemirror';
import CodeMirror from '../../node_modules/codemirror/';

require('../../node_modules/codemirror/addon/scroll/simplescrollbars.js');
require('../../node_modules/codemirror/addon/selection/active-line.js');
require('../../node_modules/codemirror/addon/fold/indent-fold.js');
require('../../node_modules/codemirror/addon/fold/foldgutter.js');
require('../../node_modules/codemirror/addon/search/search.js');
require('../../node_modules/codemirror/addon/search/jump-to-line.js');
require('../../node_modules/codemirror/addon/search/matchesonscrollbar.js');
require('../../node_modules/codemirror/addon/mode/simple.js');
require('../../node_modules/codemirror/keymap/sublime.js');

const electron = require('electron');
const ipc = electron.ipcRenderer;
const remote = electron.remote;
const shell = electron.shell;
const handleContent = remote.getGlobal('handleContent');
const nodeStorage = remote.getGlobal('nodeStorage');
let latestVersion;

const CmdOrCtrl = process.platform === 'darwin' ? 'Cmd-' : 'Ctrl-';
const extraKeys = {
	'Shift-Tab': 'indentLess',
	Esc: 'clearSearch',
	'Alt-G': false,

	// from sublime.js package
	[CmdOrCtrl + 'Up']: 'swapLineUp',
	[CmdOrCtrl + 'Down']: 'swapLineDown',

	[CmdOrCtrl + '[']: (cm) => { cm.foldCode(cm.getCursor()); },
	[CmdOrCtrl + ']']: (cm) => { cm.foldCode(cm.getCursor()); },
	[CmdOrCtrl + 'F']: 'findPersistent',
	['Shift-' + CmdOrCtrl + 'F']: 'replace',
	['Shift-' + CmdOrCtrl + 'R']: 'replaceAll',
	[CmdOrCtrl + 'G']: 'jumpToLine',
	[CmdOrCtrl + '/']: (cm) => { checkboxSupport(cm); },
};

const checkboxSupport = (cm) => {
	cm.listSelections().forEach((selection) => {
		const firstLine = Math.min(selection.anchor.line, selection.head.line);
		const lastLine = Math.max(selection.anchor.line, selection.head.line);
		let currentLineNumber;

		for (currentLineNumber = firstLine; currentLineNumber <= lastLine; currentLineNumber += 1) {
			const currentLine = cm.getLine(currentLineNumber);
			const stringPadding = Math.max(currentLine.search(/\S/), 0);
			const trimmedLine = currentLine.trimLeft();

			const pos = {
				from: {
					line: currentLineNumber,
					ch: 0 + stringPadding
				},
				to: {
					line: currentLineNumber,
					ch: 2 + stringPadding
				}
			};

			if (trimmedLine.trim() === '') {
				// empty line
				// do nothing
			} else if (trimmedLine.startsWith('x ')) {
				// checked line
				// make it unchecked
				cm.replaceRange('', pos.from, pos.to);
			} else {
				// add a checkbox!
				cm.replaceRange('x ', pos.from);
			}
		}
	});
};

CodeMirror.defineSimpleMode("todotxtsyntax", {
	start: [
		{regex: /^(x ).*$/, token: "task-completed", sol: true},
		{regex: /^(x )?(\(A\) ).*/, token: [null, "task-priority1"]},
		{regex: /^(x )?(\(B\) ).*/, token: [null, "task-priority2"]},
		{regex: /^(x )?(\(C\) ).*/, token: [null, "task-priority3"]},
		{regex: /^(x )?(\([A-Z]\) ).*/, token: [null, "task-priority"]},
		{regex: /(^| )\@\w+($| )/, token: "task-context"},
		{regex: /(^| )\+\w+($| )/, token: "task-project"},
		{regex: / [a-z]+\:[a-z0-9][a-z0-9\-\/\.]*/, token: "task-keyval"},
		{regex: /(^| )(https?\:\/\/[^\s]+)/, token: [null, "task-link"]},
	]
});

export default class TodoX extends React.Component {
	static defaultProps = {
		content: 'Welcome to TodoX.\n'
			+ 'This app saves everything you type automatically, there\'s no need to save manually.\n'
			+ 'Each line is a todo item.\n'
			+ 'x You can mark tasks done\n'
			+ 'Categorize with @contexts or +tags\n'
			+ '(A) Prioritize\n'
			+ '\tAdd sub tasks.\n'
			+ 'Read about Todo.txt format to learn more...'
	}

	constructor(props) {
		super();

		this.state = {
			content: handleContent.read() || props.content,
			fontSize: nodeStorage.getItem('fontSize') || 1,
			lightTheme: nodeStorage.getItem('lightTheme') || false,
			folds: (() => {
				const foldItem = nodeStorage.getItem('folds');
				return (foldItem && foldItem.folds) ? foldItem.folds : [];
			})(),
			mock: 'nosave',
			update: 'updater'
		};
	}

	componentDidMount() {
		const editor = this.editor;
		ipc.on('executeShortCut', (event, shortcut) => {
			switch (shortcut) {
				case 'save':
					this.showMockMessage();
					break;
				case 'reset-font':
					this.updateFont(0, true);
					break;
				case 'increase-font':
					this.updateFont(0.1);
					break;
				case 'decrease-font':
					this.updateFont(-0.1);
					break;
				case 'toggle-theme':
					this.updateTheme();
					break;
				case 'show-update-msg':
					latestVersion = remote.getGlobal('latestVersion');
					this.showUpdateMessage();
					break;
				case 'task-check':
					checkboxSupport(cmInstance);
					break;
				case 'task-move-up':
					cmInstance.execCommand('swapLineUp');
					break;
				case 'task-move-down':
					cmInstance.execCommand('swapLineDown');
					break;
				case 'task-toggle-subtasks':
					cmInstance.foldCode(cmInstance.getCursor())
					break;
				default:
					break;
			}
		});

		ipc.on('loadNewContent', (event) => {
			// console.log('loadNewContent called!');
			//console.log(handleContent.read());
			var updatedContent = handleContent.read();
			this.setState({ content: updatedContent });
			cmInstance.setValue(updatedContent);
		});

		const cmInstance = editor.getCodeMirror();
		this.applyFolds(cmInstance);

		cmInstance.on('fold', () => {
			this.updateFolds();
		});

		cmInstance.on('unfold', () => {
			this.updateFolds();
		});

		cmInstance.on("mousedown", (cm, e) => { 
			if (e.target && e.target.className.indexOf('cm-task-link') !== -1) {
				var url = e.target.innerHTML.replace(/\&amp;/g, '&');
				//console.log('url clicked: ' + url);
				shell.openExternal(url);
			}
		});
	}

	componentDidUpdate() {
		ipc.send('writeContent', this.state.content);
		this.updateFolds();
	}

	applyFolds(cm) {
		this.state.folds.forEach((fold) => {
			cm.foldCode(CodeMirror.Pos.apply(this, fold));
		});
	}

	updateFolds() {
		const editor = this.editor;
		const newFolds = editor.getCodeMirror().getAllMarks()
			.filter(mark => mark.collapsed && mark.type === 'range')
			.reverse()
			.map((mark) => {
				const pos = mark.find().from;
				return [pos.line, pos.ch];
			});

		nodeStorage.setItem('folds', { folds: newFolds });
	}

	showMockMessage() {
		clearTimeout(window.hideSaveMessage);
		this.setState({ mock: 'nosave active' });
		window.hideSaveMessage = setTimeout(() => {
			this.setState({ mock: 'nosave' });
		}, 1000);
	}

	showUpdateMessage() {
		const hideMessageFor = nodeStorage.getItem('hideUpdateMessage');
		const hideVersion = hideMessageFor ? hideMessageFor.version : false;

		if (latestVersion !== hideVersion) {
			this.setState({ update: 'updater active' });
		}
	}

	updateFont(diff, reset) {
		const newFontsize = reset ? 1 : Math.min(Math.max(this.state.fontSize + diff, 0.5), 2.5);
		nodeStorage.setItem('fontSize', newFontsize);
		this.setState({ fontSize: newFontsize });
	}

	updateTheme() {
		const lightTheme = !this.state.lightTheme;

		nodeStorage.setItem('lightTheme', lightTheme);
		this.setState({ lightTheme });
	}

	handleChange = (newcontent) => {
		this.setState({ content: newcontent });
	}

	openDownloadPage = () => {
		shell.openExternal('https://github.com/mfyz/todox');
		this.setState({ update: 'updater' });
	}

	hideUpdateMessage = (e) => {
		e.stopPropagation();
		nodeStorage.setItem('hideUpdateMessage', { version: latestVersion });
		this.setState({ update: 'updater' });
	}

	render() {
		const style = {
			fontSize: `${this.state.fontSize}rem`,
			lineHeight: `${this.state.fontSize * 1.5}rem`,
			...(this.state.lightTheme ?
					{ filter: 'invert(100%) hue-rotate(10deg) brightness(1.1) grayscale(40%)' }
					:
					{}
			)
		};
		const options = {
			styleActiveLine: true,
			lineNumbers: false,
			lineWrapping: true,
			theme: 'todox',
			mode: 'todotxtsyntax',
			autofocus: true,
			scrollbarStyle: 'overlay',
			indentUnit: 4,
			tabSize: 4,
			indentWithTabs: true,
			cursorScrollMargin: 40,
			foldOptions: {
				rangeFinder: CodeMirror.fold.indent,
				scanUp: true,
				widget: ' … ',
			},
			foldGutter: true,
			gutters: ['CodeMirror-foldgutter'],
			extraKeys,
		};
		return (
			<div style={style} data-platform={process.platform}>
				<Codemirror
					value={this.state.content}
					ref={(c) => { this.editor = c; }}
					onChange={this.handleChange}
					options={options}
				/>
				<div className={this.state.mock}>Already saved! ;)</div>

				<div onClick={this.openDownloadPage} className={this.state.update}>
					There's an update available! Get version {latestVersion}
					<span title="Don't show this again until next available update" onClick={this.hideUpdateMessage}>
						×
					</span>
				</div>

				<div className="titlebar" />
			</div>
		);
	}
}
