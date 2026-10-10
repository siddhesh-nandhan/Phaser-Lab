// Button effects inside the preview: a real HTML button wired to the pasted buttonEffect(button, options).
import { report, compile } from './runtime.js';
import { runPhaser, usesPhaser } from './phaser.js';

export function runButton({ code, options, config, label }) {
  if (usesPhaser(code)) return runPhaser({ code, options, config });
  const stage = document.createElement('div');
  stage.className = 'button-stage';
  const button = document.createElement('button');
  button.textContent = label || 'PLAY NOW';
  const note = document.createElement('p');
  note.textContent = 'Tap to test';
  stage.append(button, note);
  document.body.append(stage);

  const { buttonEffect } = compile(code, [], ['buttonEffect'])();
  if (!buttonEffect) throw Error('Define function buttonEffect(button, options).');
  const behavior = buttonEffect(button, options);
  let clicks = 0;
  button.addEventListener('click', () => {
    clicks++;
    note.textContent = 'Clicks: ' + clicks;
    report('running', 'Click registered · ' + clicks);
  });
  report('running', 'Ready · tap the button');
  return () => behavior?.stop?.();
}
