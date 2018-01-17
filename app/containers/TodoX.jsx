import React from 'react';
import PropTypes from 'prop-types';
import Codemirror from 'react-codemirror';
import CodeMirror from '../../node_modules/codemirror/';

require('../../node_modules/codemirror/addon/scroll/simplescrollbars.js');
require('../../node_modules/codemirror/addon/selection/active-line.js');
require('../../node_modules/codemirror/addon/fold/indent-fold.js');
require('../../node_modules/codemirror/addon/fold/foldgutter.js');
require('../../node_modules/codemirror/addon/search/search.js');
require('../../node_modules/codemirror/addon/search/jump-to-line.js');
// require('../../node_modules/codemirror/addon/search/matchesonscrollbar.js');
// require('../../node_modules/codemirror-revisedsearch');
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
	// Esc: 'clearSearch',
	'Alt-G': false,
	// from sublime.js package
	[CmdOrCtrl + 'D']: 'duplicateLine',
	[CmdOrCtrl + 'Up']: 'swapLineUp',
	[CmdOrCtrl + 'Down']: 'swapLineDown',
	[CmdOrCtrl + '[']: (cm) => { cm.foldCode(cm.getCursor()); },
	[CmdOrCtrl + ']']: (cm) => { cm.foldCode(cm.getCursor()); },
	[CmdOrCtrl + '/']: (cm) => { checkboxSupport(cm); },
	// [CmdOrCtrl + 'F']: 'findPersistent',
	// ['Shift-' + CmdOrCtrl + 'F']: 'replace',
	// ['Shift-' + CmdOrCtrl + 'R']: 'replaceAll',
	// [CmdOrCtrl + 'G']: 'jumpToLine',
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
			}
			else if (trimmedLine.startsWith('x ')) {
				// checked line
				// make it unchecked
				cm.replaceRange('', pos.from, pos.to);
			}
			else {
				// add a checkbox!
				cm.replaceRange('x ', pos.from);
			}
		}
	});
};

const changePriority = (cm, decrease) => {
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
					ch: 4 + stringPadding
				}
			};

			if (trimmedLine.trim() === '' || trimmedLine.trim().search(/[^-]+/) === -1) {
				// empty line
				// do nothing
			}
			else if (trimmedLine.startsWith('(')) {
				// get existing priority
				// console.log('current line: ', trimmedLine);
				const currentPriority = trimmedLine.trim().substring(1, 2);
				// console.log('current priority: ', currentPriority);
				// update
				if ((!decrease && currentPriority === 'A') || (decrease && currentPriority === 'Z')) {
					// do nothing, keep at top or lowest priority
				}
				else {
					const newPriority = String.fromCharCode(currentPriority.charCodeAt(0) + (decrease ? 1 : -1));
					cm.replaceRange('(' + newPriority + ') ', pos.from, pos.to);
				}
			}
			else {
				// add a priority
				cm.replaceRange('(C) ', pos.from);
			}
		}
	});
};

CodeMirror.defineSimpleMode('todotxtsyntax', {
	start: [
		{ regex: /^(x ).*$/, token: 'task-completed', sol: true },
		{ regex: /^(x )?(\(A\) ).*/, token: [null, 'task-priority1'] },
		{ regex: /^(x )?(\(B\) ).*/, token: [null, 'task-priority2'] },
		{ regex: /^(x )?(\(C\) ).*/, token: [null, 'task-priority3'] },
		{ regex: /^(x )?(\([A-Z]\) ).*/, token: [null, 'task-priority'] },
		{ regex: /(^| )@\w+($| )/, token: 'task-context' },
		{ regex: /(^| )\+\w+($| )/, token: 'task-project' },
		{ regex: /^#{2,} .*/, token: 'task-heading' },
		{ regex: /((- ?){3,}|={3,})$/, token: 'task-divider' },
		{ regex: / [a-z]+:[a-z0-9][a-z0-9\-/.]*/, token: 'task-keyval' },
		{ regex: /(^| )(https?:\/\/[^\s]+)/, token: [null, 'task-link'] },
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

	static propTypes = {
		content: PropTypes.string
	};

	static createFilterOverlay(query, className) {
		const safeQuery = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi");
		// const safeQuery = new RegExp(query.replace(/\[\-\[\]/\{\}\(\)\*\+\?\.\\^$|]/g, '\\$&'), 'gi');
		// const safeQuery = new RegExp(query, 'gi');

		return {
			token: (stream) => {
				safeQuery.lastIndex = stream.pos;
				const match = safeQuery.exec(stream.string);
				if (match && match.index === stream.pos) {
					stream.pos += match[0].length || 1;
					return className;
				}
				else if (match) {
					stream.pos = match.index;
				}
				else {
					stream.skipToEnd();
				}
			}
		};
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
			update: 'updater',
			showToolbar: nodeStorage.getItem('showToolbar') || false,
			searchQuery: '',
			filterQuery: '',
			savedFilters: nodeStorage.getItem('savedFilters') || []
		};

		this.searchTimer = null;
		this.filterResultsOverlay = null;
		this.searchBox = null;
		this.searchOverlay = null;

		this.onSearchChange = this.onSearchChange.bind(this);
		this.toggleFilter = this.toggleFilter.bind(this);
		this.saveFilter = this.saveFilter.bind(this);
	}

	componentDidMount() {
		const editor = this.editor;
		const cmInstance = editor.getCodeMirror();
		this.applyFolds(cmInstance);

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
				cmInstance.foldCode(cmInstance.getCursor());
				break;
			case 'toggle-toolbar':
				this.toggleToolbar();
				break;
			case 'focus-search':
				this.focusOnSearch();
				break;
			case 'increase-priority':
				changePriority(cmInstance, false);
				break;
			case 'decrease-priority':
				changePriority(cmInstance, true);
				break;
			default:
				break;
			}
		});

		ipc.on('loadNewContent', (/* event */) => {
			// console.log('loadNewContent called!');
			// console.log(handleContent.read());
			const updatedContent = handleContent.read();
			this.setState({ content: updatedContent });
			cmInstance.setValue(updatedContent);
		});

		cmInstance.on('fold', () => {
			this.updateFolds();
		});

		cmInstance.on('unfold', () => {
			this.updateFolds();
		});

		cmInstance.on('mousedown', (cm, e) => {
			if (e.target && e.target.className.indexOf('cm-task-link') !== -1) {
				const url = e.target.innerHTML.replace(/&amp;/g, '&');
				// console.log('url clicked: ' + url);
				shell.openExternal(url);
			}
		});

		// setTimeout(() => {
		// 	this.filterLines('todo');
		// }, 1000);

		cmInstance.on('change', () => {
			if (this.state.filterQuery) {
				this.highlightFilteredLines(this.state.filterQuery);
			}
		});
	}

	componentDidUpdate() {
		ipc.send('writeContent', this.state.content);
		this.updateFolds();
	}

	onSearchChange(e) {
		const query = e.target.value;
		this.setState({ searchQuery: query });
		clearTimeout(this.searchTimer);
		this.searchTimer = setTimeout(() => {
			const cmInstance = this.editor.getCodeMirror();
			cmInstance.removeOverlay(this.searchOverlay);
			if (query.length > 0) {
				this.searchOverlay = this.constructor.createFilterOverlay(query, 'searchResult');
				cmInstance.addOverlay(this.searchOverlay);
			}
		}, 200);
	}

	toggleFilter(query) {
		if (query === this.state.filterQuery) {
			this.clearFilter();
		}
		else {
			this.filterLines(query);
		}
	}

	filterLines(query) {
		const cmInstance = this.editor.getCodeMirror();
		// console.log("filtering lines...");
		this.setState({ filterQuery: query });
		cmInstance.removeOverlay(this.filterResultsOverlay);
		this.filterResultsOverlay = this.constructor.createFilterOverlay(query, 'filterMatch');
		cmInstance.addOverlay(this.filterResultsOverlay);
		this.highlightFilteredLines(query);
	}

	highlightFilteredLines(query) {
		const cmInstance = this.editor.getCodeMirror();
		const lineCount = cmInstance.lineCount();
		for (let i = 0; i < lineCount; i += 1) {
			const line = cmInstance.getLine(i);
			if (typeof line === 'string') {
				if (line.match(new RegExp(query, 'i')) !== null) {
					cmInstance.addLineClass(i, 'wrap', 'filterResult');
				}
				else {
					cmInstance.removeLineClass(i, 'wrap', 'filterResult');
				}
			}
		}
	}

	clearFilter() {
		this.setState({ filterQuery: '' });
		const cmInstance = this.editor.getCodeMirror();
		cmInstance.removeOverlay(this.filterResultsOverlay);
	}

	saveFilter() {
		console.log('add filter?');
		if (this.state.searchQuery.length > 0) {
			const updatedSavedFilters = this.state.savedFilters;
			updatedSavedFilters.push(this.state.searchQuery);
			this.setState({ savedFilters: updatedSavedFilters });
			nodeStorage.setItem('savedFilters', updatedSavedFilters);
		}
		else {
			alert('Search first, then save as filter!');
			this.searchBox.focus();
		}
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

	toggleToolbar() {
		// console.log('toggle toolbar');
		const toolbarVisible = !this.state.showToolbar;
		nodeStorage.setItem('showToolbar', toolbarVisible);
		this.setState({
			showToolbar: toolbarVisible
		});
	}

	focusOnSearch() {
		console.log('focus on search...');
		if (!this.state.showToolbar) this.toggleToolbar();
		this.searchBox.focus();
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
			<div
				style={style}
				data-platform={process.platform}
				className={'applicationWrapper ' + (this.state.filterQuery ? 'filterActive' : '') + ' ' +
				(this.state.showToolbar ? 'hasToolbar' : '')}
			>
				<div className="toolbar">
					<div className="filterList">
						<ul>
							{this.state.savedFilters.map(filter => (<li key={filter}>
								<a
									href="#filter"
									className={filter === this.state.filterQuery ? 'active' : ''}
									onClick={() => this.toggleFilter(filter)}
								>{filter}</a>
							</li>))}
							<li className="add">
								<a href="#add" onClick={this.saveFilter}>+</a>
							</li>
						</ul>
					</div>
					<div className="searchWrapper">
						<input 
							type="text"
							ref={(c) => { this.searchBox = c; }}
							placeholder="Search"
							value={this.state.searchQuery}
							onChange={this.onSearchChange}
						/>
					</div>
				</div>
				<div className="scrollGradientHeader" />
				<Codemirror
					value={this.state.content}
					ref={(c) => { this.editor = c; }}
					onChange={this.handleChange}
					options={options}
				/>
				<div className={this.state.mock}>Already saved! ;)</div>
				<div className="titlebar" />
			</div>
		);
	}
}
