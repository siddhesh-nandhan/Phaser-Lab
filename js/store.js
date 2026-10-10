// Saved work: the open tool, the Settings fold, and per tool the preset, the code and changed settings.
// Kept in this browser only. Storage can be unavailable (private windows), so every access is guarded.
const KEY = 'transition-lab:v2';

export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

let timer;
export function saveState(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, 200);
}
