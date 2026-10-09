# Transition Lab

Open http://127.0.0.1:8765 while the local server is running. To restart later, double-click Start.command. Keep its terminal window open. You can also open index.html directly in a browser; the tester does not require a server or internet connection.

1. Choose a current screenshot and a next screenshot.
2. Pick a preset or paste your code into the editor.
3. Set duration, gradient colors, hexagon size and origin. Click the preview to place the origin.
4. Press Play transition. Reset stops playback and restores the current screenshot.

Images stay in memory in your browser. Refreshing clears uploads and edits. The next image is stretched to match the current screenshot's aspect ratio; matching screenshot dimensions give the best result. Very large images are previewed at a maximum dimension of 1280 pixels.

## Code interface

Define an async function named `transition` with one argument:

```js
async function transition({canvas, ctx, from, to, width, height, options}) {
  ctx.drawImage(to, 0, 0, width, height);
}
```

`from` and `to` are loaded Image objects. `options` contains `duration` in milliseconds, `origin: {x,y}` normalized from 0 to 1, `hexSize`, and two `colors`. Return a promise that resolves when the animation finishes.

Alternatively paste `export function goToScene(scene,key,data,options)`. The lightweight adapter provides `scene.game.canvas`, scene switching, `scene.game.events` with on/once/off, POST_RENDER and DESTROY constants, and the screenshot/slide helpers used in the conversation. iOS is simulated as false. It does not implement the full Phaser engine or load PhaserFX. Imports, custom shaders and other game-specific dependencies need a separate integration.

Every run replaces the isolated preview frame. Pasted code can manipulate that frame's page and canvas, but it does not have access to the surrounding editor. Network requests from the frame are blocked. Reset restarts the frame. Synchronous infinite loops in pasted code can still freeze a browser tab; this is not a general-purpose untrusted-code runtime.
