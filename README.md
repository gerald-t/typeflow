# TypeFlow

Adaptive typing practice website built with PHP, CSS and vanilla JavaScript.

## Phase 1 features

- Dark interface
- Adaptive exercise selection with a simple weak-key weighting system
- 15, 30 and 60 second sessions
- Live WPM, accuracy, error count and countdown
- Correct, incorrect and next-character highlighting
- Virtual keyboard with next-key highlighting
- Restart and new exercise controls
- Browser localStorage for progress, key statistics and settings

## Run locally with XAMPP

1. Install XAMPP.
2. Put this repository in `C:\xampp\htdocs\typeflow`.
3. Start **Apache** from the XAMPP Control Panel.
4. Open [http://localhost/typeflow/](http://localhost/typeflow/) in your browser.

MySQL is not required for Phase 1. Progress is stored in the browser on the device being used.

## Project structure

```
typeflow/
├── index.php
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── .gitignore
└── README.md
```

## Branch workflow

- `development`: make and test changes here.
- `main`: keep the stable version for deployment.

When a feature is tested locally, merge `development` into `main`.
