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

  const wordBank = [
    'the quick brown fox jumps over the lazy dog',
    'small steps every day lead to lasting progress',
    'practice builds confidence and confidence builds speed',
    'focus on accuracy first and let your rhythm grow',
    'steady hands and a calm mind make typing feel natural',
    'technology helps people solve problems and share ideas',
    'learning a new skill takes patience time and repetition',
    'clear thinking begins with simple habits and good focus'
  ];
  const keyStats = JSON.parse(localStorage.getItem('typeflow-key-stats') || '{}');
  const saved = JSON.parse(localStorage.getItem('typeflow-progress') || '{"sessions":0,"bestWpm":0,"accuracyTotal":0,"totalSeconds":0}');
  let duration = 30, target = '', typed = '', startedAt = null, timer = null, remaining = duration, finished = false;
  let correctChars = 0, errors = 0;

  function saveProgress() { localStorage.setItem('typeflow-progress', JSON.stringify(saved)); }
  function pickExercise() {
    const weak = Object.entries(keyStats).sort((a,b) => (b[1].errors / Math.max(1,b[1].hits+b[1].errors)) - (a[1].errors / Math.max(1,a[1].hits+a[1].errors))).slice(0,4).map(([key]) => key);
    let text = wordBank[Math.floor(Math.random() * wordBank.length)];
    if (weak.length && Math.random() < .65) {
      const extras = wordBank.filter(line => weak.some(key => line.includes(key)));
      if (extras.length) text = extras[Math.floor(Math.random() * extras.length)];
    }
    return (text + ' ' + wordBank[Math.floor(Math.random() * wordBank.length)]).toLowerCase();
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
    const accuracy = typed.length ? Math.round((correctChars / typed.length) * 100) : 100;
    wpmEl.textContent = String(wpm);
    accuracyEl.innerHTML = accuracy + '<span class="unit">%</span>';
    errorsEl.textContent = String(errors);
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
    renderProgress();
    hintEl.textContent = 'session complete · choose New exercise to continue';
    input.blur();
  }
  function reset(newExercise = false) {
    window.clearInterval(timer);
    duration = Number(document.querySelector('.duration-picker .selected').dataset.duration);
    target = newExercise ? pickExercise() : target || pickExercise();
    typed = ''; startedAt = null; remaining = duration; finished = false; correctChars = 0; errors = 0;
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
    localStorage.setItem('typeflow-key-stats', JSON.stringify(keyStats));
  }

  input.addEventListener('input', () => {
    if (finished) return;
    const next = input.value.slice(0, target.length);
    if (next.length > typed.length) {
      start();
      for (let i = typed.length; i < next.length; i++) {
        recordKeyStats(i, next[i]);
        if (next[i] === target[i]) correctChars++; else errors++;
      }
    } else if (next.length < typed.length) {
      const removed = typed.length - next.length;
      for (let i = typed.length - 1; i >= next.length; i--) {
        if (typed[i] === target[i]) correctChars--; else errors--;
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
  $('#typing-area').addEventListener('click', () => input.focus());
  $('#restart-button').addEventListener('click', () => { reset(false); input.focus(); });
  $('#new-button').addEventListener('click', () => { reset(true); input.focus(); });
  document.querySelectorAll('[data-duration]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-duration]').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected'); reset(false);
  }));
  $('#settings-button').addEventListener('click', () => $('#settings-dialog').showModal());
  $('#keyboard-toggle').checked = localStorage.getItem('typeflow-show-keyboard') !== 'false';
  $('#keyboard-toggle').addEventListener('change', event => {
    localStorage.setItem('typeflow-show-keyboard', String(event.target.checked));
    keyboard.hidden = !event.target.checked;
  });
  keyboard.hidden = !$('#keyboard-toggle').checked;
  renderProgress();
  reset(true);
  input.focus({preventScroll:true});
})();