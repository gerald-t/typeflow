# TypeFlow

A simple adaptive typing-practice website built with PHP, CSS and vanilla JavaScript.

## Features

- 15, 30 and 60 second typing sessions
- Live WPM, accuracy, error count and countdown
- Adaptive exercises that give extra practice to weaker keys
- Correct, incorrect and next-character highlighting
- Virtual keyboard with next-key highlighting
- Restart and new exercise controls
- Browser localStorage for progress, key statistics and settings

## Project structure

- index.php — main website page
- assets/css/style.css — page styling
- assets/js/app.js — typing test and browser-side features
- assets/images/ — images used by the website, when needed
- .gitignore — files excluded from Git

## Run locally with XAMPP

1. Clone this repository into C:\\xampp\\htdocs\\typeflow.
2. Start Apache in the XAMPP Control Panel.
3. Open http://localhost/typeflow/ in your browser.

MySQL and user accounts are not required. Progress and settings are stored in the current browser using localStorage, so they stay on that browser and device.

## Development

The main branch contains the current version of TypeFlow.
