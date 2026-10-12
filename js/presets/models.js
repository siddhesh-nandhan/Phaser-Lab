// Starting code for 3D models: pickup effects, like collecting a coin in a runner game.
// Each preset is createEffect({ THREE, scene, camera, renderer, model, clone, animations, options })
// and returns { update(time, delta), play() }. play() is the moment the player collects the item:
// it runs from the Collect button, a tap on the preview, or the Loop toggle.
// `model` is the loaded file, centred and scaled to fit a unit cube.

export const flyToCounter = function createEffect({ THREE, scene, camera, model, options }) {
  const {
    spin = 2.2,           // idle turns per second
    bob = 0.08,           // idle float height
    pop = 1.45,           // how big the coin swells when collected
    popTime = 0.14,       // seconds
    flyTime = 0.55,       // seconds to reach the counter
    arc = 1.1,            // how high the path curves
    sparkles = 26,
    sparkleColor = '#ffe27a',
    respawn = 0.6,        // seconds before the next coin appears
  } = options;

  camera.position.set(0, 0.3, 4.2);
  camera.lookAt(0, 0, 0);
  scene.add(model);
  const size = model.scale.x;

  // The coin counter the coin flies into, like a runner game's HUD.
  const counter = document.createElement('div');
  counter.style.cssText = 'position:fixed;top:14px;left:14px;display:flex;align-items:center;gap:8px;padding:7px 14px 7px 9px;border-radius:100px;background:rgba(0,0,0,.55);color:#fff;font:700 18px system-ui;transform-origin:left center';
  counter.innerHTML = '<span style="width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff4b8,#e3a800 60%,#9c6400)"></span><span>0</span>';
  document.body.append(counter);
  let coins = 0;

  // A soft four-point star, drawn once and used for every sparkle.
  const star = document.createElement('canvas');
  star.width = star.height = 64;
  const g = star.getContext('2d');
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.25, 'rgba(255,255,255,.5)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 4 : 30, a = i * Math.PI / 4;
    g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  g.fill();
  const sparkleTexture = new THREE.CanvasTexture(star);
  const particles = [];

  function burst(at, count, speed) {
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTexture, color: sparkleColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sprite.position.copy(at);
      const direction = new THREE.Vector3().randomDirection();
      sprite.userData = { velocity: direction.multiplyScalar(speed * (0.5 + Math.random())), life: 0.5 + Math.random() * 0.4, age: 0, size: 0.22 + Math.random() * 0.22 };
      scene.add(sprite);
      particles.push(sprite);
    }
    // A quick glow behind the burst.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTexture, color: sparkleColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.position.copy(at);
    halo.userData = { velocity: new THREE.Vector3(), life: 0.35, age: 0, size: 2, halo: true };
    scene.add(halo);
    particles.push(halo);
  }

  // Where the counter is, as a point in the 3D scene in front of the camera.
  function counterPoint() {
    const box = counter.getBoundingClientRect();
    const ndc = new THREE.Vector3(((box.left + 20) / innerWidth) * 2 - 1, -((box.top + box.height / 2) / innerHeight) * 2 + 1, 0.5);
    const direction = ndc.unproject(camera).sub(camera.position).normalize();
    return camera.position.clone().addScaledVector(direction, 2.2);
  }

  const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  let state = 'idle', since = 0, now = 0, from, control, to;

  return {
    play() {
      if (state !== 'idle') return;
      state = 'pop';
      since = now;
      burst(model.position, sparkles, 2.2);
    },
    update(time, delta) {
      now = time;
      const t = time - since;
      if (state === 'idle') {
        model.rotation.y += spin * Math.PI * 2 * delta / 4;
        model.position.y = Math.sin(time * 2) * bob;
      } else if (state === 'pop') {
        model.scale.setScalar(size * (1 + (pop - 1) * easeOutBack(Math.min(t / popTime, 1))));
        model.rotation.y += 12 * delta;
        if (t >= popTime) {
          state = 'fly';
          since = time;
          from = model.position.clone();
          to = counterPoint();
          control = from.clone().lerp(to, 0.35).add(new THREE.Vector3(-0.4, arc, 0.6));
        }
      } else if (state === 'fly') {
        const k = Math.min(t / flyTime, 1), e = k * k; // speeds up into the counter
        model.position.copy(from).multiplyScalar((1 - e) * (1 - e)).addScaledVector(control, 2 * (1 - e) * e).addScaledVector(to, e * e);
        model.scale.setScalar(size * pop * (1 - 0.75 * e));
        model.rotation.y += 22 * delta;
        if (k >= 1) {
          state = 'gone';
          since = time;
          model.visible = false;
          burst(to, 8, 0.6);
          coins++;
          counter.lastChild.textContent = coins;
          counter.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
        }
      } else if (state === 'gone') {
        if (t >= respawn) {
          state = 'spawn';
          since = time;
          model.position.set(0, 0, 0);
          model.scale.setScalar(0.001);
          model.visible = true;
        }
      } else if (state === 'spawn') {
        const k = Math.min(t / 0.35, 1);
        model.scale.setScalar(size * Math.max(0.001, easeOutBack(k)));
        model.rotation.y += spin * Math.PI * 2 * delta / 4;
        if (k >= 1) state = 'idle';
      }

      // Sparkles drift out, slow down, shrink and fade.
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i], d = p.userData;
        d.age += delta;
        const k = d.age / d.life;
        if (k >= 1) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); continue; }
        p.position.addScaledVector(d.velocity, delta);
        d.velocity.multiplyScalar(1 - 3 * delta);
        p.material.opacity = 1 - k;
        p.scale.setScalar(d.halo ? d.size * (0.4 + k) : d.size * (1 - k * 0.6));
      }
    },
  };
};

export const sparklePop = function createEffect({ THREE, scene, camera, model, options }) {
  const { spin = 2.2, pop = 1.6, flash = 2.5, sparkles = 40, sparkleColor = '#fff1a8', vanish = 0.32, respawn = 0.7 } = options;
  camera.position.set(0, 0.3, 4.2);
  camera.lookAt(0, 0, 0);
  scene.add(model);
  const size = model.scale.x;

  // Each mesh gets its own material copy, so the flash only lights this coin.
  const materials = [];
  model.traverse(node => {
    if (node.isMesh) {
      node.material = node.material.clone();
      if (node.material.emissive) materials.push(node.material);
    }
  });
  const setFlash = amount => {
    for (const m of materials) { m.emissive.setRGB(1, 0.85, 0.4); m.emissiveIntensity = amount; }
  };

  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d');
  const glow = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(dot);
  const particles = [];

  let state = 'idle', since = 0, now = 0;
  return {
    play() {
      if (state !== 'idle') return;
      state = 'pop';
      since = now;
      // A ring of sparkles flying out around the coin.
      for (let i = 0; i < sparkles; i++) {
        const angle = (i / sparkles) * Math.PI * 2;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: sparkleColor, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        sprite.position.copy(model.position);
        sprite.userData = { velocity: new THREE.Vector3(Math.cos(angle), Math.sin(angle), (Math.random() - 0.5) * 0.6).multiplyScalar(1.4 + Math.random() * 1.2), age: 0, life: 0.5 + Math.random() * 0.3 };
        scene.add(sprite);
        particles.push(sprite);
      }
    },
    update(time, delta) {
      now = time;
      const t = time - since;
      if (state === 'idle') {
        model.rotation.y += spin * Math.PI * 2 * delta / 4;
      } else if (state === 'pop') {
        const k = Math.min(t / vanish, 1);
        // Swell, flash and spin fast, then shrink to nothing.
        const grow = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
        model.scale.setScalar(size * Math.max(0.001, k < 0.35 ? 1 + (pop - 1) * grow : pop * grow));
        model.rotation.y += 26 * delta;
        setFlash(flash * (1 - k));
        if (k >= 1) { state = 'gone'; since = time; model.visible = false; setFlash(0); }
      } else if (state === 'gone' && t >= respawn) {
        state = 'spawn';
        since = time;
        model.visible = true;
      } else if (state === 'spawn') {
        const k = Math.min(t / 0.3, 1);
        model.scale.setScalar(size * Math.max(0.001, 1 - Math.pow(1 - k, 3)));
        model.rotation.y += spin * Math.PI * 2 * delta / 4;
        if (k >= 1) state = 'idle';
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i], d = p.userData;
        d.age += delta;
        const k = d.age / d.life;
        if (k >= 1) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); continue; }
        p.position.addScaledVector(d.velocity, delta);
        d.velocity.multiplyScalar(1 - 2.5 * delta);
        p.material.opacity = 1 - k;
        p.scale.setScalar(0.26 * (1 - k * 0.5));
      }
    },
  };
};

export const viewer = function createEffect({ THREE, scene, model, animations, options }) {
  const { spin = 0.6, tilt = 0.2 } = options;
  scene.add(model);
  model.rotation.x = tilt;
  // Play any animations the file contains.
  const mixer = animations.length ? new THREE.AnimationMixer(model) : null;
  for (const clip of animations) mixer.clipAction(clip).play();
  let flip = 0;
  return {
    play() { flip = Math.PI * 2; }, // Collect does a quick flip, to check the model from every side
    update(time, delta) {
      mixer?.update(delta);
      const extra = Math.min(flip, delta * 12);
      flip -= extra;
      model.rotation.y += spin * delta + extra;
    },
  };
};
