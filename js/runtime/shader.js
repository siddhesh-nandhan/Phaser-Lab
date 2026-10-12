// 3D shaders inside the preview. Accepts a material factory (createFireMaterial(), or any
// create…Material()), a `material`, createAnimation({ THREE, renderer, scene, camera, options }), or a
// complete Three.js scene that makes its own renderer. Every renderer gets drag-to-orbit controls.
import { report, compile, startHeartbeat } from './runtime.js';
import { addOrbit } from './orbit.js';

export function runShader({ code, options, geometry = 'auto', noise }) {
  const Engine = window.THREE;
  if (!Engine) throw Error('Three.js could not load.');
  const renderers = [];
  // A THREE whose renderers fill the preview, report shader errors and get orbit controls.
  const THREE = Object.create(Engine);
  THREE.WebGLRenderer = class extends Engine.WebGLRenderer {
    constructor(config = {}) {
      super({ antialias: true, alpha: true, ...config });
      renderers.push(this);
      this.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.setSize(innerWidth, innerHeight);
      this.debug.onShaderError = (gl, program, vertex, fragment) => report('error', 'Shader error: '
        + [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment)].filter(Boolean).join(' '));
      addOrbit(Engine, this);
    }
  };

  const factoryName = code.match(/\bfunction\s+(create\w*Material)\s*\(/)?.[1];
  const prelude = /\b(?:const|let|var)\s+NOISE_GLSL\b/.test(code) ? '' : 'const NOISE_GLSL = ' + JSON.stringify(noise) + ';\n';
  const result = compile(prelude + code, ['THREE', 'options'], [factoryName || 'createMaterial', 'material', 'createAnimation'].filter(Boolean))(THREE, options);
  const factory = result[factoryName || 'createMaterial'];

  let frame, stopped = false, api, description;
  if (renderers.length && !result.createAnimation) {
    // A complete scene: it owns its renderer and loop.
    for (const renderer of renderers) if (!renderer.domElement.parentNode) document.body.append(renderer.domElement);
    description = 'complete scene';
  } else {
    const renderer = renderers[0] || new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000, 0);
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
    camera.position.z = 4;
    let material;
    if (result.createAnimation) {
      api = result.createAnimation({ THREE, renderer, scene, camera, options });
      description = 'animation';
    } else {
      material = factory ? factory() : result.material;
      if (!material?.isMaterial) throw Error('Define createFireMaterial() (or another create…Material()), a material, or createAnimation(...).');
      for (const [key, value] of Object.entries(options)) if (material.uniforms?.[key]) material.uniforms[key].value = value;
      // Volume shaders need a box with bounds [-0.5, 0.5]; surface shaders get a plane.
      const shaderText = (material.vertexShader || '') + '\n' + (material.fragmentShader || '');
      const looksVolumetric = material.side === THREE.BackSide || /raymarch|rayDirection|rayDir|intersectBox|hitBox|vPosition|vLocalPosition|vWorldPosition/i.test(shaderText);
      const shape = geometry === 'box' || (geometry === 'auto' && looksVolumetric) ? 'box' : 'plane';
      if (shape === 'plane' && material.side === THREE.BackSide) { material.side = THREE.DoubleSide; material.needsUpdate = true; }
      scene.add(new THREE.Mesh(shape === 'box' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.PlaneGeometry(1.8, 2.6), material));
      if (shape === 'box') camera.position.z = 2.2;
      description = 'material on a ' + shape;
    }
    const started = performance.now();
    let last = started;
    const draw = now => {
      if (stopped) return;
      const elapsed = (now - started) / 1000, delta = (now - last) / 1000;
      last = now;
      if (material?.uniforms?.time) material.uniforms.time.value = elapsed;
      const update = typeof api === 'function' ? api : api?.update;
      update?.(elapsed, delta);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    addEventListener('resize', () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    });
  }
  startHeartbeat();
  report('running', 'Running Three.js · ' + description, { live: true });
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    api?.stop?.();
    for (const renderer of renderers) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
    }
  };
}
