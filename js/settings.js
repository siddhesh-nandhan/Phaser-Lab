// Settings are read from the code itself, so any value a user exposes becomes a control:
//   const { speed = 250, color = '#ff305b' } = options;   options.size ?? 10
//   uniforms: { strength: { value: 1 } }                  const config = { gravity: 300 };
// Values are numbers, booleans, colours (#rrggbb) or text.

const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
const CONFIG_SKIP = new Set(['width', 'height', 'parent', 'type', 'mode', 'autoCenter', 'scene']);
const LITERAL = String.raw`-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*"`;

function parseLiteral(raw) {
  if (raw === undefined) return { type: 'number', value: 1 };
  if (raw === 'true' || raw === 'false') return { type: 'boolean', value: raw === 'true' };
  if (/^['"]/.test(raw)) {
    const text = raw.slice(1, -1);
    return /^#[0-9a-f]{6}$/i.test(text) ? { type: 'color', value: text.toLowerCase() } : { type: 'text', value: text };
  }
  return { type: 'number', value: Number(raw) };
}

export function detectSettings(code) {
  const source = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const found = new Map();
  const add = (key, raw) => {
    if (!RESERVED.has(key) && !found.has(key) && key !== 'time') found.set(key, { key, ...parseLiteral(raw) });
  };
  // const { a = 1, b: alias = 2 } = options
  for (const match of source.matchAll(/(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*options\b/g)) {
    for (const part of match[1].split(',')) {
      const entry = part.trim().match(new RegExp(String.raw`^([A-Za-z_$][\w$]*)(?:\s*:\s*[A-Za-z_$][\w$]*)?(?:\s*=\s*(${LITERAL}))?$`));
      if (entry && entry[2] !== undefined) add(entry[1], entry[2]); // names without a default are not settings
    }
  }
  // options.a ?? 1, options.a || 1, options?.a
  for (const match of source.matchAll(new RegExp(String.raw`\boptions(?:\?\.|\.)([A-Za-z_$][\w$]*)(?:\s*(?:\?\?|\|\|)\s*(${LITERAL}))?`, 'g'))) add(match[1], match[2]);
  // Shader uniforms: name: { value: 1 }
  for (const match of source.matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*\{\s*value\s*:\s*(-?\d+(?:\.\d+)?)\s*\}/g)) add(match[1], match[2]);
  // Scalar values in a Phaser config object.
  const config = source.match(/(?:const|let|var)\s+config\s*=\s*\{([\s\S]*?)\};/);
  if (config) {
    for (const match of config[1].matchAll(new RegExp(String.raw`\b([A-Za-z_$][\w$]*)\s*:\s*(${LITERAL})\s*(?=[,}\n])`, 'g'))) {
      if (!CONFIG_SKIP.has(match[1])) add('config.' + match[1], match[2]);
    }
  }
  return [...found.values()];
}

// "hexSize" -> "Hex size", "config.backgroundColor" -> "Background color", "originX" -> "Origin X".
export function settingLabel(key) {
  const words = key.replace(/^config\./, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  const lower = words.replace(/\b([A-Z])([a-z])/g, (m, a, b) => a.toLowerCase() + b);
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Split values into the job's options and Phaser config overrides.
export function splitValues(settings, values) {
  const options = {}, config = {};
  for (const { key, value } of settings) {
    const current = key in values ? values[key] : value;
    if (key.startsWith('config.')) config[key.slice(7)] = current;
    else options[key] = current;
  }
  return { options, config };
}

// Controls for the settings row. onChange(key, value) fires on every edit.
export function renderSettings(container, settings, values, onChange, extra = []) {
  container.replaceChildren(...extra);
  for (const setting of settings) {
    const { key, type } = setting;
    const value = key in values ? values[key] : setting.value;
    const label = document.createElement('label');
    label.append(settingLabel(key));
    const input = document.createElement('input');
    input.name = key;
    if (type === 'boolean') {
      input.type = 'checkbox';
      input.checked = value;
      input.addEventListener('change', () => onChange(key, input.checked));
      label.classList.add('check');
    } else if (type === 'color') {
      input.type = 'color';
      input.value = value;
      const readout = document.createElement('output');
      readout.className = 'readout';
      readout.textContent = value;
      label.append(readout);
      input.addEventListener('input', () => { readout.textContent = input.value; onChange(key, input.value); });
    } else if (type === 'number') {
      input.type = 'number';
      input.step = 'any';
      input.value = value;
      input.addEventListener('input', () => { if (input.value !== '' && Number.isFinite(Number(input.value))) onChange(key, Number(input.value)); });
    } else {
      input.type = 'text';
      input.value = value;
      input.addEventListener('input', () => onChange(key, input.value));
    }
    label.append(input);
    container.append(label);
  }
}
