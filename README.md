# TypeFlow

TypeFlow is a lightweight, adaptive typing-practice website built with HTML, CSS and vanilla JavaScript. It helps learners build typing accuracy, speed and confidence through progressive letter lessons and focused practice.

## Features

- Untimed, strict character-by-character typing exercises. Incorrect keys do not advance the cursor, and accepted characters cannot be erased with Backspace.
- Progressive letter learning, starting with five letters and unlocking the next letter when every active letter has at least 12 attempts and 90% accuracy.
- Two learning orders: Default and Frequency, each with its own saved learning progress.
- Adaptive exercises that use only unlocked letters and balance lifetime accuracy, recent performance and practice exposure.
- A rolling 20-result history per letter to identify emerging weak keys and guide focus.
- Per-letter feedback showing overall and recent accuracy while preserving the existing 12-attempt / 90%-accuracy unlock rule.
- Adjustable exercise length from 24 to 48 words; changes apply immediately.
- Optional on-screen QWERTY keyboard with finger-zone colours, home-row guides, locked-key dimming and next-key highlighting.
- Live words-per-minute (WPM), accuracy and error statistics.
- Progress tracking for completed sessions, personal-best speed, average accuracy and total active practice time, including unfinished exercises.
- Configurable daily practice goal and a seven-day WPM history.
- Light and dark themes, plus an inline settings panel.
- Browser `localStorage` for settings, learning progress and statistics.

## Project structure

- `index.html` — main website page
- `assets/css/style.css` — page styling
- `assets/js/app.js` — typing practice and browser-side features
- `assets/js/learning.js` — reusable adaptive-learning logic
- `tests/learning.test.js` — automated learning regression tests
- `assets/images/` — images used by the website, when needed
- `.github/workflows/ci.yml` — automated GitHub Actions checks
- `.gitignore` — files excluded from Git

## Run locally with XAMPP

1. Clone this repository into `C:\\xampp\\htdocs\\typeflow`.
2. Start Apache in the XAMPP Control Panel.
3. Open [http://localhost/typeflow/](http://localhost/typeflow/) in your browser. Apache will serve `index.html` automatically.

TypeFlow is a static website. PHP and MySQL are not required. Progress and settings are stored in the current browser using `localStorage`, so they remain on that browser and device.

You can also open `index.html` directly in a modern browser, although using XAMPP is recommended for a consistent local setup.

## Development

- The project uses vanilla HTML, CSS and JavaScript; no package installation or build step is currently required.
- Use the repository's designated active branch and confirm the target before committing. For the current implementation, `main` is the active source of truth.
- Test changed behaviour locally and review the complete diff before publishing changes.
- Keep commits focused and avoid unrelated layout or dependency changes.

## Automated checks

GitHub Actions runs the **TypeFlow CI** workflow automatically:

- On every push to any branch.
- When a pull request targeting `main` is opened or updated.
- Manually through the **Actions** tab using **Run workflow**.

The workflow checks JavaScript syntax, runs dependency-free Node.js regression tests for learning logic and confirms that the essential website files are present. Browser-based and visual regression tests are not currently included.

To review a run, open the repository's **Actions** tab and select **TypeFlow CI**. A failed check should be investigated and fixed before merging the related pull request.

## Copyright

Copyright © 2026 gerald-t. All rights reserved.

The source code and project materials are protected by copyright. No permission or licence is granted to use, copy, modify, publish, distribute or sublicense this work without prior written permission from the copyright owner.
