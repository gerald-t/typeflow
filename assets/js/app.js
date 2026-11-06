(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const promptEl = $('#prompt');
  const input = $('#typing-input');
  const timeEl = $('#time');
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
  let duration = 30, target = '', typed = '', startedAt = null, timer = null, remaining = duration, finished = false;
  let correctChars = 0, keystrokes = 0, correctKeystrokes = 0, totalErrors = 0;
  let keyStatsDirty = false;

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
      if (index < typed.length) span.className = typed[index] === char ? 'correct' : 'incorrect';
      else if (index === typed.length && !finished) span.className = 'current pending';
      else span.className = 'pending';
      promptEl.appendChild(span);
    });
    updateKeyboard();
  }
  function updateKeyboard() {
    keyboard.querySelectorAll('[data-key]').forEach(key => key.classList.toggle('next-key', key.dataset.key === (target[typed.length] || '').toLowerCase()));
  }
  function elapsedSeconds() { return startedAt ? Math.max(.1, (Date.now() - startedAt) / 1000) : 0; }
  function updateStats() {
    const elapsed = elapsedSeconds();
    const minutes = elapsed / 60;
    const wpm = minutes ? Math.round((correctChars / 5) / minutes) : 0;
    const accuracy = keystrokes ? Math.round((correctKeystrokes / keystrokes) * 100) : 100;
    wpmEl.textContent = String(wpm);
    accuracyEl.innerHTML = accuracy + '<span class="unit">%</span>';
    errorsEl.textContent = String(totalErrors);
    return {wpm, accuracy};
  }
  function updateTimer() {
    if (!startedAt || finished) return;
    remaining = Math.max(0, duration - Math.floor(elapsedSeconds()));
    timeEl.textContent = String(remaining);
    if (remaining <= 0) finish();
  }
  function start() {
    if (startedAt || finished) return;
    startedAt = Date.now();
    hintEl.textContent = 'keep going · press Tab to restart';
    timer = window.setInterval(updateTimer, 150);
  }
  function finish() {
    if (finished) return;
    finished = true;
    window.clearInterval(timer);
    const stats = updateStats();
    saved.sessions += 1;
    saved.bestWpm = Math.max(saved.bestWpm, stats.wpm);
    saved.accuracyTotal += stats.accuracy;
    saved.totalSeconds += Math.min(duration, Math.round(elapsedSeconds()));
    saveProgress();
    saveKeyStats();
    renderProgress();
    hintEl.textContent = 'session complete · choose New exercise to continue';
    input.blur();
  }
  function reset(newExercise = false) {
    window.clearInterval(timer);
    saveKeyStats();
    duration = Number(document.querySelector('.duration-picker .selected').dataset.duration);
    target = newExercise ? pickExercise() : target || pickExercise();
    typed = ''; startedAt = null; remaining = duration; finished = false;
    correctChars = 0; keystrokes = 0; correctKeystrokes = 0; totalErrors = 0;
    input.value = ''; input.disabled = false;
    timeEl.textContent = String(duration); wpmEl.textContent = '0'; accuracyEl.innerHTML = '100<span class="unit">%</span>'; errorsEl.textContent = '0';
    hintEl.textContent = 'start typing to begin · press Tab to restart';
    renderPrompt();
  }
  function renderProgress() {
    $('#session-count').textContent = String(saved.sessions);
    $('#best-wpm').textContent = saved.sessions ? String(saved.bestWpm) : '—';
    $('#best-wpm-label').textContent = 'Personal best: ' + (saved.sessions ? saved.bestWpm : '—') + ' WPM';
    $('#average-accuracy').textContent = saved.sessions ? Math.round(saved.accuracyTotal / saved.sessions) + '%' : '—';
    const minutes = Math.floor(saved.totalSeconds / 60);
    $('#total-time').textContent = minutes < 1 ? saved.totalSeconds + 's' : minutes + 'm';
  }
  function recordKeyStats(previous, current) {
    const key = (target[previous] || '').toLowerCase();
    if (!/[a-z]/.test(key)) return;
    keyStats[key] ||= {hits:0, errors:0};
    if (current === target[previous]) keyStats[key].hits += 1;
    else keyStats[key].errors += 1;
    keyStatsDirty = true;
  }

  input.addEventListener('input', () => {
    if (finished) return;
    const next = input.value.slice(0, target.length);
    if (next.length > typed.length) {
      start();
      for (let i = typed.length; i < next.length; i++) {
        recordKeyStats(i, next[i]);
        keystrokes++;
        if (next[i] === target[i]) { correctChars++; correctKeystrokes++; } else totalErrors++;
      }
    } else if (next.length < typed.length) {
      for (let i = typed.length - 1; i >= next.length; i--) {
        if (typed[i] === target[i]) correctChars--;
      }
    }
    typed = next;
    renderPrompt();
    updateStats();
    if (typed.length >= target.length) finish();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Tab') { event.preventDefault(); reset(false); input.focus(); }
  });
  input.addEventListener('paste', event => event.preventDefault());
  input.addEventListener('drop', event => event.preventDefault());
  window.addEventListener('pagehide', saveKeyStats);
  $('#typing-area').addEventListener('click', () => input.focus());
  $('#restart-button').addEventListener('click', () => { reset(false); input.focus(); });
  $('#new-button').addEventListener('click', () => { reset(true); input.focus(); });
  document.querySelectorAll('[data-duration]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-duration]').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected'); reset(false);
  }));
  $('#settings-button').addEventListener('click', () => $('#settings-dialog').showModal());
  $('#keyboard-toggle').checked = loadSetting('typeflow-show-keyboard') !== 'false';
  $('#keyboard-toggle').addEventListener('change', event => {
    saveSetting('typeflow-show-keyboard', String(event.target.checked));
    keyboard.hidden = !event.target.checked;
  });
  keyboard.hidden = !$('#keyboard-toggle').checked;
  renderProgress();
  reset(true);
  input.focus({preventScroll:true});
})();
