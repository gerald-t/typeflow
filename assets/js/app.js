(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const promptEl = $('#prompt');
  const typingArea = $('#typing-area');
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
  const LETTER_ORDER = 'neiartoslducpmhgbfwykvxjqz';
  const STARTER_LETTER_COUNT = 5;
  const UNLOCK_MIN_SAMPLES = 12;
  const UNLOCK_ACCURACY = 0.90;
  const MIN_KEY_SAMPLES = 8;
  const EXERCISE_WORDS = 24;
  const additionalWords = (
    'near era rain ear are air an in nine inner nearer rear rare earn rein ire area arena eerie rani ' +
    'aerie airier rainier ranee erne ran nae nee anna anne erin irene ' +
    'rate tear tier tire train retain retina terrain eater enter entire attain ' +
    'ore oreo one nor not ton toe too rot riot iron into trio tone note ' +
    'stone store sort rose sore soon soonest notes onset stern snore norte ' +
    'tea ten net tan tin tie tire tries train trains stain stare start ' +
    'seat east eats eat seen see teen teenie nest nests rent rents near ' +
    'son sat sit sin sir set sea seaer sore sorest ratios ratio reason ' +
    'season senior seniority reasoner reasoned relation relations station ' +
    'listen silent sailor reason nature return routine source lesson learn ' +
    'focus skill practice improve keyboard finger typing speed accuracy'
  ).split(' ');
  const wordBank = [...new Set([...commonWords, ...additionalWords])];

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
  const storedLearning = loadJSON('typeflow-learning-state', {});
  const storedUnlockCount = Number(storedLearning.unlockedCount);
  let unlockedCount = Number.isInteger(storedUnlockCount)
    ? Math.min(LETTER_ORDER.length, Math.max(STARTER_LETTER_COUNT, storedUnlockCount))
    : STARTER_LETTER_COUNT;
  const learningStats = {};
  LETTER_ORDER.split('').forEach(letter => {
    const stat = storedLearning.stats && storedLearning.stats[letter];
    learningStats[letter] = {
      hits: stat && typeof stat === 'object' ? toCount(stat.hits) : 0,
      errors: stat && typeof stat === 'object' ? toCount(stat.errors) : 0
    };
  });

  let target = '';
  let exerciseFocus = 'n';
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
  function activeLetters() {
    return LETTER_ORDER.slice(0, unlockedCount);
  }
  function saveLearningState() {
    saveJSON('typeflow-learning-state', {unlockedCount, stats: learningStats});
  }
  function weakKeys() {
    return activeLetters().split('')
      .map(letter => [letter, learningStats[letter]])
      .filter(([, stat]) => stat.hits + stat.errors >= MIN_KEY_SAMPLES)
      .map(([letter, stat]) => [letter, stat.errors / (stat.hits + stat.errors)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([letter]) => letter);
  }
  function focusLetter() {
    return activeLetters().split('')
      .map((letter, index) => {
        const stat = learningStats[letter];
        const samples = stat.hits + stat.errors;
        return {letter, index, samples, accuracy: samples ? stat.hits / samples : 0};
      })
      .sort((a, b) => {
        if (a.samples === 0 && b.samples > 0) return -1;
        if (b.samples === 0 && a.samples > 0) return 1;
        return a.accuracy - b.accuracy || a.index - b.index;
      })[0].letter;
  }
  function pickWeighted(words, weights, total) {
    let roll = Math.random() * total;
    for (let i = 0; i < words.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return words[i];
    }
    return words[words.length - 1];
  }
  function makePseudoWord(allowed, focus) {
    const vowels = allowed.filter(letter => 'aeiou'.includes(letter));
    const consonants = allowed.filter(letter => !'aeiou'.includes(letter));
    const focusType = 'aeiou'.includes(focus) ? 'V' : 'C';
    const patterns = [
      ['C', 'V', 'C'],
      ['V', 'C', 'V'],
      ['C', 'V', 'C', 'V'],
      ['V', 'C', 'V', 'C'],
      ['C', 'V', 'C', 'V', 'C'],
      ['V', 'C', 'V', 'C', 'V']
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const focusPositions = pattern
      .map((type, index) => type === focusType ? index : -1)
      .filter(index => index >= 0);
    const focusPosition = focusPositions[Math.floor(Math.random() * focusPositions.length)];
    return pattern.map((type, index) => {
      if (index === focusPosition) return focus;
      const choices = type === 'V' ? vowels : consonants;
      return choices[Math.floor(Math.random() * choices.length)];
    }).join('');
  }

  function pickExercise() {
    const allowedLetters = activeLetters();
    const allowed = new Set(allowedLetters.split(''));
    const focus = focusLetter();
    exerciseFocus = focus;
    const candidates = wordBank.filter(word =>
      word.length >= 2 &&
      /^[a-z]+$/.test(word) &&
      word.includes(focus) &&
      [...word].every(letter => allowed.has(letter))
    );
    const usableWords = [...candidates];
    // Add pronounceable, unlocked-letter-only syllables when the real-word pool is small.
    if (usableWords.length < 18) {
      for (let i = 0; i < 24; i++) {
        usableWords.push(makePseudoWord(allowedLetters.split(''), focus));
      }
    }
    const weak = weakKeys();
    const weights = usableWords.map(word =>
      1 + [...word].filter(char => weak.includes(char)).length * 2
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const words = [];
    for (let i = 0; i < EXERCISE_WORDS; i++) {
      words.push(pickWeighted(usableWords, weights, totalWeight));
    }
    return words.join(' ');
  }
  function recordLearningSample(letter, wasCorrect) {
    const stat = learningStats[letter];
    if (!stat) return;
    if (wasCorrect) stat.hits += 1;
    else stat.errors += 1;
    saveLearningState();
  }
  function renderLetterProgress() {
    const active = activeLetters();
    $('#letter-count').textContent = unlockedCount + ' / 26 LETTERS UNLOCKED';
    $('#focus-key-label').textContent = 'Focus key: ' + exerciseFocus.toUpperCase();
    $('#next-letter').textContent = unlockedCount < LETTER_ORDER.length
      ? 'Next letter: ' + LETTER_ORDER[unlockedCount].toUpperCase()
      : 'All letters unlocked';
    const chips = $('#letter-chips');
    chips.replaceChildren();
    LETTER_ORDER.split('').forEach((letter, index) => {
      const chip = document.createElement('span');
      chip.className = 'letter-chip' + (index < unlockedCount ? ' is-unlocked' : '');
      chip.textContent = letter.toUpperCase();
      chip.title = index < unlockedCount ? 'Unlocked letter ' + letter.toUpperCase() : 'Locked letter ' + letter.toUpperCase();
      chips.appendChild(chip);
    });
    $('#letter-note').textContent = unlockedCount < LETTER_ORDER.length
      ? 'Practise each unlocked letter. A new letter unlocks when every active letter has at least ' +
        UNLOCK_MIN_SAMPLES + ' attempts and ' + Math.round(UNLOCK_ACCURACY * 100) + '% accuracy.'
      : 'All letters are unlocked. Keep practising to strengthen your slowest keys.';
  }
  function checkForLetterUnlock() {
    if (unlockedCount >= LETTER_ORDER.length) return '';
    const allReady = activeLetters().split('').every(letter => {
      const stat = learningStats[letter];
      const samples = stat.hits + stat.errors;
      return samples >= UNLOCK_MIN_SAMPLES && samples > 0 && (stat.hits / samples) >= UNLOCK_ACCURACY;
    });
    if (!allReady) return '';
    const newLetter = LETTER_ORDER[unlockedCount];
    unlockedCount += 1;
    exerciseFocus = focusLetter();
    saveLearningState();
    renderLetterProgress();
    updateKeyboard();
    return newLetter.toUpperCase();
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
    const unlocked = new Set(activeLetters().split(''));
    const expected = target[typed.length] || '';
    keyboard.querySelectorAll('[data-key]').forEach(key => {
      const letter = key.dataset.key;
      const isSpace = letter === ' ';
      const unlockedKey = isSpace || unlocked.has(letter);
      key.classList.toggle('is-locked', !unlockedKey);
      key.classList.toggle('is-unlocked', !isSpace && unlockedKey);
      key.classList.toggle('next-key', letter === expected);
      if (!isSpace && /^[a-z]$/.test(letter)) {
        const stat = learningStats[letter];
        const samples = stat.hits + stat.errors;
        key.title = samples
          ? letter.toUpperCase() + ' · ' + Math.round((stat.hits / samples) * 100) + '% accuracy (' + samples + ' attempts)'
          : letter.toUpperCase() + ' · not calibrated yet';
      }
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
    const unlockedLetter = checkForLetterUnlock();
    saveProgress();
    saveKeyStats();
    renderProgress();
    hintEl.textContent = unlockedLetter
      ? 'Great work! New letter unlocked: ' + unlockedLetter + ' · choose New exercise to practise it'
      : 'exercise complete · choose New exercise to continue';
  }
  function reset(newExercise = false) {
    window.clearInterval(statsInterval);
    saveKeyStats();
    target = newExercise || !target ? pickExercise() : target;
    renderLetterProgress();
    typed = '';
    startedAt = null;
    finished = false;
    correctChars = 0;
    keystrokes = 0;
    correctKeystrokes = 0;
    totalErrors = 0;
    mistakeUntil = 0;
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
    renderLetterProgress();
  }
  function recordKeyStats(index, wasCorrect) {
    const key = (target[index] || '').toLowerCase();
    if (!/^[a-z]$/.test(key)) return;
    keyStats[key] ||= {hits: 0, errors: 0};
    if (wasCorrect) keyStats[key].hits += 1;
    else keyStats[key].errors += 1;
    keyStatsDirty = true;
    recordLearningSample(key, wasCorrect);
  }

  function handleTypedCharacter(enteredChar) {
    if (finished) return;

    start();
    const expectedIndex = typed.length;
    keystrokes += 1;

    if (enteredChar.toLowerCase() === target[expectedIndex]) {
      typed += target[expectedIndex];
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

    renderPrompt();
    updateStats();
    if (typed.length === target.length) finish();
  }

  typingArea.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      reset(false);
      focusTypingArea();
      return;
    }

    if (event.key === 'Backspace') {
      // Strict practice: accepted characters stay in place. Backspace does nothing.
      event.preventDefault();
      return;
    }

    // Ignore browser shortcuts and IME composition; only capture printable keys.
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.key.length !== 1) {
      return;
    }

    // The practice panel is not an editable field, so OS/browser text suggestions
    // have no text box to attach to. We process the key directly instead.
    event.preventDefault();
    handleTypedCharacter(event.key);
  });

  window.addEventListener('pagehide', saveKeyStats);

  function focusTypingArea() {
    typingArea.focus({preventScroll: true});
  }

  typingArea.addEventListener('click', focusTypingArea);
  $('#restart-button').addEventListener('click', () => { reset(false); focusTypingArea(); });
  $('#new-button').addEventListener('click', () => { reset(true); focusTypingArea(); });

  $('#settings-button').addEventListener('click', () => $('#settings-dialog').showModal());
  $('#keyboard-toggle').checked = loadSetting('typeflow-show-keyboard') !== 'false';
  $('#keyboard-toggle').addEventListener('change', event => {
    saveSetting('typeflow-show-keyboard', String(event.target.checked));
    keyboard.hidden = !event.target.checked;
  });
  keyboard.hidden = !$('#keyboard-toggle').checked;

  renderProgress();
  reset(true);
  updateKeyboard();
  focusTypingArea();
})();
