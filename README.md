# TypeFlow

A simple adaptive typing-practice website built with HTML, CSS and vanilla JavaScript.

## Features

- Untimed typing exercises that end when the full passage is completed
- Strict character-by-character typing: an incorrect key does not advance the cursor, and Backspace does not erase accepted characters
- Progressive lessons beginning with N, E, I, A and R, then unlocking one letter at a time
- A new letter unlocks after every active letter has at least 12 attempts and 90% accuracy
- A focus letter is practised in every word, with extra attention given to weaker keys
- Practice text uses only unlocked letters; pronounceable syllables supplement the word list when needed
- Full QWERTY virtual keyboard with finger-zone colours, home-row bumps, locked-key dimming and next-key highlighting
- Live WPM, accuracy and error count
- Restart and new exercise controls
- Browser localStorage for progress, key statistics, learning progression and settings

## Project structure

- index.html — main website page
- assets/css/style.css — page styling
- assets/js/app.js — typing practice and browser-side features
- assets/images/ — images used by the website, when needed
- .gitignore — files excluded from Git

## Run locally with XAMPP

1. Clone this repository into C:\\xampp\\htdocs\\typeflow.
2. Start Apache in the XAMPP Control Panel.
3. Open http://localhost/typeflow/ in your browser. Apache will serve index.html automatically.

This is a static website. PHP and MySQL are not required. Progress and settings are stored in the current browser using localStorage, so they stay on that browser and device.

You can also open index.html directly in a modern browser, although using XAMPP is recommended for a consistent local setup.

## Development

The main branch contains the current version of TypeFlow.
