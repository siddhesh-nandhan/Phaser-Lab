# Phaser Lab

A browser workbench for game UI effects. Pick a preset or write your own code on the left, watch it run on the right, tune the settings on top.

**Try it: https://siddhesh-nandhan.github.io/phaserlab/**

- **Screen transitions**: two screenshots and a `transition()` function (hexagon dissolve, crossfade, slide), or a Phaser-style `goToScene`. Click the preview to move the origin.
- **Button effects**: a real HTML button with seven press effects.
- **Animation lab**: canvas animations or standalone Phaser scenes.
- **3D shaders**: Three.js shader materials, animations or complete scenes, with drag-to-orbit.
- **3D models**: load a `.glb`, `.gltf` or `.fbx` model and build a pickup effect for it, like collecting a coin in a runner game. Press **Collect** (or tap the model) to play the effect, or turn on **Loop** to replay it while you tune it. Presets: fly to the coin counter, sparkle pop, and a plain model viewer. A sample coin is included.

Settings come from the code: give a value a default (`const { speed = 1 } = options;`, a shader uniform, a Phaser `config` value) and it appears as a control. Colours get a colour picker. Changing a setting re-runs the preview; **Cmd/Ctrl+Enter** runs edited code. Your code, preset and settings for each tool are saved in your browser.

## Run it locally

Double-click `Start.command`, or:

```
python3 serve.py --open
```

The app opens at http://127.0.0.1:8765 (or the next free port). The server sends the same headers as production and disables caching, so edits show on reload. The app uses JavaScript modules, so it needs a server; opening `index.html` from disk does not work.

## Hosting

The live site is served by **GitHub Pages** from the `main` branch (repository root) at https://siddhesh-nandhan.github.io/phaserlab/. Every push to `main` updates it within a few minutes. `.nojekyll` makes Pages serve the files as they are, and the security policy is set with a `<meta>` tag in `index.html` and `preview.html`, because Pages cannot send custom headers.

It also deploys to **Vercel** unchanged: a static site with no build step (framework preset **Other**, no build command, output directory = project root). There, `vercel.json` sends the same policy as headers, adds the remaining security headers and caches the versioned engine files for a year. `.vercelignore` keeps the local server out of the deployment.

## How it works

```
index.html            the workbench: settings bar, code editor, preview
preview.html          the page each preview runs in
css/app.css           the app        css/preview.css   inside a preview
js/main.js            tabs, presets, settings, saving, running
js/tools.js           the five tools, described as data
js/settings.js        reads settings from code and draws the controls
js/preview.js         starts previews and watches their heartbeat
js/store.js           saved work (localStorage)
js/samples.js         the two sample screenshots
js/presets/*.js       starting code for each tool
js/runtime/*.js       code that runs inside a preview: transitions, buttons, canvas, Phaser, Three.js, 3D models
assets/models/        the sample coin model
vendor/               Phaser 3.90.0, Three.js r160 and its glTF/FBX loaders (see vendor/LICENSES.md)
serve.py              local server that mirrors vercel.json
```

Every run gets a fresh `preview.html` frame on the same site. The frame loads the engine it needs, receives the code, runs it and reports back. While a preview animates it sends a heartbeat with its real frame rate, shown next to the status. If a preview stops drawing while the page is visible, it restarts once and then says so. Browsers pause drawing in background tabs and some embedded browser views; the frame rate shows when that is happening.

Pasted code runs in the same origin as the app, like a code playground: it is meant for your own code. A synchronous infinite loop can freeze the tab. Uploaded screenshots and models stay in memory and are never sent anywhere.

## Dependencies

| Library | Version | Notes |
|---|---|---|
| Phaser | 3.90.0 | Latest 3.x. Phaser 4 changes the API. |
| Three.js | r160 | The last release with a single-file build (global `THREE`), used by 3D shaders. 3D models uses the module build of the same release in `vendor/three-r160/`, with `GLTFLoader`, `FBXLoader` and their helpers. |

No npm packages or build tools.
