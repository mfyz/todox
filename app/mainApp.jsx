import React from 'react';
import ReactDOM from 'react-dom';
import TodoX from './containers/TodoX';
import './assets/style/app.scss';

window.location.hash = '/';
ReactDOM.render(<TodoX />, document.getElementById('react-root'));
