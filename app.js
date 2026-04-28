const STEPS = 16;
const PATTERN_SLOTS = 4;
const STORAGE_KEY = "m2-drum-pattern";

const SOUND_FONT_URL = "./drum_font/drum-mp3.js";
const SOUND_FONT_VARIABLE = "MIDI.Soundfont.acoustic_grand_piano";

const INSTRUMENT_OPTIONS = [
  { name: "Kick 1", midi: 36 },
  { name: "Kick 2", midi: 35 },
  { name: "Snare", midi: 38 },
  { name: "Clap", midi: 39 },
  { name: "Closed Hat", midi: 42 },
  { name: "Open Hat", midi: 46 },
  { name: "Low Tom", midi: 41 },
  { name: "Mid Tom", midi: 48 },
  { name: "High Tom", midi: 50 },
  { name: "Crash", midi: 49 },
  { name: "Ride", midi: 51 },
  { name: "Cowbell", midi: 56 },
];

const DEFAULT_ROWS = [
  { label: "Kick", midi: 36 },
  { label: "Snare", midi: 38 },
  { label: "Clap", midi: 39 },
  { label: "Closed Hat", midi: 42 },
  { label: "Open Hat", midi: 46 },
  { label: "Low Tom", midi: 41 },
  { label: "Mid Tom", midi: 48 },
  { label: "High Tom", midi: 50 },
  { label: "Crash", midi: 49 },
];

const state = {
  currentPattern: 0,
  patterns: [],
  isPlaying: false,
  tempo: 110,
  swing: 0,
  masterVolume: 0.8,
  audioReady: false,
};

const dom = {
  grid: document.getElementById("grid"),
  stepLabels: document.getElementById("stepLabels"),
  playBtn: document.getElementById("playBtn"),
  stopBtn: document.getElementById("stopBtn"),
  clearBtn: document.getElementById("clearBtn"),
  randomBtn: document.getElementById("randomBtn"),
  tempo: document.getElementById("tempo"),
  tempoValue: document.getElementById("tempoValue"),
  swing: document.getElementById("swing"),
  swingValue: document.getElementById("swingValue"),
  masterVolume: document.getElementById("masterVolume"),
  masterVolumeValue: document.getElementById("masterVolumeValue"),
  patternBank: document.getElementById("patternBank"),
  saveBtn: document.getElementById("saveBtn"),
  loadBtn: document.getElementById("loadBtn"),
  audioStatus: document.getElementById("audioStatus"),
  patternStatus: document.getElementById("patternStatus"),
};

let audioContext;
let player;
let drumPreset = null;
let schedulerTimer = null;
let currentStep = 0;
let nextNoteTime = 0;

const gridCells = [];

function resolveGlobalPath(path) {
  return path
    .split(".")
    .reduce((value, key) => (value ? value[key] : undefined), window);
}

function createEmptyPattern() {
  return {
    rows: DEFAULT_ROWS.map((row) => ({
      label: row.label,
      midi: row.midi,
      volume: 0.85,
      steps: Array.from({ length: STEPS }, () => false),
    })),
  };
}

function initPatterns() {
  state.patterns = Array.from({ length: PATTERN_SLOTS }, () =>
    createEmptyPattern(),
  );
}

function buildStepLabels() {
  dom.stepLabels.innerHTML = "";
  for (let i = 0; i < STEPS; i += 1) {
    const label = document.createElement("div");
    label.className = "step-label";
    label.textContent = (i + 1).toString();
    dom.stepLabels.appendChild(label);
  }
}

function buildPatternBank() {
  dom.patternBank.innerHTML = "";
  for (let i = 0; i < PATTERN_SLOTS; i += 1) {
    const btn = document.createElement("button");
    btn.textContent = (i + 1).toString();
    btn.dataset.index = i.toString();
    btn.addEventListener("click", () => switchPattern(i));
    dom.patternBank.appendChild(btn);
  }
  updatePatternBankUI();
}

function buildGrid() {
  dom.grid.innerHTML = "";
  gridCells.length = 0;
  const pattern = state.patterns[state.currentPattern];

  pattern.rows.forEach((row, rowIndex) => {
    const rowWrap = document.createElement("div");
    rowWrap.className = "row";

    const instrument = document.createElement("div");
    instrument.className = "instrument";
    const label = document.createElement("label");
    label.textContent = row.label;
    const select = document.createElement("select");
    INSTRUMENT_OPTIONS.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.midi.toString();
      opt.textContent = `${option.name} (${option.midi})`;
      if (option.midi === row.midi) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
    select.addEventListener("change", (event) => {
      row.midi = Number(event.target.value);
    });
    instrument.appendChild(label);
    instrument.appendChild(select);

    const grid = document.createElement("div");
    grid.className = "grid";
    const rowCells = [];
    for (let step = 0; step < STEPS; step += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (row.steps[step]) {
        cell.classList.add("is-on");
      }
      cell.addEventListener("click", () => toggleCell(rowIndex, step, cell));
      grid.appendChild(cell);
      rowCells.push(cell);
    }

    const level = document.createElement("div");
    level.className = "level";
    const levelInput = document.createElement("input");
    levelInput.type = "range";
    levelInput.min = "0";
    levelInput.max = "100";
    levelInput.value = Math.round(row.volume * 100).toString();
    levelInput.addEventListener("input", (event) => {
      row.volume = Number(event.target.value) / 100;
    });
    const levelValue = document.createElement("div");
    levelValue.className = "slider-value";
    levelValue.textContent = `${Math.round(row.volume * 100)}%`;
    levelInput.addEventListener("input", (event) => {
      levelValue.textContent = `${event.target.value}%`;
    });
    level.appendChild(levelInput);
    level.appendChild(levelValue);

    rowWrap.appendChild(instrument);
    rowWrap.appendChild(grid);
    rowWrap.appendChild(level);
    dom.grid.appendChild(rowWrap);
    gridCells.push(rowCells);
  });
}

function toggleCell(rowIndex, stepIndex, cellEl) {
  const pattern = state.patterns[state.currentPattern];
  const row = pattern.rows[rowIndex];
  row.steps[stepIndex] = !row.steps[stepIndex];
  cellEl.classList.toggle("is-on", row.steps[stepIndex]);
}

function setCurrentStep(stepIndex) {
  gridCells.forEach((row) => {
    row.forEach((cell, index) => {
      cell.classList.toggle("is-current", index === stepIndex);
    });
  });
}

function switchPattern(index) {
  state.currentPattern = index;
  buildGrid();
  updatePatternBankUI();
  updatePatternStatus();
}

function updatePatternBankUI() {
  Array.from(dom.patternBank.children).forEach((btn, index) => {
    btn.classList.toggle("active", index === state.currentPattern);
  });
}

function updatePatternStatus() {
  dom.patternStatus.textContent = `Pattern: ${state.currentPattern + 1}`;
}

function randomizePattern() {
  const pattern = state.patterns[state.currentPattern];
  pattern.rows.forEach((row) => {
    row.steps = row.steps.map(() => Math.random() > 0.75);
  });
  buildGrid();
}

function clearPattern() {
  const pattern = state.patterns[state.currentPattern];
  pattern.rows.forEach((row) => {
    row.steps.fill(false);
  });
  buildGrid();
}

function savePattern() {
  const payload = JSON.stringify(state.patterns[state.currentPattern]);
  localStorage.setItem(`${STORAGE_KEY}-${state.currentPattern}`, payload);
}

function loadPattern() {
  const payload = localStorage.getItem(
    `${STORAGE_KEY}-${state.currentPattern}`,
  );
  if (!payload) {
    return;
  }
  const data = JSON.parse(payload);
  state.patterns[state.currentPattern] = data;
  buildGrid();
}

function unlockAudio() {
  if (state.audioReady) {
    return;
  }
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  player = new WebAudioFontPlayer();
  state.audioReady = true;
  dom.audioStatus.textContent = "Audio: Ready";
  loadSoundfont();
}

function loadSoundfont() {
  const script = document.createElement("script");
  script.src = SOUND_FONT_URL;
  script.onload = () => {
    const preset = resolveGlobalPath(SOUND_FONT_VARIABLE);
    if (preset) {
      drumPreset = preset;
      player.loader.decodeAfterLoading(audioContext, drumPreset);
      dom.audioStatus.textContent = "Audio: Soundfont Loaded";
      return;
    }
    dom.audioStatus.textContent = "Audio: Soundfont Missing";
  };
  script.onerror = () => {
    dom.audioStatus.textContent = "Audio: Soundfont Missing";
  };
  document.body.appendChild(script);
}

function scheduleStep(stepIndex, time) {
  const pattern = state.patterns[state.currentPattern];
  const secondsPerBeat = 60 / state.tempo;
  const stepDuration = secondsPerBeat / 4;
  const swingOffset = (state.swing / 100) * (stepDuration / 2);
  const playTime =
    stepIndex % 2 === 1 ? time + swingOffset : Math.max(time - swingOffset, 0);

  pattern.rows.forEach((row) => {
    if (!row.steps[stepIndex]) {
      return;
    }
    playNote(row.midi, row.volume * state.masterVolume, playTime);
  });

  const delay = Math.max(0, playTime - audioContext.currentTime) * 1000;
  setTimeout(() => setCurrentStep(stepIndex), delay);
}

function playNote(midi, volume, time) {
  if (drumPreset) {
    player.queueWaveTable(
      audioContext,
      audioContext.destination,
      drumPreset,
      time,
      midi,
      0.5,
      volume,
    );
    return;
  }
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.frequency.value = 200 + midi * 2;
  gain.gain.value = volume * 0.15;
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function nextStepTime() {
  const secondsPerBeat = 60 / state.tempo;
  const stepDuration = secondsPerBeat / 4;
  nextNoteTime += stepDuration;
  currentStep = (currentStep + 1) % STEPS;
}

function scheduler() {
  // Lookahead scheduling keeps timing tight while the UI stays responsive.
  while (nextNoteTime < audioContext.currentTime + 0.1) {
    scheduleStep(currentStep, nextNoteTime);
    nextStepTime();
  }
}

function startPlayback() {
  if (state.isPlaying) {
    return;
  }
  unlockAudio();
  state.isPlaying = true;
  currentStep = 0;
  nextNoteTime = audioContext.currentTime + 0.05;
  schedulerTimer = setInterval(scheduler, 25);
  dom.playBtn.textContent = "Pause";
}

function stopPlayback() {
  state.isPlaying = false;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
  dom.playBtn.textContent = "Play";
  setCurrentStep(-1);
}

function setupControls() {
  dom.playBtn.addEventListener("click", () => {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });
  dom.stopBtn.addEventListener("click", stopPlayback);
  dom.clearBtn.addEventListener("click", clearPattern);
  dom.randomBtn.addEventListener("click", randomizePattern);
  dom.saveBtn.addEventListener("click", savePattern);
  dom.loadBtn.addEventListener("click", loadPattern);

  dom.tempo.addEventListener("input", (event) => {
    state.tempo = Number(event.target.value);
    dom.tempoValue.textContent = event.target.value;
  });
  dom.swing.addEventListener("input", (event) => {
    state.swing = Number(event.target.value);
    dom.swingValue.textContent = event.target.value;
  });
  dom.masterVolume.addEventListener("input", (event) => {
    state.masterVolume = Number(event.target.value) / 100;
    dom.masterVolumeValue.textContent = event.target.value;
  });

  document.body.addEventListener("click", unlockAudio, { once: true });
}

function init() {
  initPatterns();
  buildStepLabels();
  buildPatternBank();
  buildGrid();
  setupControls();
  updatePatternStatus();
}

init();
