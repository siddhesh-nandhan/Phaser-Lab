// Starting code for 3D shaders: a shader material and an animated scene.

// Noise helpers available to shader code as NOISE_GLSL.
export const noiseGlsl = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}`;

export const fire = 'function createFireMaterial() {\n  return new THREE.ShaderMaterial({\n    uniforms: { time: { value: 0 }, strength: { value: 1 } },\n    transparent: true, depthWrite: false, side: THREE.DoubleSide,\n    forceSinglePass: true, toneMapped: false, blending: THREE.NormalBlending,\n    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,\n    fragmentShader: `\n      uniform float time, strength; varying vec2 vUv;\n      ${NOISE_GLSL}\n      void main(){\n        float h=vUv.y,u=(vUv.x-.5)*2.;\n        float warp=(noise(vec2(u*2.+8.,h*3.-time*1.8))-.5)*(.12+h*.55);\n        float x=u+warp;\n        float broad=noise(vec2(x*3.5+15.,h*4.-time*2.5));\n        float fine=noise(vec2(x*8.+30.,h*9.-time*4.));\n        float plume=exp(-pow(x/.38,2.))*.35;\n        float density=1.-pow(abs(x)/.94,2.)-h*1.15+(broad*.72+fine*.28-.5)*.85+plume-.16;\n        float alpha=smoothstep(.015,.29,density)*(1.-smoothstep(.78,1.,abs(u)))*(1.-smoothstep(.8,1.,h))*smoothstep(0.,.055,h);\n        float heat=clamp(density*.78+(1.-h)*.18,0.,1.);\n        vec3 color=heat<.38?mix(vec3(.67,.086,.02),vec3(1.,.32,.02),heat/.38):heat<.78?mix(vec3(1.,.32,.02),vec3(1.,.78,.14),(heat-.38)/.4):mix(vec3(1.,.78,.14),vec3(1.,.96,.7),(heat-.78)/.22);\n        gl_FragColor=vec4(color,alpha*strength*.94);\n      }`\n  });\n}';

export const torus = function createAnimation({ THREE, scene, camera, options }) {
  const { speed = 1, color = '#8f6dff', thickness = 0.28 } = options;
  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.8, thickness, 180, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 })
  );
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(2, 3, 4);
  scene.add(mesh, light, new THREE.AmbientLight(0xffffff, 0.5));
  camera.position.z = 3.6;
  return time => {
    mesh.rotation.x = time * 0.4 * speed;
    mesh.rotation.y = time * 0.7 * speed;
  };
};
