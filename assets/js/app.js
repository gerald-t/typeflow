(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const promptEl = $('#prompt');
  const input = $('#typing-input');
  const wpmEl = $('#wpm');
  const accuracyEl = $('#accuracy');
  const errorsEl = $('#errors');
  const hintEl = $('#typing-hint');
  const keyboard = $('#keyboard');

  const commonWords = [...new Set((
    'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or ' +
    'an will my one all would there their what so up out if about who get which go me when make can like time no just ' +
    'him know take people into year your good some could them see other than then now look only come its over think also ' +
    'back after use two how our work first well way even new want because any these give day most us find here thing many ' +
    'right tell very through long still great hand place where while small number little world down life follow move ' +
    'between point keep start never same three light begin night again talk change help line turn play quick brown fox ' +
    'jump lazy dog river water house paper music story friend family market garden window simple focus rhythm steady ' +
    'practice progress habit skill patience speed accuracy calm mind clear idea share problem solve learn build grow ' +
    'every lasting natural confidence repeat improve type key board finger letter word sentence speak write read open ' +
    'close travel journey morning evening silver golden bright quiet happy strong gentle brave honest careful curious ' +
    'zebra jazz puzzle quiz buzz frozen dozen amaze size prize lazy maze oxygen box mix fix next exact relax extra ' +
    'jacket juice join judge major object enjoy project kind kick knock market thank quick quite queen equal square ' +
    'request unique vivid voice value travel above over seven heavy village wave twelve yellow young yesterday beyond'
  ).split(' '))];
  const MIN_KEY_SAMPLES = 10;
  const EXERCISE_WORDS = 20;

  function loadJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
    } catch (error) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage unavailable */ }
  }
  function loadSetting(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function saveSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* storage unavailable */ }
  }
  const toCount = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

  const keyStats = {};
  Object.entries(loadJSON('typeflow-key-stats', {})).forEach(([key, stat]) => {
    if (/^[a-z]$/.test(key) && stat && typeof stat === 'object') keyStats[key] = {hits: toCount(stat.hits), errors: toCount(stat.errors)};
  });
  const storedProgress = loadJSON('typeflow-progress', {});
  const saved = {
    sessions: toCount(storedProgress.sessions),
    bestWpm: toCount(storedProgress.bestWpm),
    accuracyTotal: toCount(storedProgress.accuracyTotal),
    totalSeconds: toCount(storedProgress.totalSeconds)
  };

  let target = '';
  let typed = '';
  let startedAt = null;
  let statsInterval = null;
  let finished = false;
  let correctChars = 0;
  let keystrokes = 0;
  let correctKeystrokes = 0;
  let totalErrors = 0;
  let keyStatsDirty = false;
  let mistakeUntil = 0;

  function saveProgress() { saveJSON('typeflow-progress', saved); }
  function saveKeyStats() {
    if (!keyStatsDirty) return;
    saveJSON('typeflow-key-stats', keyStats);
    keyStatsDirty = false;
  }
  function weakKeys() {
    return Object.entries(keyStats)
      .filter(([, stat]) => stat.hits + stat.errors >= MIN_KEY_SAMPLES && stat.errors > 0)
      .map(([key, stat]) => [key, stat.errors / (stat.hits + stat.errors)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key]) => key);
  }
  function randomWord() { return commonWords[Math.floor(Math.random() * commonWords.length)]; }
  function pickWeighted(words, weights, total) {
    let roll = Math.random() * total;
    for (let i = 0; i < words.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return words[i];
    }
    return words[words.length - 1];
  }
  function pickExercise() {
    const weak = weakKeys();
    const targeted = weak.length ? commonWords.filter(word => weak.some(key => word.includes(key))) : [];
    const weights = targeted.map(word => [...word].filter(char => weak.includes(char)).length);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const words = [];
    for (let i = 0; i < EXERCISE_WORDS; i++) {
      words.push(totalWeight && Math.random() < .65 ? pickWeighted(targeted, weights, totalWeight) : randomWord());
    }
    return words.join(' ');
  }

  function renderPrompt() {
    promptEl.replaceChildren();
    [...target].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      if (index < typed.length) span.className = 'correct';
      else if (index === typed.length && !finished) {
        span.className = 'current pending';
        if (Date.now() < mistakeUntil) span.classList.add('error-flash');
      } else span.className = 'pending';
      promptEl.appendChild(span);
    });
    updateKeyboard();
  }
  function updateKeyboard() {
    keyboard.querySelectorAll('[data-key]').forEach(key => {
      key.classList.toggle('next-key', key.dataset.key === (target[typed.length] || '').toLowerCase());
    });
  }
  function elapsedSeconds() {
    return startedAt ? Math.max(0.1, (Date.now() - startedAt) / 1000) : 0;
  }
  function updateStats() {
    const minutes = elapsedSeconds() / 60;
    const wpm = minutes ? Math.round((correctChars / 5) / minutes) : 0;
    const accuracy = keystrokes ? Math.round((correctKeystrokes / keystrokes) * 100) : 100;
    wpmEl.textContent = String(wpm);
    accuracyEl.innerHTML = accuracy + '<span class="unit">%</span>';
    errorsEl.textContent = String(totalErrors);
    return {wpm, accuracy};
  }
  function start() {
    if (startedAt || finished) return;
    startedAt = Date.now();
    hintEl.textContent = 'keep going · type each highlighted character correctly';
    statsInterval = window.setInterval(updateStats, 250);
  }
  function finish() {
    if (finished) return;
    finished = true;
    window.clearInterval(statsInterval);
    const stats = updateStats();
    saved.sessions += 1;
    saved.bestWpm = Math.max(saved.bestWpm, stats.wpm);
    saved.accuracyTotal += stats.accuracy;
    saved.totalSeconds += Math.max(1, Math.round(elapsedSeconds()));
    saveProgress();
    saveKeyStats();
    renderProgress();
    hintEl.textContent = 'exercise complete · choose New exercise to continue';
    input.blur();
  }
  function reset(newExercise = false) {
    window.clearInterval(statsInterval);
    saveKeyStats();
    target = newExercise || !target ? pickExercise() : target;
    typed = '';
    startedAt = null;
    finished = false;
    correctChars = 0;
    keystrokes = 0;
    correctKeystrokes = 0;
    totalErrors = 0;
    mistakeUntil = 0;
    input.value = '';
    input.disabled = false;
    wpmEl.textContent = '0';
    accuracyEl.innerHTML = '100<span class="unit">%</span>';
    errorsEl.textContent = '0';
    hintEl.innerHTML = 'start typing to begin · press <kbd>Tab</kbd> to restart';
    renderPrompt();
  }
  function renderProgress() {
    $('#session-count').textContent = String(saved.sessions);
    $('#best-wpm').textContent = saved.sessions ? String(saved.bestWpm) : '—';
    $('#best-wpm-label').textContent = 'Personal best: ' + (saved.sessions ? saved.bestWpm : '—') + ' WPM';
    $('#average-accuracy').textContent = saved.sessions ? Math.round(saved.accuracyTotal / saved.sessions) + '%' : '—';
    const totalMinutes = Math.floor(saved.totalSeconds / 60);
    $('#total-time').textContent = totalMinutes < 1 ? saved.totalSeconds + 's' : totalMinutes + 'm';
  }
  function recordKeyStats(index, wasCorrect) {
    const key = (target[index] || '').toLowerCase();
    if (!/^[a-z]$/.test(key)) return;
    keyStats[key] ||= {hits: 0, errors: 0};
    if (wasCorrect) keyStats[key].hits += 1;
    else keyStats[key].errors += 1;
    keyStatsDirty = true;
  }

  input.addEventListener('input', () => {
    if (finished) {
      input.value = typed;
      return;
    }

    const candidate = input.value;

    if (candidate.length < typed.length) {
      // Backspace can move the cursor back, but previous attempts remain in accuracy.
      typed = typed.slice(0, candidate.length);
      correctChars = typed.length;
      mistakeUntil = 0;
      hintEl.textContent = startedAt
        ? 'keep going · type each highlighted character correctly'
        : 'start typing to begin · press Tab to restart';
    } else if (candidate.length > typed.length) {
      for (let i = typed.length; i < candidate.length; i++) {
        if (typed.length >= target.length) break;
        start();
        const expectedIndex = typed.length;
        const enteredChar = candidate[i];
        keystrokes += 1;

        if (enteredChar === target[expectedIndex]) {
          typed += enteredChar;
          correctChars += 1;
          correctKeystrokes += 1;
          recordKeyStats(expectedIndex, true);
          mistakeUntil = 0;
          hintEl.textContent = 'keep going · type each highlighted character correctly';
        } else {
          totalErrors += 1;
          recordKeyStats(expectedIndex, false);
          mistakeUntil = Date.now() + 350;
          hintEl.textContent = 'not quite — try the highlighted character again';
          window.setTimeout(() => {
            if (!finished && Date.now() >= mistakeUntil) renderPrompt();
          }, 360);
        }
      }
    }

    // Only accepted, correct characters remain in the input; the cursor never skips ahead.
    input.value = typed;
    input.setSelectionRange(typed.length, typed.length);
    renderPrompt();
    updateStats();

    if (typed.length === target.length) finish();
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      reset(false);
      input.focus();
    }
  });
  input.addEventListener('paste', event => event.preventDefault());
  input.addEventListener('drop', event => event.preventDefault());
  window.addEventListener('pagehide', saveKeyStats);

  $('#typing-area').addEventListener('click', () => input.focus());
  $('#restart-button').addEventListener('click', () => { reset(false); input.focus(); });
  $('#new-button').addEventListener('click', () => { reset(true); input.focus(); });

  $('#settings-button').addEventListener('click', () => $('#settings-dialog').showModal());
  $('#keyboard-toggle').checked = loadSetting('typeflow-show-keyboard') !== 'false';
  $('#keyboard-toggle').addEventListener('change', event => {
    saveSetting('typeflow-show-keyboard', String(event.target.checked));
    keyboard.hidden = !event.target.checked;
  });
  keyboard.hidden = !$('#keyboard-toggle').checked;

  renderProgress();
  reset(true);
  input.focus({preventScroll: true});
})();
