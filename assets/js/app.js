(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const TypeFlowLearning = window.TypeFlowLearning;
  const promptEl = $('#prompt');
  const typingArea = $('#typing-area');
  const wpmEl = $('#wpm');
  const accuracyEl = $('#accuracy');
  const errorsEl = $('#errors');
  const hintEl = $('#typing-hint');
  const keyboard = $('#keyboard');
  const keyboardWrap = $('.keyboard-wrap');

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
  const LETTER_MODES = Object.freeze({
    default: Object.freeze({label: 'Default', order: 'eniarltosudycghpmkbwfjvxqz'}),
    frequency: Object.freeze({label: 'Frequency', order: 'etaoinshrdlucmfwypvbgkjxqz'})
  });
  const LEGACY_LETTER_ORDER = 'neiartoslducpmhgbfwykvxjqz';
  const STARTER_LETTER_COUNT = 5;
  const UNLOCK_MIN_SAMPLES = 12;
  const UNLOCK_ACCURACY = 0.90;
  const MIN_KEY_SAMPLES = 8;
  const MIN_EXERCISE_WORDS = 24;
  const MAX_EXERCISE_WORDS = 48;
  const savedExerciseWords = Number(loadSetting('typeflow-exercise-words'));
  let exerciseWordCount = Number.isInteger(savedExerciseWords)
    ? Math.min(MAX_EXERCISE_WORDS, Math.max(MIN_EXERCISE_WORDS, savedExerciseWords))
    : MIN_EXERCISE_WORDS;
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
  const toCount = (value) => Number.isFinite(Number(value)) && Number(value) > 0
    ? Math.min(1000000000, Math.floor(Number(value)))
    : 0;

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
  const storedModeProgress = loadJSON('typeflow-letter-progress', {});
  const legacyLearning = loadJSON('typeflow-learning-state', {});
  const requestedMode = loadSetting('typeflow-letter-mode');
  let currentMode = Object.prototype.hasOwnProperty.call(LETTER_MODES, requestedMode)
    ? requestedMode
    : 'default';

  function normalizeModeProgress(order, rawState = {}) {
    const storedLetters = Array.isArray(rawState.unlockedLetters)
      ? rawState.unlockedLetters.filter(letter => order.includes(letter))
      : order.slice(0, Number.isInteger(Number(rawState.unlockedCount))
        ? Math.min(order.length, Math.max(STARTER_LETTER_COUNT, Number(rawState.unlockedCount)))
        : STARTER_LETTER_COUNT).split('');
    const unlocked = new Set([...order.slice(0, STARTER_LETTER_COUNT), ...storedLetters]);
    const stats = {};
    order.split('').forEach(letter => {
      const stat = rawState.stats && rawState.stats[letter];
      stats[letter] = {
        ...TypeFlowLearning.normalizeStat(stat)
      };
    });
    return {
      unlockedLetters: order.split('').filter(letter => unlocked.has(letter)),
      stats
    };
  }

  const legacyCount = Number.isInteger(Number(legacyLearning.unlockedCount))
    ? Math.min(LEGACY_LETTER_ORDER.length, Math.max(STARTER_LETTER_COUNT, Number(legacyLearning.unlockedCount)))
    : STARTER_LETTER_COUNT;
  const legacyDefaultState = {
    unlockedLetters: LEGACY_LETTER_ORDER.slice(0, legacyCount).split(''),
    stats: legacyLearning.stats || {}
  };
  const modeProgress = {
    default: normalizeModeProgress(LETTER_MODES.default.order, storedModeProgress.default || legacyDefaultState),
    frequency: normalizeModeProgress(LETTER_MODES.frequency.order, storedModeProgress.frequency || {})
  };
  let unlockedLetters = new Set(modeProgress[currentMode].unlockedLetters);
  let learningStats = modeProgress[currentMode].stats;
  saveSetting('typeflow-letter-mode', currentMode);

  let target = '';
  let exerciseFocus = 'n';
  let typed = '';
  let startedAt = null;
  let activeElapsedMs = 0;
  let persistedElapsedSeconds = 0;
  let sessionStarted = false;
  let statsInterval = null;
  let finished = false;
  let correctChars = 0;
  let keystrokes = 0;
  let correctKeystrokes = 0;
  let totalErrors = 0;
  let keyStatsDirty = false;
  const mistakePositions = new Set();

  function saveProgress() { saveJSON('typeflow-progress', saved); }
  function saveKeyStats() {
    if (!keyStatsDirty) return;
    saveJSON('typeflow-key-stats', keyStats);
    keyStatsDirty = false;
  }
  function activeLetters() {
    return LETTER_MODES[currentMode].order.split('').filter(letter => unlockedLetters.has(letter)).join('');
  }
  function nextLockedLetter() {
    return LETTER_MODES[currentMode].order.split('').find(letter => !unlockedLetters.has(letter)) || '';
  }
  function saveLearningState() {
    modeProgress[currentMode] = {
      unlockedLetters: LETTER_MODES[currentMode].order.split('').filter(letter => unlockedLetters.has(letter)),
      stats: learningStats
    };
    saveJSON('typeflow-letter-progress', modeProgress);
  }
  function weakKeys() {
    return TypeFlowLearning.weakKeys(activeLetters(), learningStats, MIN_KEY_SAMPLES, 4);
  }
  function focusLetter() {
    return TypeFlowLearning.selectFocusLetter(activeLetters(), learningStats);
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
    return TypeFlowLearning.makePseudoWord(allowed, focus);
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
    const weights = TypeFlowLearning.wordWeights(usableWords, learningStats);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const words = [];
    for (let i = 0; i < exerciseWordCount; i++) {
      words.push(pickWeighted(usableWords, weights, totalWeight));
    }
    return words.join(' ');
  }
  function recordLearningSample(letter, wasCorrect) {
    const stat = learningStats[letter];
    if (!stat) return;
    TypeFlowLearning.recordSample(stat, wasCorrect);
    saveLearningState();
  }
  function renderLetterProgress() {
    const order = LETTER_MODES[currentMode].order;
    const nextLetter = nextLockedLetter();
    $('#letter-count').textContent = unlockedLetters.size + ' / 26 LETTERS UNLOCKED';
    $('#focus-key-label').textContent = 'Focus key: ' + exerciseFocus.toUpperCase();
    $('#next-letter').textContent = nextLetter ? 'Next letter: ' + nextLetter.toUpperCase() : 'All letters unlocked';
    const chips = $('#letter-chips');
    chips.replaceChildren();
    order.split('').forEach(letter => {
      const isUnlocked = unlockedLetters.has(letter);
      const chip = document.createElement('span');
      chip.className = 'letter-chip' + (isUnlocked ? ' is-unlocked' : '');
      chip.textContent = letter.toUpperCase();
      const metrics = TypeFlowLearning.performance(learningStats[letter]);
      chip.title = isUnlocked
        ? letter.toUpperCase() + ' · ' + metrics.samples + ' attempts · ' + Math.round(metrics.lifetimeAccuracy * 100) + '% overall · ' + Math.round(metrics.recentAccuracy * 100) + '% recent'
        : 'Locked letter ' + letter.toUpperCase();
      chips.appendChild(chip);
    });
    const focusMetrics = TypeFlowLearning.performance(learningStats[exerciseFocus]);
    const focusSummary = focusMetrics.samples
      ? ' Adaptive focus: ' + exerciseFocus.toUpperCase() + ' is at ' + Math.round(focusMetrics.recentAccuracy * 100) + '% recent and ' + Math.round(focusMetrics.lifetimeAccuracy * 100) + '% overall accuracy.'
      : ' Adaptive focus is building a baseline for ' + exerciseFocus.toUpperCase() + '.';
    $('#letter-note').textContent = (nextLetter
      ? 'Practise each unlocked letter. A new letter unlocks when every active letter has at least ' +
        UNLOCK_MIN_SAMPLES + ' attempts and ' + Math.round(UNLOCK_ACCURACY * 100) + '% accuracy.'
      : 'All letters are unlocked. Keep practising to strengthen your slowest keys.') + focusSummary;
  }
  function checkForLetterUnlock() {
    const newLetter = nextLockedLetter();
    if (!newLetter) return '';
    const allReady = activeLetters().split('').every(letter => {
      const stat = learningStats[letter];
      const samples = stat.hits + stat.errors;
      return samples >= UNLOCK_MIN_SAMPLES && samples > 0 && (stat.hits / samples) >= UNLOCK_ACCURACY;
    });
    if (!allReady) return '';
    unlockedLetters.add(newLetter);
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
      else if (index === typed.length && !finished) span.className = 'current pending';
      else span.className = 'pending';
      // Keep the target character red after an error, even once it is corrected.
      if (mistakePositions.has(index)) span.classList.add('has-error');
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
    const activeMs = activeElapsedMs + (startedAt ? Date.now() - startedAt : 0);
    return activeMs > 0 ? Math.max(0.1, activeMs / 1000) : 0;
  }
  function persistPracticeTime(updateUi = true) {
    const elapsed = Math.floor(elapsedSeconds());
    const additionalSeconds = Math.max(0, elapsed - persistedElapsedSeconds);
    if (!additionalSeconds) return;
    persistedElapsedSeconds = elapsed;
    saved.totalSeconds += additionalSeconds;
    recordDailyGoal(additionalSeconds);
    saveProgress();
    if (updateUi) renderProgress();
  }
  function pausePracticeSession(updateUi = true) {
    if (startedAt) {
      activeElapsedMs += Date.now() - startedAt;
      startedAt = null;
      window.clearInterval(statsInterval);
      updateStats();
    }
    persistPracticeTime(updateUi);
  }
  function resumePracticeSession() {
    if (!sessionStarted || finished || startedAt || document.visibilityState === 'hidden') return;
    startedAt = Date.now();
    statsInterval = window.setInterval(updateStats, 250);
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
    if (sessionStarted || finished) return;
    sessionStarted = true;
    startedAt = Date.now();
    hintEl.textContent = 'keep going · type each highlighted character correctly';
    statsInterval = window.setInterval(updateStats, 250);
  }
  function finish() {
    if (finished) return;
    finished = true;
    window.clearInterval(statsInterval);
    const stats = updateStats();
    pausePracticeSession(false);
    saved.sessions += 1;
    saved.bestWpm = Math.max(saved.bestWpm, stats.wpm);
    saved.accuracyTotal += stats.accuracy;
    recordWpm(stats);
    const unlockedLetter = checkForLetterUnlock();
    saveProgress();
    saveKeyStats();
    renderProgress();
    hintEl.textContent = unlockedLetter
      ? 'Great work! New letter unlocked: ' + unlockedLetter + ' · choose New exercise to practise it'
      : 'exercise complete · choose New exercise to continue';
    $('#practice-status').textContent = unlockedLetter
      ? 'Exercise complete. New letter unlocked: ' + unlockedLetter + '.'
      : 'Exercise complete.';
  }
  function reset(newExercise = false) {
    pausePracticeSession(false);
    window.clearInterval(statsInterval);
    saveKeyStats();
    target = newExercise || !target ? pickExercise() : target;
    renderLetterProgress();
    typed = '';
    startedAt = null;
    activeElapsedMs = 0;
    persistedElapsedSeconds = 0;
    sessionStarted = false;
    finished = false;
    correctChars = 0;
    keystrokes = 0;
    correctKeystrokes = 0;
    totalErrors = 0;
    mistakePositions.clear();
    wpmEl.textContent = '0';
    accuracyEl.innerHTML = '100<span class="unit">%</span>';
    errorsEl.textContent = '0';
    hintEl.innerHTML = 'start typing to begin · press <kbd>Escape</kbd> to restart';
    renderPrompt();
  }
  const rawDailyGoal = loadJSON('typeflow-daily-goal', {});
  const dailyGoal = {
    date: typeof rawDailyGoal.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDailyGoal.date) ? rawDailyGoal.date : '',
    seconds: toCount(rawDailyGoal.seconds)
  };
  const rawWpmHistory = loadJSON('typeflow-wpm-history', {});
  const wpmHistory = {};
  Object.entries(rawWpmHistory).slice(-30).forEach(([date, entries]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(entries)) return;
    wpmHistory[date] = entries.slice(-20).filter(entry => entry && typeof entry === 'object' && !Array.isArray(entry))
      .map(entry => ({wpm: toCount(entry.wpm), accuracy: Math.min(100, toCount(entry.accuracy))}));
  });
  const dateKey = (date = new Date()) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
  function recordDailyGoal(seconds) {
    const today = dateKey();
    dailyGoal.seconds = (dailyGoal.date === today ? toCount(dailyGoal.seconds) : 0) + seconds;
    dailyGoal.date = today;
    saveJSON('typeflow-daily-goal', dailyGoal);
  }
  function recordWpm(stats) {
    const today = dateKey();
    const entries = Array.isArray(wpmHistory[today]) ? wpmHistory[today] : [];
    entries.push({wpm: stats.wpm, accuracy: stats.accuracy});
    wpmHistory[today] = entries.slice(-20);
    Object.keys(wpmHistory).sort().slice(0, Math.max(0, Object.keys(wpmHistory).length-30)).forEach(key => delete wpmHistory[key]);
    saveJSON('typeflow-wpm-history', wpmHistory);
  }
  function renderStageOne() {
    const select = $('#daily-goal-minutes');
    const stored = Number(loadSetting('typeflow-daily-goal-minutes'));
    const goal = [5,10,15,20,30].includes(stored) ? stored : 10;
    select.value = String(goal);
    const seconds = dailyGoal.date === dateKey() ? toCount(dailyGoal.seconds) : 0;
    const minutes = Math.min(goal, Math.floor(seconds/60));
    $('#daily-goal-progress').textContent = minutes + ' / ' + goal + ' min';
    $('#daily-goal-fill').style.width = Math.min(100, seconds/(goal*60)*100) + '%';
    $('#daily-goal-bar').setAttribute('aria-valuemax', String(goal));
    $('#daily-goal-bar').setAttribute('aria-valuenow', String(minutes));
    $('#daily-goal-caption').textContent = seconds >= goal*60 ? 'Daily goal complete — nice work!' : (seconds ? Math.floor(seconds/60) + ' min practised today. Keep it going.' : 'Complete a practice session to get started.');
    const chart = $('#wpm-history');
    chart.replaceChildren();
    const days = Array.from({length:7}, (_,i) => {const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);return {date:d,key:dateKey(d)};});
    const values = days.map(d => (Array.isArray(wpmHistory[d.key]) ? wpmHistory[d.key] : []).map(x => toCount(x.wpm)));
    const max = Math.max(1,...values.flat());
    if (!values.some(v=>v.length)) {const empty=document.createElement('span');empty.className='history-empty';empty.textContent='Complete a session to start your history.';chart.appendChild(empty);return;}
    days.forEach((d,i) => {
      const v=values[i], avg=v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;
      const item=document.createElement('div');item.className='history-day';item.title=d.key+': '+(v.length?avg+' WPM average':'No sessions');
      const value=document.createElement('strong');value.textContent=v.length?String(avg):'—';
      const wrap=document.createElement('span');wrap.className='history-bar-wrap';
      const bar=document.createElement('span');bar.className='history-bar';bar.style.height=v.length?Math.max(6,avg/max*100)+'%':'0%';wrap.appendChild(bar);
      const label=document.createElement('small');label.textContent=d.date.toLocaleDateString(undefined,{weekday:'short'});
      item.append(value,wrap,label);chart.appendChild(item);
    });
  }
  function renderProgress() {
    $('#session-count').textContent = String(saved.sessions);
    $('#best-wpm').textContent = saved.sessions ? String(saved.bestWpm) : '—';
    $('#best-wpm-label').textContent = 'Personal best: ' + (saved.sessions ? saved.bestWpm : '—') + ' WPM';
    $('#average-accuracy').textContent = saved.sessions ? Math.round(saved.accuracyTotal / saved.sessions) + '%' : '—';
    const totalMinutes = Math.floor(saved.totalSeconds / 60);
    $('#total-time').textContent = totalMinutes < 1 ? saved.totalSeconds + 's' : totalMinutes + 'm';
    renderLetterProgress();
    renderStageOne();
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
      hintEl.textContent = 'keep going · type each highlighted character correctly';
    } else {
      totalErrors += 1;
      recordKeyStats(expectedIndex, false);
      mistakePositions.add(expectedIndex);
      hintEl.textContent = 'not quite — try the highlighted character again';
    }

    renderPrompt();
    updateStats();
    if (typed.length === target.length) finish();
  }

  typingArea.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
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

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pausePracticeSession(false);
    else resumePracticeSession();
  });
  window.addEventListener('pagehide', () => {
    pausePracticeSession(false);
    saveKeyStats();
  });
  window.addEventListener('pageshow', resumePracticeSession);

  function focusTypingArea() {
    typingArea.focus({preventScroll: true});
  }

  typingArea.addEventListener('click', focusTypingArea);
  const exerciseLengthSlider = $('#exercise-word-count');
  const exerciseLengthValue = $('#exercise-word-count-value');
  exerciseLengthSlider.value = String(exerciseWordCount);
  exerciseLengthValue.textContent = exerciseWordCount + ' words';
  exerciseLengthSlider.addEventListener('input', event => {
    const value = Number(event.target.value);
    if (!Number.isInteger(value)) return;
    exerciseWordCount = Math.min(MAX_EXERCISE_WORDS, Math.max(MIN_EXERCISE_WORDS, value));
    exerciseLengthValue.textContent = exerciseWordCount + ' words';
    saveSetting('typeflow-exercise-words', String(exerciseWordCount));
    reset(true);
  });

  $('#restart-button').addEventListener('click', () => { reset(false); focusTypingArea(); });
  $('#new-button').addEventListener('click', () => { reset(true); focusTypingArea(); });

  const darkModeToggle = $('#dark-mode-toggle');
  const savedTheme = loadSetting('typeflow-theme');
  const initialTheme = savedTheme === 'light' ? 'light' : 'dark';

  function applyTheme(theme) {
    const normalizedTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = normalizedTheme;
    darkModeToggle.checked = normalizedTheme === 'dark';
    saveSetting('typeflow-theme', normalizedTheme);
  }

  applyTheme(initialTheme);
  darkModeToggle.addEventListener('change', event => {
    applyTheme(event.target.checked ? 'dark' : 'light');
  });

  $('#daily-goal-minutes').addEventListener('change', event => {
    const value = Number(event.target.value);
    if ([5,10,15,20,30].includes(value)) { saveSetting('typeflow-daily-goal-minutes', String(value)); renderStageOne(); }
  });
  const letterModeSelect = $('#letter-mode-select');
  letterModeSelect.value = currentMode;
  letterModeSelect.addEventListener('change', event => {
    const nextMode = event.target.value;
    if (!Object.prototype.hasOwnProperty.call(LETTER_MODES, nextMode) || nextMode === currentMode) {
      letterModeSelect.value = currentMode;
      return;
    }
    if (unlockedLetters.size > STARTER_LETTER_COUNT) {
      const destinationHasProgress = modeProgress[nextMode].unlockedLetters.length > STARTER_LETTER_COUNT;
      const destinationMessage = destinationHasProgress
        ? 'You will resume that mode from its saved progress.'
        : 'That mode will start from its first five letters (E onward).';
      const message = 'You have unlocked ' + unlockedLetters.size + ' letters in ' +
        LETTER_MODES[currentMode].label + ' mode. Your progress will be saved.\n\n' +
        'Switch to ' + LETTER_MODES[nextMode].label + ' mode? ' + destinationMessage;
      if (!window.confirm(message)) {
        letterModeSelect.value = currentMode;
        return;
      }
    }
    saveLearningState();
    currentMode = nextMode;
    unlockedLetters = new Set(modeProgress[currentMode].unlockedLetters);
    learningStats = modeProgress[currentMode].stats;
    saveSetting('typeflow-letter-mode', currentMode);
    letterModeSelect.value = currentMode;
    renderProgress();
    reset(true);
    focusTypingArea();
  });

  const settingsButton = $('#settings-button');
  const settingsPanel = $('#settings-panel');
  settingsButton.addEventListener('click', () => {
    const isExpanded = settingsButton.getAttribute('aria-expanded') === 'true';
    settingsButton.setAttribute('aria-expanded', String(!isExpanded));
    settingsButton.setAttribute('aria-label', isExpanded ? 'Open settings' : 'Close settings');
    settingsPanel.hidden = isExpanded;
    if (!isExpanded) settingsPanel.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest'
    });
  });
  const keyboardToggle = $('#keyboard-toggle');
  const practicePanel = $('#practice');
  function applyKeyboardVisibility(isVisible) {
    const shouldShow = Boolean(isVisible);
    keyboardToggle.checked = shouldShow;
    keyboardWrap.hidden = !shouldShow;
    keyboardWrap.style.display = shouldShow ? '' : 'none';
    keyboardWrap.setAttribute('aria-hidden', String(!shouldShow));
    practicePanel.classList.toggle('keyboard-hidden', !shouldShow);
    saveSetting('typeflow-show-keyboard', String(shouldShow));
  }
  const showKeyboard = loadSetting('typeflow-show-keyboard') !== 'false';
  applyKeyboardVisibility(showKeyboard);
  keyboardToggle.addEventListener('change', event => {
    applyKeyboardVisibility(event.currentTarget.checked);
  });

  renderProgress();
  reset(true);
  updateKeyboard();
  focusTypingArea();
})();
