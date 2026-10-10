// Phaser scenes inside the preview. Accepts a Phaser.Scene class, create/preload/update functions, or a
// complete Phaser.Game example; every game is fitted to the preview at its authored size.
import { report, compile, startHeartbeat } from './runtime.js';

// Code that mentions Phaser, except a goToScene transition, which uses the light adapter instead.
export function usesPhaser(code) {
  return /\bPhaser\b/.test(code) && !/\bfunction\s+goToScene\s*\(/.test(code);
}

export function runPhaser({ code, options, config: overrides = {} }) {
  const Engine = window.Phaser;
  if (!Engine?.Game) throw Error('Phaser could not load.');
  const games = [];
  const fit = config => {
    const width = Number(config.width) || 800, height = Number(config.height) || 600;
    const transparent = config.transparent ?? !config.backgroundColor;
    return {
      ...config, ...overrides, parent: document.body, width, height, transparent,
      scale: { ...config.scale, parent: document.body, width, height, mode: Engine.Scale.FIT, autoCenter: Engine.Scale.CENTER_BOTH },
    };
  };
  // A Phaser that sizes every game it creates to the preview.
  const PreviewPhaser = Object.create(Engine);
  PreviewPhaser.Game = class extends Engine.Game {
    constructor(config = {}) {
      super(fit(config));
      games.push(this);
    }
  };

  const scenes = [...code.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)\s+extends\s+Phaser\.Scene/g)].map(match => match[1]);
  const result = compile(code, ['Phaser', 'options'], [...scenes, 'config', 'preload', 'create', 'update'])(PreviewPhaser, options);
  if (!games.length) {
    const config = result.config || {};
    const sceneClasses = scenes.map(name => result[name]).filter(Boolean);
    if (!sceneClasses.length && !config.scene && !result.create) {
      throw Error('Provide a Phaser.Scene class, a create() function, or a complete Phaser.Game example.');
    }
    new PreviewPhaser.Game({
      ...config,
      type: config.type ?? Engine.AUTO,
      scene: sceneClasses.length ? sceneClasses : config.scene || { preload: result.preload || undefined, create: result.create || undefined, update: result.update || undefined },
    });
  }
  startHeartbeat();
  report('running', 'Running Phaser ' + Engine.VERSION, { live: true });
  return () => { for (const game of games) game.destroy(true); };
}
