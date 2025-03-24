import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

// Import the CSS directly to ensure it's loaded
import './styles.css';

// Render the App component to the DOM
ReactDOM.render(<App />, document.getElementById('app'));
