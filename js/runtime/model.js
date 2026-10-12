// 3D models inside the preview: load a GLB, glTF or FBX file, light it, and hand it to the pasted
// createEffect({ THREE, scene, camera, renderer, model, clone, animations, options }), which returns
// { update(time, delta), play() }. play() fires the effect: from the page's trigger button, a tap on
// the preview, or the loop timer.
// Three.js and its loaders are modules, imported only when this tab runs.
import { report, compile, startHeartbeat } from './runtime.js';
import { addOrbit } from './orbit.js';

const VENDOR = '../../vendor/three-r160/';

// Several files can be chosen together (a .gltf with its .bin and textures); the loader finds each
// referenced file by name.
async function loadModel(THREE, files, { GLTFLoader, FBXLoader }) {
  const main = files.find(file => /\.(glb|gltf|fbx)$/i.test(file.name));
  if (!main) throw Error('Choose a .glb, .gltf or .fbx file.');
  const byName = new Map(files.map(file => [file.name.toLowerCase(), file.url]));
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    const name = decodeURIComponent(url.split(/[\\/]/).pop().split('?')[0]).toLowerCase();
    return byName.get(name) ?? url;
  });
  try {
    if (/\.fbx$/i.test(main.name)) {
      const object = await new FBXLoader(manager).loadAsync(main.url);
      return { object, animations: object.animations || [], name: main.name };
    }
    const gltf = await new GLTFLoader(manager).loadAsync(main.url);
    return { object: gltf.scene, animations: gltf.animations || [], name: main.name };
  } catch (error) {
    throw Error(main.name + ' could not be loaded. ' + (error?.message || 'If it is a .gltf, choose its .bin and texture files together with it.'));
  }
}

// A soft studio environment, so metallic and glossy materials have something to reflect.
function studioLight(THREE, renderer, scene) {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, side: THREE.BackSide })));
  for (const [x, y, z, w, h, strength] of [[0, 9, 0, 14, 14, 3], [-10, 2, 4, 6, 10, 1.6], [10, 3, -4, 6, 10, 1.2], [0, 1, 10, 10, 6, 0.8]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(strength, strength, strength), side: THREE.DoubleSide }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x303040, 0.6));
}

export async function runModel({ code, options, model: files, loop = 0 }) {
  const [THREE, { GLTFLoader }, { FBXLoader }, { clone: cloneSkinned }] = await Promise.all([
    import(VENDOR + 'build/three.module.min.js'),
    import(VENDOR + 'examples/jsm/loaders/GLTFLoader.js'),
    import(VENDOR + 'examples/jsm/loaders/FBXLoader.js'),
    import(VENDOR + 'examples/jsm/utils/SkeletonUtils.js'),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 0.35, 3);
  camera.lookAt(0, 0, 0);
  studioLight(THREE, renderer, scene);
  addOrbit(THREE, renderer);

  // Centre the model and scale it to fit a unit cube, whatever units the file uses.
  const loaded = await loadModel(THREE, files, { GLTFLoader, FBXLoader });
  const box = new THREE.Box3().setFromObject(loaded.object);
  const size = box.getSize(new THREE.Vector3());
  loaded.object.position.sub(box.getCenter(new THREE.Vector3()));
  const model = new THREE.Group();
  model.name = loaded.name;
  model.add(loaded.object);
  model.scale.setScalar(1 / (Math.max(size.x, size.y, size.z) || 1));
  const clone = () => cloneSkinned(model);

  const { createEffect } = compile(code, ['THREE'], ['createEffect'])(THREE);
  if (!createEffect) throw Error('Define createEffect({ THREE, scene, camera, renderer, model, clone, animations, options }).');
  const api = createEffect({ THREE, scene, camera, renderer, model, clone, animations: loaded.animations, options });
  const update = typeof api === 'function' ? api : api?.update;
  const play = api?.play || api?.trigger;

  // Fire the effect now, and again every `loopEvery` seconds while looping.
  let loopEvery = loop, lastPlay = -Infinity, time = 0;
  const trigger = () => { lastPlay = time; play?.(); };

  // A tap (not a drag to orbit) on the preview fires the effect, like the player touching the coin.
  let down = null;
  renderer.domElement.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY, at: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6 && performance.now() - down.at < 400) trigger();
    down = null;
  });

  let frame, stopped = false;
  const started = performance.now();
  let last = started;
  const draw = now => {
    if (stopped) return;
    time = (now - started) / 1000;
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (play && loopEvery > 0 && time - lastPlay >= loopEvery && time > 0.8) trigger();
    update?.(time, delta);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  let triangles = 0;
  model.traverse(node => { if (node.isMesh) triangles += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3; });
  startHeartbeat();
  report('running', (play ? 'Ready · tap the model or press Collect' : 'Running') + ' · ' + loaded.name, { live: true, size: Math.round(triangles).toLocaleString() + ' triangles' });
  return {
    trigger,
    setLoop(every) { loopEvery = every; lastPlay = time; },
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
      api?.stop?.();
      renderer.dispose();
    },
  };
}
