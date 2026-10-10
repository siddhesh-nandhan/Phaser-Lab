// Animation lab inside the preview: animationEffect(canvas, options) on a full-size canvas, or a
// Phaser scene when the code uses Phaser.
import { report, compile, startHeartbeat } from './runtime.js';
import { runPhaser, usesPhaser } from './phaser.js';

export function runAnimation({ code, options, config }) {
  if (usesPhaser(code)) return runPhaser({ code, options, config });
  const canvas = document.createElement('canvas');
  canvas.className = 'fill';
  document.body.append(canvas);
  const api = compile(code, [], ['animationEffect', 'confettiEffect'])();
  const effect = api.animationEffect || api.confettiEffect;
  if (!effect) throw Error('Define animationEffect(canvas, options), or paste a Phaser scene.');
  const behavior = effect(canvas, options);
  startHeartbeat();
  report('running', 'Running', { live: true });
  return () => behavior?.stop?.();
}
