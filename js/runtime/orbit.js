// Drag-to-orbit and scroll-to-zoom for any camera a Three.js renderer draws with. Works with the
// script build (window.THREE) and the module build alike, because THREE is passed in.
export function addOrbit(THREE, renderer) {
  let camera, saved, radius = 4, theta = 0, phi = Math.PI / 2, dirty = false, enabled = true;
  const target = new THREE.Vector3(0, 0, 0);
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  const bar = document.createElement('div');
  bar.className = 'orbit-controls';
  const toggle = document.createElement('button'), reset = document.createElement('button');
  toggle.textContent = 'Drag rotate: on';
  reset.textContent = 'Reset view';
  bar.append(toggle, reset);
  document.body.append(bar);

  const capture = cam => {
    camera = cam;
    saved = { position: cam.position.clone(), quaternion: cam.quaternion.clone(), zoom: cam.zoom };
    const offset = cam.position.clone().sub(target);
    radius = Math.max(0.1, offset.length());
    theta = Math.atan2(offset.x, offset.z);
    phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));
  };
  const render = renderer.render.bind(renderer);
  renderer.render = (scene, cam) => {
    if (cam !== camera) capture(cam);
    if (dirty && enabled) {
      cam.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
      cam.lookAt(target);
      cam.updateProjectionMatrix();
      dirty = false;
    }
    render(scene, cam);
  };
  toggle.onclick = () => {
    enabled = !enabled;
    toggle.textContent = 'Drag rotate: ' + (enabled ? 'on' : 'off');
    canvas.style.cursor = enabled ? 'grab' : 'default';
  };
  reset.onclick = () => {
    if (!camera || !saved) return;
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    camera.zoom = saved.zoom;
    camera.updateProjectionMatrix();
    capture(camera);
  };
  let pointer, lastX, lastY;
  canvas.addEventListener('pointerdown', event => {
    if (!enabled || event.button !== 0) return;
    pointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(pointer);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', event => {
    if (!enabled || event.pointerId !== pointer || !camera) return;
    theta -= (event.clientX - lastX) * 0.008;
    phi = Math.max(0.08, Math.min(Math.PI - 0.08, phi - (event.clientY - lastY) * 0.008));
    lastX = event.clientX;
    lastY = event.clientY;
    dirty = true;
  });
  const release = () => { pointer = undefined; canvas.style.cursor = enabled ? 'grab' : 'default'; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', event => {
    if (!enabled || !camera) return;
    event.preventDefault();
    if (camera.isOrthographicCamera) camera.zoom = Math.max(0.1, Math.min(20, camera.zoom * Math.exp(-event.deltaY * 0.001)));
    else radius = Math.max(0.3, Math.min(50, radius * Math.exp(event.deltaY * 0.001)));
    dirty = true;
  }, { passive: false });
}
