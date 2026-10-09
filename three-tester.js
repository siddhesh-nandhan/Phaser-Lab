const FIRE_NOISE_GLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}`;
const defaultThreeCode='function createFireMaterial() {\n  return new THREE.ShaderMaterial({\n    uniforms: { time: { value: 0 }, strength: { value: 1 } },\n    transparent: true, depthWrite: false, side: THREE.DoubleSide,\n    forceSinglePass: true, toneMapped: false, blending: THREE.NormalBlending,\n    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,\n    fragmentShader: `\n      uniform float time, strength; varying vec2 vUv;\n      ${NOISE_GLSL}\n      void main(){\n        float h=vUv.y,u=(vUv.x-.5)*2.;\n        float warp=(noise(vec2(u*2.+8.,h*3.-time*1.8))-.5)*(.12+h*.55);\n        float x=u+warp;\n        float broad=noise(vec2(x*3.5+15.,h*4.-time*2.5));\n        float fine=noise(vec2(x*8.+30.,h*9.-time*4.));\n        float plume=exp(-pow(x/.38,2.))*.35;\n        float density=1.-pow(abs(x)/.94,2.)-h*1.15+(broad*.72+fine*.28-.5)*.85+plume-.16;\n        float alpha=smoothstep(.015,.29,density)*(1.-smoothstep(.78,1.,abs(u)))*(1.-smoothstep(.8,1.,h))*smoothstep(0.,.055,h);\n        float heat=clamp(density*.78+(1.-h)*.18,0.,1.);\n        vec3 color=heat<.38?mix(vec3(.67,.086,.02),vec3(1.,.32,.02),heat/.38):heat<.78?mix(vec3(1.,.32,.02),vec3(1.,.78,.14),(heat-.38)/.4):mix(vec3(1.,.78,.14),vec3(1.,.96,.7),(heat-.78)/.22);\n        gl_FragColor=vec4(color,alpha*strength*.94);\n      }`\n  });\n}';
// Match the animation workspace while keeping editors and settings independent.
const threePanel=$('confettiPanel').cloneNode(true);
threePanel.id='threePanel';threePanel.hidden=true;
const threeIds={confettiCode:'threeCode',confettiPreview:'threePreview',confettiStatus:'threeStatus',startConfetti:'startThree',stopConfetti:'stopThree',resetConfetti:'resetThree',animationEditor:'threeEditor',animationControls:'threeControls',animationControlNotice:'threeControlNotice'};
for(const el of threePanel.querySelectorAll('[id]'))el.id=threeIds[el.id]||('three-'+el.id);
$('confettiPanel').after(threePanel);
$('threeControls').replaceChildren();$('threeCode').value=defaultThreeCode;
$('threeEditor').querySelector('h2').textContent='Three.js code';
$('threeEditor').querySelector('.hint').textContent='Paste a material factory, createAnimation({ THREE, renderer, scene, camera, options }), or complete Three.js scene. Material snippets get a plane, camera, noise helper and animated time automatically.';
threePanel.querySelector('.workspace h1').textContent='Three.js preview';
threePanel.querySelector('.workspace>p').textContent='Shader materials and 3D animation scenes.';
$('threePreview').title='Three.js animation preview';$('threeCode').setAttribute('aria-label','Three.js JavaScript');
$('resetThree').textContent='Load fire example';
const threeTab=document.createElement('button');threeTab.id='threeTab';threeTab.textContent='Three.js';threeTab.setAttribute('aria-pressed','false');$('confettiTab').after(threeTab);
let threeFields=[],threeRunId=0;let threeGeometry='auto';
function threeSettings(){
  const previous=Object.fromEntries(threeFields.map(f=>[f.key,f.input.value]));threeFields=[];$('threeControls').replaceChildren();
  const title=document.createElement('h2');title.textContent='Animation controls';$('threeControls').append(title);
  const geometryLabel=document.createElement('label');geometryLabel.textContent='Preview geometry';
  const geometrySelect=document.createElement('select');geometrySelect.id='threeGeometry';
  for(const [value,text] of [['auto','Auto · match shader'],['plane','Plane · UV shader'],['box','Unit box · volume shader']]){const option=document.createElement('option');option.value=value;option.textContent=text;geometrySelect.append(option);}
  geometrySelect.value=threeGeometry;geometrySelect.onchange=()=>{threeGeometry=geometrySelect.value;};geometryLabel.append(geometrySelect);$('threeControls').append(geometryLabel);
  const detected=new Map();const code=$('threeCode').value;
  for(const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*\{\s*value\s*:\s*(-?\d+(?:\.\d+)?)\s*\}/g))if(m[1]!=='time')detected.set(m[1],Number(m[2]));
  for(const m of code.matchAll(/\boptions\.([A-Za-z_$][\w$]*)(?:\s*\?\?\s*(-?\d+(?:\.\d+)?))?/g))detected.set(m[1],Number(m[2]??1));
  for(const m of code.matchAll(/(?:const|let)\s*\{([^{}]*)\}\s*=\s*options/g))for(const item of m[1].split(',')){const entry=item.trim().match(/^([\w$]+)(?:\s*=\s*(-?\d+(?:\.\d+)?))?$/);if(entry)detected.set(entry[1],Number(entry[2]??1));}
  const notice=document.createElement('p');notice.id='threeControlNotice';notice.className='hint';notice.textContent=detected.size?'Uniforms and options detected. Adjust values, then Run code.':'No settings detected. Run and Stop are available.';$('threeControls').append(notice);
  for(const [key,value]of detected){if(['__proto__','constructor','prototype'].includes(key))continue;const label=document.createElement('label');label.textContent=key;const input=document.createElement('input');input.type='number';input.step='any';input.value=previous[key]??(key==='strength'&&value===0?1:value);input.setAttribute('aria-label',key);label.append(input);$('threeControls').append(label);threeFields.push({key,input});}
}
function threeRunner(payload){
  const report=(type,message)=>parent.postMessage({threeRunId:payload.id,type,message},'*');
  addEventListener('error',e=>report('error',e.message));addEventListener('unhandledrejection',e=>report('error',String(e.reason)));
  let frame,renderers=[],api,stopped=false;
  try{
    if(!window.THREE)throw Error('Three.js did not load. Open the local server URL.');
    function addOrbit(renderer) {
      let camera, saved, radius=4, theta=0, phi=Math.PI/2, dirty=false, enabled=true;
      const target=new window.THREE.Vector3(0,0,0);
      const canvas=renderer.domElement;
      canvas.style.touchAction='none';canvas.style.cursor='grab';
      const bar=document.createElement('div');bar.style.cssText='position:fixed;top:10px;right:10px;z-index:20;display:flex;gap:6px;font:12px system-ui';
      const toggle=document.createElement('button'),reset=document.createElement('button');
      toggle.textContent='Drag rotate: on';reset.textContent='Reset view';
      for(const b of [toggle,reset])b.style.cssText='background:#111827cc;color:white;border:1px solid #ffffff44;border-radius:6px;padding:7px;cursor:pointer';
      bar.append(toggle,reset);document.body.append(bar);
      function capture(cam){camera=cam;saved={position:cam.position.clone(),quaternion:cam.quaternion.clone(),zoom:cam.zoom};const offset=cam.position.clone().sub(target);radius=Math.max(.1,offset.length());theta=Math.atan2(offset.x,offset.z);phi=Math.acos(Math.max(-1,Math.min(1,offset.y/radius)));}
      const render=renderer.render.bind(renderer);
      renderer.render=function(scene,cam){
        if(cam!==camera)capture(cam);
        if(dirty&&enabled){cam.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));cam.lookAt(target);cam.updateProjectionMatrix();dirty=false;}
        render(scene,cam);
      };
      toggle.onclick=()=>{enabled=!enabled;toggle.textContent='Drag rotate: '+(enabled?'on':'off');canvas.style.cursor=enabled?'grab':'default';};
      reset.onclick=()=>{if(!camera||!saved)return;camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.zoom=saved.zoom;camera.updateProjectionMatrix();const offset=camera.position.clone().sub(target);radius=offset.length();theta=Math.atan2(offset.x,offset.z);phi=Math.acos(offset.y/radius);dirty=false;};
      let pointer,lastX,lastY;
      canvas.addEventListener('pointerdown',e=>{if(!enabled||e.button!==0)return;pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(pointer);canvas.style.cursor='grabbing';});
      canvas.addEventListener('pointermove',e=>{if(!enabled||e.pointerId!==pointer||!camera)return;theta-=(e.clientX-lastX)*.008;phi=Math.max(.08,Math.min(Math.PI-.08,phi-(e.clientY-lastY)*.008));lastX=e.clientX;lastY=e.clientY;dirty=true;});
      const release=()=>{pointer=undefined;canvas.style.cursor=enabled?'grab':'default';};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
      canvas.addEventListener('wheel',e=>{if(!enabled||!camera)return;e.preventDefault();if(camera.isOrthographicCamera){camera.zoom=Math.max(.1,Math.min(20,camera.zoom*Math.exp(-e.deltaY*.001)));}else radius=Math.max(.3,Math.min(50,radius*Math.exp(e.deltaY*.001)));dirty=true;},{passive:false});
    }
    const engine=window.THREE,THREE=Object.create(engine);
    THREE.WebGLRenderer=class extends engine.WebGLRenderer{constructor(config={}){super(config);renderers.push(this);this.setPixelRatio(Math.min(devicePixelRatio,2));this.setSize(innerWidth,innerHeight);this.debug.onShaderError=(gl,program,vertex,fragment)=>report('error','Shader error: '+[gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join(' '));addOrbit(this);}};
    const code=payload.code.replace(/\bexport\s+default\s+/g,'').replace(/\bexport\s+(?=(?:function|const|let|class|async)\b)/g,'');
    const factory=code.match(/\bfunction\s+(create\w*Material)\s*\(/)?.[1];
    const noise=/\b(?:const|let|var)\s+NOISE_GLSL\b/.test(code)?'':'const NOISE_GLSL='+JSON.stringify(payload.noise)+';\n';
    const result=new Function('THREE','options',noise+code+'\nreturn {factory:'+(factory?'typeof '+factory+'==="function"?'+factory+':null':'null')+',material:typeof material!=="undefined"?material:null,create:typeof createAnimation==="function"?createAnimation:null};')(THREE,payload.options);
    if(renderers.length&&!result.create){for(const renderer of renderers)if(!renderer.domElement.parentNode)document.body.append(renderer.domElement);report('ready','Running complete Three.js scene · your code controls its loop');}
    else{
      const renderer=renderers[0]||new THREE.WebGLRenderer({antialias:true,alpha:true});document.body.append(renderer.domElement);renderer.setClearColor(0x11151e,1);
      const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);camera.position.z=4;
      let material;
      if(result.create){api=result.create({THREE,renderer,scene,camera,options:payload.options});}
      else{
        material=result.factory?result.factory():result.material;
        if(!material?.isMaterial)throw Error('Define createFireMaterial(), another create…Material() function, material, or createAnimation(...).');
        for(const [key,value] of Object.entries(payload.options))if(material.uniforms?.[key])material.uniforms[key].value=value;
        if(material.uniforms?.strength&&material.uniforms.strength.value===0&&!Object.hasOwn(payload.options,'strength'))material.uniforms.strength.value=1;
        const shaderText=(material.vertexShader||'')+'\n'+(material.fragmentShader||'');
        const volumeHint=material.side===THREE.BackSide||/raymarch|rayMarch|rayDirection|rayDir|intersectBox|hitBox|vPosition|vLocalPosition|vWorldPosition/i.test(shaderText);
        const geometryMode=payload.geometry==='box'||(payload.geometry==='auto'&&volumeHint)?'box':'plane';
        // Volume shaders commonly require local bounds [-0.5, 0.5].
        const geometry=geometryMode==='box'?new THREE.BoxGeometry(1,1,1):new THREE.PlaneGeometry(1.8,2.6);
        if(geometryMode==='plane'&&material.side===THREE.BackSide){material.side=THREE.DoubleSide;material.needsUpdate=true;}
        scene.add(new THREE.Mesh(geometry,material));
        if(geometryMode==='box')camera.position.z=2.2;
        result.geometryMode=geometryMode;
      }
      const started=performance.now();let last=started;
      const draw=now=>{if(stopped)return;const elapsed=(now-started)/1000,dt=(now-last)/1000;last=now;if(material?.uniforms?.time)material.uniforms.time.value=elapsed;const update=typeof api==='function'?api:api?.update;update?.(elapsed,dt);renderer.render(scene,camera);frame=requestAnimationFrame(draw);};frame=requestAnimationFrame(draw);
      addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});report('ready','Running Three.js · '+(result.create?'animation':'material preview · '+result.geometryMode));
    }
    const stop=()=>{stopped=true;cancelAnimationFrame(frame);api?.stop?.();for(const r of renderers){r.setAnimationLoop(null);r.dispose();r.forceContextLoss();}report('ready','Stopped');};
    addEventListener('message',e=>{if(e.source===parent&&e.data==='stop')stop();});addEventListener('pagehide',stop);
  }catch(error){report('error',error.message);}
}
function runThree(){
  const payload={id:++threeRunId,code:$('threeCode').value,noise:FIRE_NOISE_GLSL,geometry:threeGeometry,options:Object.fromEntries(threeFields.map(f=>[f.key,Number(f.input.value)]))};
  const script='('+threeRunner.toString()+')('+JSON.stringify(payload)+');';
  $('threePreview').srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;;img-src data: blob:;script-src &apos;unsafe-inline&apos; &apos;unsafe-eval&apos; http://127.0.0.1:8765/vendor/three.min.js;style-src &apos;unsafe-inline&apos;"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#11151e}canvas{display:block;width:100%;height:100%}</style></head><body><script src="http://127.0.0.1:8765/vendor/three.min.js"></script><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
  $('threeStatus').textContent='Preparing…';
}
addEventListener('message',e=>{if(e.source!==$('threePreview').contentWindow||e.data.threeRunId!==threeRunId)return;$('threeStatus').textContent=e.data.message;$('threeStatus').classList.toggle('error',e.data.type==='error');});
function fitThree(){if(threePanel.hidden)return;const area=threePanel.querySelector('.workspace'),s=getComputedStyle(area);let h=area.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)-20;for(const c of area.children)if(c!==$('threePreview')){const cs=getComputedStyle(c);h-=c.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom);}const w=Math.max(0,Math.min(area.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),h*4/3));$('threePreview').style.width=w+'px';$('threePreview').style.height=w*.75+'px';}
const threeResize=new ResizeObserver(()=>requestAnimationFrame(fitThree));threeResize.observe(threePanel.querySelector('.workspace'));threeResize.observe($('threeControls'));
function leaveThree(){threePanel.hidden=true;document.body.classList.remove('three-active');threeTab.setAttribute('aria-pressed','false');$('threePreview').contentWindow.postMessage('stop','*');}
for(const id of ['sceneTab','buttonTab','confettiTab']){const previous=$(id).onclick;$(id).onclick=()=>{leaveThree();previous();};}
threeTab.onclick=()=>{leaveConfetti();$('scenePanel').hidden=true;$('buttonPanel').hidden=true;$('sceneTab').setAttribute('aria-pressed','false');$('buttonTab').setAttribute('aria-pressed','false');threePanel.hidden=false;document.body.classList.add('three-active');threeTab.setAttribute('aria-pressed','true');fitThree();runThree();};
$('startThree').onclick=runThree;$('stopThree').onclick=()=>{$('threePreview').srcdoc='<html><body style="margin:0;background:#11151e"></body></html>';$('threeStatus').textContent='Stopped';};$('resetThree').onclick=()=>{$('threeCode').value=defaultThreeCode;threeSettings();runThree();};
let threeTimer;$('threeCode').oninput=()=>{clearTimeout(threeTimer);threeTimer=setTimeout(threeSettings,300);};threeSettings();
