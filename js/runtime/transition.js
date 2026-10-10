// Screen transitions inside the preview: draw the current screen, run the pasted transition, report.
// Supports transition({ canvas, ctx, from, to, width, height, options }) and a Phaser-style
// goToScene(scene, key, data, options) through a small adapter.
import { report, compile, startHeartbeat, stopHeartbeat } from './runtime.js';

const MAX_SIZE = 1280;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error('A screenshot could not be loaded.'));
    image.src = src;
  });
}

export async function runTransition({ code, options, images }) {
  const [first, second] = await Promise.all([loadImage(images.from), loadImage(images.to)]);
  const scale = Math.min(1, MAX_SIZE / first.naturalWidth, MAX_SIZE / first.naturalHeight);
  const width = Math.round(first.naturalWidth * scale), height = Math.round(first.naturalHeight * scale);
  // Resample both screens once, at the size of the current screen.
  const [from, to] = [first, second].map(image => {
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.getContext('2d').drawImage(image, 0, 0, width, height);
    return copy;
  });

  const canvas = document.createElement('canvas');
  canvas.className = 'fit';
  canvas.width = width;
  canvas.height = height;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(from, 0, 0, width, height);

  // A click reports where it landed on the screenshot, in percent, so the page can set an origin.
  canvas.addEventListener('click', event => {
    const box = canvas.getBoundingClientRect();
    const fit = Math.min(box.width / width, box.height / height);
    const left = box.left + (box.width - width * fit) / 2, top = box.top + (box.height - height * fit) / 2;
    const x = (event.clientX - left) / (width * fit) * 100, y = (event.clientY - top) / (height * fit) * 100;
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) report('pick', '', { x: Math.round(x), y: Math.round(y) });
  });

  // The goToScene adapter: scene switching, render events and the helpers such functions use.
  const listeners = {};
  const events = {
    on(name, fn) { (listeners[name] ||= []).push({ fn, once: false }); },
    once(name, fn) { (listeners[name] ||= []).push({ fn, once: true }); },
    off(name, fn) { listeners[name] = (listeners[name] || []).filter(entry => entry.fn !== fn); },
    emit(name) {
      const list = [...(listeners[name] || [])];
      listeners[name] = (listeners[name] || []).filter(entry => !entry.once);
      list.forEach(entry => entry.fn());
    },
  };
  const game = { canvas, events, sceneTransitioning: false };
  const scene = { game, scene: { start() { ctx.drawImage(to, 0, 0, width, height); requestAnimationFrame(() => events.emit('postrender')); } } };
  const Phaser = { Core: { Events: { POST_RENDER: 'postrender', DESTROY: 'destroy' } } };
  const screenshotPage = () => {
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.className = 'fit';
    copy.style.pointerEvents = 'none';
    copy.getContext('2d').drawImage(canvas, 0, 0);
    document.body.append(copy);
    return copy;
  };
  const helpers = {
    Phaser, IS_IOS: false, screenshotPage,
    goToSceneOnIOS: (s, key, data) => { s.scene.start(key, data); s.game.sceneTransitioning = false; },
    slideInFrames: x => [{ transform: 'translateX(' + x + '%)' }, { transform: 'translateX(0)' }],
    slidePageLayers: (frames, timing) => [canvas.animate(frames, timing)],
    SLIDE_MS: options.duration ?? 600, LEAN_MS: 150,
  };
  const api = compile(code, Object.keys(helpers), ['transition', 'goToScene'])(...Object.values(helpers));
  if (!api.transition && !api.goToScene) throw Error('Define transition(...) or goToScene(...).');

  // Measure the real frame rate while it plays.
  const intervals = [];
  let measuring = true, last;
  const measure = now => {
    if (last !== undefined) intervals.push(now - last);
    last = now;
    if (measuring) requestAnimationFrame(measure);
  };
  requestAnimationFrame(measure);
  const finish = () => {
    measuring = false;
    stopHeartbeat();
    const sorted = intervals.slice(1).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    report('done', median ? 'Complete · ' + Math.round(1000 / median) + ' fps' : 'Complete', { size: width + ' × ' + height });
  };

  report('running', 'Playing', { size: width + ' × ' + height, live: true });
  startHeartbeat();
  if (api.transition) {
    await api.transition({ canvas, ctx, from, to, width, height, options });
    finish();
  } else {
    api.goToScene(scene, 'NextScene', {}, options);
    requestAnimationFrame(() => events.emit('postrender'));
    const started = performance.now();
    const check = () => {
      if (!game.sceneTransitioning) finish();
      else if (performance.now() - started > 15000) { stopHeartbeat(); report('error', 'The transition did not finish within 15 seconds.'); }
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }
  return () => { measuring = false; };
}
