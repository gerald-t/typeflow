<?php
$pageTitle = 'TypeFlow — Adaptive Typing Practice';
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Build typing speed and accuracy with adaptive typing practice.">
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="assets/js/app.js" defer></script>
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="index.php" aria-label="TypeFlow home"><span class="brand-mark">T</span><span>typeflow</span></a>
      <nav class="top-nav" aria-label="Main navigation">
        <a class="active" href="#practice">Practice</a>
        <a href="#progress">Progress</a>
      </nav>
      <button class="icon-button" id="settings-button" type="button" aria-label="Open settings" title="Settings">⚙</button>
    </header>

    <main>
      <section class="welcome-row">
        <div>
          <p class="eyebrow">YOUR DAILY PRACTICE</p>
          <h1>Find your <span class="accent">flow.</span></h1>
          <p class="subheading">A little practice every day makes a big difference.</p>
        </div>
        <div class="streak-chip"><span class="streak-dot"></span><span><strong id="session-count">0</strong> sessions completed</span></div>
      </section>

      <section class="practice-panel" id="practice" aria-label="Typing practice">
        <div class="practice-toolbar">
          <div class="mode-label"><span class="live-dot"></span> ADAPTIVE PRACTICE</div>
          <div class="duration-picker" role="group" aria-label="Test duration">
            <button type="button" data-duration="15">15s</button>
            <button type="button" data-duration="30" class="selected">30s</button>
            <button type="button" data-duration="60">60s</button>
          </div>
        </div>

        <div class="stats-row" aria-live="polite">
          <div class="stat"><span class="stat-label">TIME</span><strong id="time">30</strong></div>
          <div class="stat"><span class="stat-label">WPM</span><strong id="wpm">0</strong></div>
          <div class="stat"><span class="stat-label">ACCURACY</span><strong id="accuracy">100<span class="unit">%</span></strong></div>
          <div class="stat"><span class="stat-label">ERRORS</span><strong id="errors">0</strong></div>
        </div>

        <div class="typing-area" id="typing-area">
          <div class="prompt" id="prompt" aria-label="Text to type"></div>
          <input id="typing-input" class="typing-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type the text shown above" placeholder="Click here and start typing…">
          <div class="typing-hint" id="typing-hint">start typing to begin · press <kbd>Tab</kbd> to restart</div>
        </div>

        <div class="keyboard" id="keyboard" aria-label="Virtual keyboard">
          <div class="key-row">
            <span data-key="q">q</span><span data-key="w">w</span><span data-key="e">e</span><span data-key="r">r</span><span data-key="t">t</span><span data-key="y">y</span><span data-key="u">u</span><span data-key="i">i</span><span data-key="o">o</span><span data-key="p">p</span>
          </div>
          <div class="key-row">
            <span data-key="a">a</span><span data-key="s">s</span><span data-key="d">d</span><span data-key="f">f</span><span data-key="g">g</span><span data-key="h">h</span><span data-key="j">j</span><span data-key="k">k</span><span data-key="l">l</span>
          </div>
          <div class="key-row">
            <span data-key="z">z</span><span data-key="x">x</span><span data-key="c">c</span><span data-key="v">v</span><span data-key="b">b</span><span data-key="n">n</span><span data-key="m">m</span>
          </div>
        </div>

        <div class="practice-actions">
          <span class="adaptive-note"><span class="sparkle">✦</span> Exercises adapt to your typing</span>
          <div class="action-buttons">
            <button class="secondary-button" id="restart-button" type="button">↻ Restart</button>
            <button class="primary-button" id="new-button" type="button">New exercise <span>→</span></button>
          </div>
        </div>
      </section>

      <section class="progress-section" id="progress">
        <div class="section-heading"><div><p class="eyebrow">KEEP IT GOING</p><h2>Your progress</h2></div><span class="muted" id="best-wpm-label">Personal best: — WPM</span></div>
        <div class="progress-cards">
          <article class="progress-card"><span class="card-icon">⌁</span><span class="card-label">BEST SPEED</span><strong id="best-wpm">—</strong><small>words per minute</small></article>
          <article class="progress-card"><span class="card-icon">◎</span><span class="card-label">AVERAGE ACCURACY</span><strong id="average-accuracy">—</strong><small>across completed sessions</small></article>
          <article class="progress-card"><span class="card-icon">◷</span><span class="card-label">TOTAL PRACTICE</span><strong id="total-time">0m</strong><small>time spent typing</small></article>
        </div>
      </section>
    </main>
    <footer><span>typeflow</span><span>Practice with purpose. Improve with every keystroke.</span></footer>
  </div>

  <dialog id="settings-dialog" class="settings-dialog">
    <form method="dialog">
      <div class="dialog-heading"><h2>Settings</h2><button class="icon-button" aria-label="Close settings">×</button></div>
      <label class="setting-row"><span><strong>Virtual keyboard</strong><small>Show the on-screen key guide</small></span><input id="keyboard-toggle" type="checkbox" checked></label>
      <p class="dialog-note">Settings are saved in this browser.</p>
      <button class="primary-button dialog-done">Done</button>
    </form>
  </dialog>
</body>
</html>