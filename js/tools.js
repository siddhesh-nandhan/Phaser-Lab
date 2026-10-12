// The four tools. Each one is data: copy, presets, which runtime runs it and which engine it needs.
// The workbench in main.js renders any of them the same way.
import * as transitions from './presets/transitions.js';
import * as buttons from './presets/buttons.js';
import * as animation from './presets/animation.js';
import * as shaders from './presets/shaders.js';
import * as models from './presets/models.js';

const usesPhaser = code => /\bPhaser\b/.test(code) && !/\bfunction\s+goToScene\s*\(/.test(code);
const buttonPreset = mode => buttons.effectImplementation.toString()
  .replace('function effectImplementation', 'function buttonEffect')
  .replace("'MODE'", "'" + mode + "'");

export const tools = {
  transitions: {
    tab: 'Screen transitions',
    title: 'Screen transitions',
    subtitle: 'Upload two screens, pick an effect, press Play.',
    codeTitle: 'Transition code',
    runLabel: 'Play',
    kind: 'transition',
    extras: 'screens',
    presets: [
      { id: 'hex', label: 'Hexagon dissolve', code: transitions.hexDissolve.toString() },
      { id: 'fade', label: 'Crossfade', code: transitions.crossfade.toString() },
      { id: 'slide', label: 'Slide', code: transitions.slide.toString() },
    ],
    engine: () => '',
    help: 'Write <code>async function transition({ canvas, ctx, from, to, width, height, options })</code>. <code>from</code> and <code>to</code> are the two screens, already loaded. Resolve the promise when the animation ends. A Phaser-style <code>goToScene(scene, key, data, options)</code> also works through a small adapter. Click the preview to set <code>originX</code> and <code>originY</code>.',
  },
  button: {
    tab: 'Button effects',
    title: 'Button effects',
    subtitle: 'Pick an effect, then tap the button to feel it.',
    codeTitle: 'Button code',
    runLabel: 'Run',
    kind: 'button',
    extras: 'label',
    presets: [
      { id: 'juice', label: 'Button Juice', code: buttons.juice.toString() },
      ...[['neon', 'Neon press'], ['hex', 'Hexagon burst'], ['energy', 'Energy charge'], ['glitch', 'Digital glitch'], ['shine', 'Shine sweep'], ['dissolve', 'Button dissolve']]
        .map(([id, label]) => ({ id, label, code: buttonPreset(id) })),
    ],
    engine: code => (usesPhaser(code) ? 'phaser' : ''),
    help: 'Write <code>function buttonEffect(button, options)</code>. <code>button</code> is a real HTML button. Return <code>{ stop() }</code> to clean up listeners and animations.',
  },
  animation: {
    tab: 'Animation lab',
    title: 'Animation lab',
    subtitle: 'Run canvas animations or standalone Phaser scenes.',
    codeTitle: 'Animation code',
    runLabel: 'Run',
    kind: 'animation',
    presets: [
      { id: 'confetti', label: 'Confetti (canvas)', code: animation.confetti.toString() },
      { id: 'orbit', label: 'Orbit (Phaser scene)', code: animation.phaserOrbit },
    ],
    engine: code => (usesPhaser(code) ? 'phaser' : ''),
    help: 'Write <code>animationEffect(canvas, options)</code> and return <code>{ stop() }</code>, or paste a Phaser scene class, <code>create()</code> function or complete <code>Phaser.Game</code> example. Phaser games are fitted to the preview at their authored size.',
  },
  shaders: {
    tab: '3D shaders',
    title: '3D shaders',
    subtitle: 'Shader materials and 3D scenes, rendered with Three.js.',
    codeTitle: 'Shader code',
    runLabel: 'Run',
    kind: 'shader',
    extras: 'geometry',
    presets: [
      { id: 'fire', label: 'Fire (shader material)', code: shaders.fire },
      { id: 'torus', label: 'Torus knot (animation)', code: shaders.torus.toString() },
    ],
    engine: () => 'three',
    noise: shaders.noiseGlsl,
    help: 'Write a material factory such as <code>createFireMaterial()</code>, <code>createAnimation({ THREE, renderer, scene, camera, options })</code> returning an update function, or a complete Three.js scene. Material previews get a mesh, a camera, <code>NOISE_GLSL</code> and an animated <code>time</code> uniform. Drag the preview to orbit.',
  },
  models: {
    tab: '3D models',
    title: '3D models',
    subtitle: 'Build a pickup effect for your model, then press Collect to play it.',
    codeTitle: 'Effect code',
    runLabel: 'Run',
    kind: 'model',
    extras: 'model',
    trigger: { label: 'Collect', every: 2.4 },
    presets: [
      { id: 'fly', label: 'Collect: fly to counter', code: models.flyToCounter.toString() },
      { id: 'pop', label: 'Collect: sparkle pop', code: models.sparklePop.toString() },
      { id: 'viewer', label: 'Model viewer', code: models.viewer.toString() },
    ],
    engine: () => '',
    help: 'Write <code>createEffect({ THREE, scene, camera, renderer, model, clone, animations, options })</code> and return <code>{ update(time, delta), play() }</code>. <code>play()</code> is the moment the item is collected: it runs when you press Collect, tap the model, or while Loop is on. <code>model</code> is your file, centred and scaled to fit a unit cube; <code>clone()</code> makes a lightweight copy; <code>animations</code> holds any clips in the file. A <code>.gltf</code> that uses separate <code>.bin</code> or texture files needs them chosen together. Drag the preview to orbit.',
  },
};
