TodoX
[![Build Status](https://travis-ci.com/mfyz/todox.svg?branch=master)](https://travis-ci.com/mfyz/todox)
===========

## A simple but smart note-taking app

TodoX is a little app that you can use as a quick note taking or todo app.</p>

* Small and simple, the only UI is the text you type
* Saves on-the-fly, no need to manually save
* Automatic indenting
* Note-folding
* Use checkboxes to keep track of your TODO's
* Powerful keyboard control
* Replaces common syntax with symbols, such as arrows
* Free

![Screenshot](https://raw.githubusercontent.com/mfyz/todox/master/screenshot.jpg)


### Shortcuts

* <kbd>cmd/ctrl+up</kbd> - move current line up
* <kbd>cmd/ctrl+down</kbd> - move current line down
* <kbd>cmd/ctrl+d</kbd> - delete current line
* <kbd>cmd/ctrl+w/q</kbd> - close application
* <kbd>cmd/ctrl +/=</kbd> - zoom text in
* <kbd>cmd/ctrl -</kbd> - zoom text out
* <kbd>cmd/ctrl+0</kbd> - reset text size
* <kbd>cmd/ctrl+]/[</kbd> - fold note collapsing
* <kbd>cmd/ctrl+f</kbd> - search (you can also use regular expressions, by starting and ending with a /)
* <kbd>shift+cmd/ctrl+f</kbd> - replace
* <kbd>shift+cmd/ctrl+r</kbd> - replace all
* <kbd>cmd/ctrl+g</kbd> - jump to line (you can also use <line>:<character> notation, or go relative lines with +<line> and -<line>)
* <kbd>cmd/ctrl+/</kbd> - Add or toggle a checkbox
* <kbd>f11</kbd> - Toggle fullscreen
* <kbd>cmd/ctrl+i</kbd> - Toggle between light and dark theme
* <kbd>alt</kbd> - show or hide menu (Windows only)
* <kbd>cmd/ctrl+s</kbd> - ...this does nothing.

### Installation
```sh
# Download from git
git clone https://github.com/mfyz/todox.git

# Install dependencies
cd todox && npm install

# build and run
npm build
electron main.js

# or run dev version
npm run dev
```

### Package Appliction

```sh
npm run package
```

### Command Line Arguments
**Portable Mode**
`-p, --portable`

Lets you store all the files TodoX generates in a specified location, such as a USB-stick or
other portable storage device. In this mode both the configuration files as well as your text content will be stored in
a "userdata" directory alongside the TodoX executable, or when given a directory as an argument, will store
the files there.

You can also use this to store the TodoX configuration files, and the text content, in a synced cloud storage
folder.

```
# run TodoX in portable mode, saving data in application directory.
todox --portable
```

```
# run TodoX in portable mode, saving data in custom directory.
todox --portable ~/todox_data
```
**help**
`-h, --help`

Prints help information

### FAQ
*Where is my data saved?*

Your data is saved in a plain text file content.txt. On Mac and Linux, this file is saved in ~/.todox. On Windows
this file is saved in a directory called ".todox" in your userprofile directory.  

*Can my data be saved in an alternate directory?*

Yes! See the **portable mode** section under the **Command Line Arguments** heading above.

### Credits

TodoX is a manual fork export of FromScratch (https://fromscratch.rocks) created by Kilian Valkhof https://github.com/Kilian which is originally licensed under MIT license. TodoX includes many improvements and modifications to support and adapt Todo.txt format and extra capabilities.

TodoX is built upon these open source projects:
	<a href="http://electron.atom.io">Electron</a>,
	<a href="https://facebook.github.io/react/">React</a>,
	<a href="https://github.com/tonsky/FiraCode">Fira Code</a>,
	<a href="http://codemirror.net/">CodeMirror</a> and
	<a href="https://github.com/chentsulin/electron-react-boilerplate">Electron-react-boilerplate</a>.

Thanks @bittersweet @chentsulin @ctrauma for the initial contributions to FromScratch - indirectly to TodoX to be what it is today.
