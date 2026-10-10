// Transition Lab: one workbench (preset and settings on top, code on the left, preview on the right)
// that shows whichever tool is open. Tools are described in tools.js.
import { tools } from './tools.js';
import { detectSettings, renderSettings, splitValues } from './settings.js';
import { Preview } from './preview.js';
import { sampleScreens } from './samples.js';
import { loadState, saveState } from './store.js';

const $ = id => document.getElementById(id);
const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
const state = loadState();
state.tools ||= {};
const screens = sampleScreens(); // uploads live for this visit only
let current = null;
let settings = [];
let status = { size: '', fps: null };

const presetCode = (toolId, presetId) => tools[toolId].presets.find(preset => preset.id === presetId).code;

// Saved work for a tool, filled in with its first preset the first time.
function saved(toolId = current) {
  const tool = tools[toolId];
  const entry = (state.tools[toolId] ||= {});
  if (!tool.presets.some(preset => preset.id === entry.preset)) {
    entry.preset = tool.presets[0].id;
    entry.code = null;
  }
  entry.code ??= presetCode(toolId, entry.preset);
  entry.values ||= {};
  return entry;
}

// ---- Status line -------------------------------------------------------------
function showStatus({ text, info, fps, error } = {}) {
  if (text !== undefined) {
    $('status').textContent = text;
    $('status').classList.toggle('error', Boolean(error));
  }
  if (info !== undefined) status.size = info || '';
  if (fps !== undefined) status.fps = fps;
  $('info').textContent = [status.size, status.fps != null ? status.fps + ' fps' : ''].filter(Boolean).join(' · ');
  if (current === 'transitions' && text?.startsWith('Complete')) $('run').textContent = 'Replay';
}

const preview = new Preview($('stage'), {
  onStatus: showStatus,
  onPick(x, y) {
    if (!settings.some(s => s.key === 'originX') || !settings.some(s => s.key === 'originY')) return;
    Object.assign(saved().values, { originX: x, originY: y });
    saveState(state);
    drawSettings();
    run();
  },
});

// ---- Running -----------------------------------------------------------------
function run() {
  const tool = tools[current], entry = saved();
  const { options, config } = splitValues(settings, entry.values);
  const job = { kind: tool.kind, engine: tool.engine(entry.code), code: entry.code, options, config };
  if (tool.extras === 'screens') job.images = { from: screens.from.src, to: screens.to.src };
  if (tool.extras === 'label') job.label = entry.label ?? 'PLAY NOW';
  if (tool.extras === 'geometry') job.geometry = entry.geometry ?? 'auto';
  if (tool.noise) job.noise = tool.noise;
  status = { size: '', fps: null };
  $('run').textContent = tool.runLabel;
  preview.run(job);
}

let runTimer;
const runSoon = (delay = 250) => { clearTimeout(runTimer); runTimer = setTimeout(run, delay); };

// ---- Settings ----------------------------------------------------------------
function drawSettings() {
  const entry = saved();
  settings = detectSettings(entry.code);
  // Forget changed values for settings the code no longer has.
  for (const key of Object.keys(entry.values)) if (!settings.some(s => s.key === key)) delete entry.values[key];
  const empty = [];
  if (!settings.length) {
    const note = document.createElement('p');
    note.className = 'note';
    note.innerHTML = 'No settings found. Give a value a default to tune it here, for example <code>const { speed = 1 } = options;</code>';
    empty.push(note);
  }
  renderSettings($('settings'), settings, entry.values, (key, value) => {
    entry.values[key] = value;
    saveState(state);
    runSoon();
  }, empty);
}

function setSettingsOpen(open) {
  state.settingsOpen = open;
  $('settingsToggle').setAttribute('aria-expanded', String(open));
  $('settings').hidden = !open;
  saveState(state);
}

// ---- Extras next to the preset: screenshots, button label, preview shape -----
function screenChip(name, title) {
  const chip = document.createElement('label');
  chip.className = 'upload';
  const thumb = document.createElement('img');
  thumb.alt = title;
  thumb.src = screens[name].src;
  const text = document.createElement('span');
  text.className = 'upload-text';
  const heading = document.createElement('span');
  heading.className = 'upload-title';
  heading.textContent = title;
  const file = document.createElement('span');
  file.className = 'upload-name';
  file.textContent = screens[name].name;
  text.append(heading, file);
  const replace = document.createElement('span');
  replace.className = 'replace';
  replace.textContent = 'Replace';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.className = 'visually-hidden';
  input.addEventListener('change', () => {
    const chosen = input.files[0];
    if (!chosen) return;
    const reader = new FileReader();
    reader.onload = () => {
      screens[name] = { src: reader.result, name: chosen.name };
      thumb.src = reader.result;
      file.textContent = chosen.name;
      run();
    };
    reader.onerror = () => showStatus({ text: 'That file could not be read.', error: true });
    reader.readAsDataURL(chosen);
  });
  chip.append(thumb, text, replace, input);
  return chip;
}

function field(labelText, control) {
  const label = document.createElement('label');
  label.className = 'field';
  label.append(labelText, control);
  return label;
}

function drawExtras() {
  const tool = tools[current], entry = saved(), extras = $('extras');
  extras.replaceChildren();
  if (tool.extras === 'screens') {
    extras.append(screenChip('from', 'Current screen'), screenChip('to', 'Next screen'));
  } else if (tool.extras === 'label') {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = entry.label ?? 'PLAY NOW';
    input.addEventListener('input', () => { entry.label = input.value; saveState(state); runSoon(400); });
    extras.append(field('Button label', input));
  } else if (tool.extras === 'geometry') {
    const select = document.createElement('select');
    for (const [value, text] of [['auto', 'Auto'], ['plane', 'Plane'], ['box', 'Box (volume shaders)']]) select.add(new Option(text, value));
    select.value = entry.geometry ?? 'auto';
    select.addEventListener('change', () => { entry.geometry = select.value; saveState(state); run(); });
    extras.append(field('Preview shape', select));
  }
}

// ---- Presets -----------------------------------------------------------------
function drawPresets() {
  const tool = tools[current], entry = saved(), select = $('preset');
  select.replaceChildren(...tool.presets.map(preset => new Option(preset.label, preset.id)));
  if (entry.code !== presetCode(current, entry.preset)) {
    select.add(new Option('Custom code', 'custom'));
    select.value = 'custom';
  } else {
    select.value = entry.preset;
  }
}

function usePreset(presetId) {
  const entry = saved();
  entry.preset = presetId;
  entry.code = presetCode(current, presetId);
  entry.values = {};
  saveState(state);
  $('code').value = entry.code;
  drawPresets();
  drawSettings();
  run();
}

// ---- Tools -------------------------------------------------------------------
function openTool(id) {
  if (!tools[id] || id === current) return;
  preview.clear();
  current = id;
  state.tool = id;
  saveState(state);
  history.replaceState(null, '', '#' + id);
  const tool = tools[id];
  for (const tab of $('tabs').children) tab.setAttribute('aria-pressed', String(tab.dataset.tool === id));
  $('title').textContent = tool.title;
  $('subtitle').textContent = tool.subtitle;
  $('codeTitle').textContent = tool.codeTitle;
  $('help').innerHTML = tool.help;
  $('code').value = saved().code;
  drawPresets();
  drawExtras();
  drawSettings();
  run();
}

for (const [id, tool] of Object.entries(tools)) {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.dataset.tool = id;
  tab.textContent = tool.tab;
  tab.addEventListener('click', () => openTool(id));
  $('tabs').append(tab);
}

// ---- Events ------------------------------------------------------------------
$('preset').addEventListener('change', () => { if ($('preset').value !== 'custom') usePreset($('preset').value); });
$('restore').addEventListener('click', () => usePreset(saved().preset));
$('run').addEventListener('click', run);
$('stop').addEventListener('click', () => preview.stop());
$('settingsToggle').addEventListener('click', () => setSettingsOpen($('settingsToggle').getAttribute('aria-expanded') !== 'true'));

let settingsTimer;
$('code').addEventListener('input', () => {
  saved().code = $('code').value;
  saveState(state);
  showStatus({ text: 'Code changed. Press ' + tools[current].runLabel + ' (' + shortcut + ' Enter) to see it.' });
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => { drawPresets(); drawSettings(); }, 300);
});
$('code').addEventListener('keydown', event => {
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    $('code').setRangeText('  ', $('code').selectionStart, $('code').selectionEnd, 'end');
    $('code').dispatchEvent(new Event('input'));
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    run();
  }
});

// Canvas animations draw at the size they start with, so a resized preview runs again.
let lastSize = null, resizeTimer;
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  const changed = lastSize && (Math.abs(width - lastSize[0]) > 40 || Math.abs(height - lastSize[1]) > 40);
  lastSize = [width, height];
  if (!changed || tools[current]?.kind !== 'animation') return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(run, 300);
}).observe($('stage'));

$('shortcut').textContent = shortcut + ' Enter to run';
$('run').title = shortcut + '+Enter';
setSettingsOpen(state.settingsOpen !== false);
openTool(tools[location.hash.slice(1)] ? location.hash.slice(1) : tools[state.tool] ? state.tool : 'transitions');
