// Runs inside preview.html. Loads the engine named in the URL, tells the page it is ready, runs the one
// job the page sends, and reports back: status messages, errors, and a frame-rate heartbeat that proves
// the preview is really drawing.
import { runTransition } from './transition.js';
import { runButton } from './button.js';
import { runAnimation } from './animation.js';
import { runShader } from './shader.js';

const params = new URLSearchParams(location.search);
const runId = params.get('run');
const ENGINES = { phaser: 'vendor/phaser-3.90.0.min.js', three: 'vendor/three-r160.min.js' };

export function report(type, message = '', extra = {}) {
  parent.postMessage({ from: 'preview', run: runId, type, message, ...extra }, location.origin);
}
addEventListener('error', event => report('error', event.message));
addEventListener('unhandledrejection', event => report('error', String(event.reason?.message ?? event.reason)));

// Heartbeat: count the frames this document actually draws and report them once a second.
let heartbeat = null;
export function startHeartbeat() {
  if (heartbeat) return;
  let frames = 0, since = performance.now();
  const count = () => { frames++; requestAnimationFrame(count); };
  requestAnimationFrame(count);
  heartbeat = setInterval(() => {
    const now = performance.now();
    report('frame', '', { fps: Math.round(frames * 1000 / (now - since)) });
    frames = 0;
    since = now;
  }, 1000);
}
export function stopHeartbeat() {
  clearInterval(heartbeat);
  heartbeat = null;
}

// Pasted code may be written as a module; the preview runs it as a plain script.
export function compile(code, argNames, exportNames) {
  const source = code
    .replace(/\bexport\s+default\s+/g, '')
    .replace(/\bexport\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/g, '');
  const result = '{' + exportNames.map(name => `${name}: typeof ${name} !== "undefined" ? ${name} : null`).join(',') + '}';
  return (...args) => new Function(...argNames, source + '\n;return ' + result + ';')(...args);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(Error('Could not load ' + src));
    document.head.append(script);
  });
}

const runners = { transition: runTransition, button: runButton, animation: runAnimation, shader: runShader };
let stopJob = null;

addEventListener('message', async event => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const { type, job } = event.data || {};
  if (type === 'stop') {
    stopHeartbeat();
    stopJob?.();
    stopJob = null;
    report('stopped', 'Stopped');
  } else if (type === 'job' && !stopJob) {
    try {
      stopJob = (await runners[job.kind](job)) || (() => {});
    } catch (error) {
      report('error', error.message);
    }
  }
});

const engine = params.get('engine');
(ENGINES[engine] ? loadScript(ENGINES[engine]) : Promise.resolve())
  .then(() => report('ready'))
  .catch(error => report('error', error.message));
