const $ = id => document.getElementById(id);
let extraFields=[];
const presets = {
hex: `async function transition({ctx, from, to, width, height, options}) {
  const { duration, origin, hexSize, colors } = options;
  const radius = hexSize * width / 960;
  const ox = origin.x * width, oy = origin.y * height;
  const maxDistance = Math.max(...[[0,0],[width,0],[0,height],[width,height]].map(([x,y]) => Math.hypot(x-ox,y-oy)));
  const tiles = [];
  const pad=20, side=Math.ceil(radius*2+pad*2), center=side/2;
  const rgb = color => color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
  const red=rgb(colors[0]), blue=rgb(colors[1]);
  function hex(c,x,y,r) {
    c.beginPath();
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3, px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
      i ? c.lineTo(px,py) : c.moveTo(px,py);
    }
    c.closePath();
  }
  // Cache clipped image tiles and their glow once, before playback.
  // Each frame then draws small sprites instead of clipping full images.
  for(let col=0;col*radius*1.5<width+radius;col++) {
    for(let row=-1;row*radius*Math.sqrt(3)<height+radius;row++) {
      const x=col*radius*1.5, y=(row+(col%2)/2)*radius*Math.sqrt(3);
      const image=document.createElement('canvas'); image.width=image.height=side;
      const c=image.getContext('2d'); hex(c,center,center,radius+0.8);c.clip();
      c.drawImage(from,center-x,center-y,width,height);
      const glow=document.createElement('canvas');glow.width=glow.height=side;
      const g=glow.getContext('2d');
      const mix=Math.max(0,Math.min(1,(x/width+y/height)/2));
      const color='rgb('+red.map((v,i)=>Math.round(v+(blue[i]-v)*mix)).join(',')+')';
      g.strokeStyle=color;g.shadowColor=color;g.shadowBlur=12;g.lineWidth=2;
      hex(g,center,center,radius);g.stroke();
      const particle=document.createElement('canvas');particle.width=particle.height=32;
      const pc=particle.getContext('2d');pc.fillStyle=color;pc.shadowColor=color;pc.shadowBlur=6;
      hex(pc,16,16,5);pc.fill();
      tiles.push({x,y,image,glow,particle,delay:Math.min(1,Math.hypot(x-ox,y-oy)/maxDistance)*0.62,angle:Math.atan2(y-oy,x-ox)});
    }
  }
  const started=performance.now();
  await new Promise(resolve=>{
    function frame(now) {
      const t=Math.min(1,(now-started)/duration);
      ctx.globalAlpha=1;ctx.drawImage(to,0,0,width,height);
      for(const tile of tiles) {
        const p=Math.max(0,Math.min(1,(t-tile.delay)/0.38));
        if(p>=1)continue;
        const scale=1-p*p, size=side*scale;
        ctx.drawImage(tile.image,tile.x-size/2,tile.y-size/2,size,size);
        if(p>0) {
          ctx.globalAlpha=Math.sin(p*Math.PI);
          ctx.drawImage(tile.glow,tile.x-size/2,tile.y-size/2,size,size);
          const travel=radius*2*p, particleSize=radius*0.7*(1-p);
          ctx.drawImage(tile.particle,tile.x+Math.cos(tile.angle)*travel-particleSize/2,tile.y+Math.sin(tile.angle)*travel-particleSize/2,particleSize,particleSize);
          ctx.globalAlpha=1;
        }
      }
      t<1 ? requestAnimationFrame(frame) : resolve();
    }
    requestAnimationFrame(frame);
  });
}`,
fade: `async function transition({ctx,from,to,width,height,options}) {
  const start=performance.now();
  await new Promise(resolve => {
    function frame(now) {
      const t=Math.min(1,(now-start)/options.duration);
      ctx.globalAlpha=1; ctx.drawImage(from,0,0,width,height);
      ctx.globalAlpha=t; ctx.drawImage(to,0,0,width,height);
      ctx.globalAlpha=1;
      t<1 ? requestAnimationFrame(frame) : resolve();
    }
    requestAnimationFrame(frame);
  });
}`,
slide: `async function transition({ctx,from,to,width,height,options}) {
  const start=performance.now();
  await new Promise(resolve => {
    function frame(now) {
      const t=Math.min(1,(now-start)/options.duration);
      const ease=1-Math.pow(1-t,3);
      ctx.clearRect(0,0,width,height);
      ctx.drawImage(to,(ease-1)*width,0,width,height);
      ctx.drawImage(from,ease*width,0,width,height);
      t<1 ? requestAnimationFrame(frame) : resolve();
    }
    requestAnimationFrame(frame);
  });
}`
};
function sample(label, first) {
  const c=document.createElement('canvas');c.width=960;c.height=600;
  const x=c.getContext('2d');const g=x.createLinearGradient(0,0,960,600);
  g.addColorStop(0,first?'#37243e':'#102e55');g.addColorStop(1,first?'#b52c50':'#187b98');
  x.fillStyle=g;x.fillRect(0,0,960,600);
  x.strokeStyle='#ffffff16';x.lineWidth=1;
  for(let i=0;i<960;i+=60){x.beginPath();x.moveTo(i,0);x.lineTo(i,600);x.stroke();}
  for(let i=0;i<600;i+=60){x.beginPath();x.moveTo(0,i);x.lineTo(960,i);x.stroke();}
  x.fillStyle='#ffffff88';x.font='18px sans-serif';x.fillText('TRANSITION LAB / SAMPLE',64,80);
  x.fillStyle='white';x.font='bold 76px sans-serif';x.fillText(label,64,310);
  x.fillStyle='#ffffffaa';x.font='24px sans-serif';x.fillText(first?'This screen dissolves away.':'This screen is revealed underneath.',68,362);
  return c.toDataURL();
}
let images={from:sample('Current screen',true),to:sample('Next screen',false)};
let dimensions={width:960,height:600};let runId=0;let running=false;
const runner = async function(payload) {
  const {images, dimensions, code, options, play, id}=payload;
  const report=(type,message)=>parent.postMessage({type,message,id},'*');
  addEventListener('error',e=>report('error',e.message));
  addEventListener('unhandledrejection',e=>report('error',String(e.reason)));
  try {
    if(payload.engine){phaserRuntime(payload,report);return;}
    const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Image could not be loaded'));image.src=src;});
    const loaded=await Promise.all([load(images.from),load(images.to)]);
    // Resize uploads once; effects never repeatedly resample original large files.
    const [a,b]=loaded.map(image=>{const c=document.createElement('canvas');c.width=dimensions.width;c.height=dimensions.height;c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;});
    const canvas=document.querySelector('canvas');canvas.width=dimensions.width;canvas.height=dimensions.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(a,0,0,canvas.width,canvas.height);
    if(!play){report('ready','Ready');return;}
    const events={};
    const emitter={on(n,f){(events[n] ||= []).push({f,once:false});},once(n,f){(events[n] ||= []).push({f,once:true});},off(n,f){events[n]=(events[n]||[]).filter(e=>e.f!==f);},emit(n){const list=[...(events[n]||[])];events[n]=(events[n]||[]).filter(e=>!e.once);list.forEach(e=>e.f());}};
    const game={canvas,events:emitter,sceneTransitioning:false};
    const scene={game,scene:{start(){ctx.drawImage(b,0,0,canvas.width,canvas.height);requestAnimationFrame(()=>emitter.emit('postrender'));}}};
    const Phaser={Core:{Events:{POST_RENDER:'postrender',DESTROY:'destroy'}}};
    const screenshotPage=()=>{const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);copy.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none';document.body.append(copy);return copy;};
    const goToSceneOnIOS=(s,k,d)=>{s.scene.start(k,d);s.game.sceneTransitioning=false;};
    const slideInFrames=x=>[{transform:'translateX('+x+'%)'},{transform:'translateX(0)'}];
    const slidePageLayers=(frames,opts)=>[canvas.animate(frames,opts)];
    const cleaned=code.replace(/\bexport\s+default\s+/g,'').replace(/\bexport\s+(?=(?:async\s+)?function\b)/g,'');
    const factory=new Function('Phaser','IS_IOS','goToSceneOnIOS','screenshotPage','slideInFrames','slidePageLayers','SLIDE_MS','LEAN_MS',cleaned+'\n;return {transition: typeof transition === "function" ? transition : null, goToScene: typeof goToScene === "function" ? goToScene : null};');
    const api=factory(Phaser,false,goToSceneOnIOS,screenshotPage,slideInFrames,slidePageLayers,options.duration,150);
    let monitor=true;const intervals=[];let last;
    const measure=now=>{if(last!==undefined)intervals.push(now-last);last=now;if(monitor)requestAnimationFrame(measure);};requestAnimationFrame(measure);
    const complete=()=>{monitor=false;const sorted=intervals.slice(1).sort((a,b)=>a-b);const median=sorted[Math.floor(sorted.length/2)];report('done',median?'Complete · '+Math.round(1000/median)+' fps · '+canvas.width+' × '+canvas.height:'Complete');};
    report('started','Playing');
    if(api.transition){await api.transition({canvas,ctx,from:a,to:b,width:canvas.width,height:canvas.height,options});complete();}
    else if(api.goToScene){api.goToScene(scene,'NextScene',{},options);requestAnimationFrame(()=>emitter.emit('postrender'));const start=performance.now();const check=()=>{if(!game.sceneTransitioning)complete();else if(performance.now()-start>Math.max(15000,options.duration*4))report('error','Transition did not finish. Press Reset to stop it.');else requestAnimationFrame(check);};requestAnimationFrame(check);}
    else throw Error('Define transition(...) or goToScene(...). Imports and other Phaser APIs need their dependencies.');
  } catch(e){report('error',e.message);}
};
function preview(play=false) {
  const id=++runId; running=play;document.body.classList.toggle('playing',play);
  $('status').classList.remove('error');$('status').textContent=play?'Preparing transition…':'Ready';
  const options={duration:Number($('duration').value),origin:{x:Math.max(0,Math.min(100,Number($('ox').value)))/100,y:Math.max(0,Math.min(100,Number($('oy').value)))/100},hexSize:Number($('size').value),colors:[$('red').value,$('blue').value]};
  Object.assign(options, readExtraControls());
  const payload={images,dimensions,code:$('code').value,options,play,id};
  // Replacing the frame stops previous animations and gives each run a clean page.
  payload.engine=needsPhaser(payload.code);
  const script='('+runner.toString()+')('+JSON.stringify(payload)+');';
  $('preview').srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; img-src data: blob:; script-src &apos;unsafe-inline&apos; &apos;unsafe-eval&apos; http://127.0.0.1:8765/vendor/phaser.min.js; style-src &apos;unsafe-inline&apos;"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080b12}canvas{width:100%;height:100%;display:block}</style></head><body><canvas></canvas>'+engineScripts(payload.code)+'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
}
addEventListener('message',e=>{if(e.source!==$('preview').contentWindow||e.data.id!==runId)return;const {type,message}=e.data;if(type==='error'||type==='done'||type==='ready'){running=false;document.body.classList.remove('playing');} $('status').textContent=message;$('status').classList.toggle('error',type==='error');});
for(const name of ['from','to']) {
  $(name+'Thumb').src=images[name];
  $(name).addEventListener('change',async()=>{
    const file=$(name).files[0];if(!file)return;
    try {
      const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
      const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Please choose a valid image.'));i.src=src;});
      images[name]=src;$(name+'Thumb').src=src;$(name+'Name').textContent=file.name;
      if(name==='from'){const scale=Math.min(1,1280/image.naturalWidth,1280/image.naturalHeight);dimensions={width:Math.round(image.naturalWidth*scale),height:Math.round(image.naturalHeight*scale)};$('stage').style.setProperty('--ratio',dimensions.width/dimensions.height);$('stage').style.aspectRatio=dimensions.width+'/'+dimensions.height;$('dimensions').textContent=dimensions.width+' × '+dimensions.height;}
      preview();
    }catch(e){$('status').textContent=e.message||'Image could not be loaded';$('status').classList.add('error');}
  });
}
function updateOrigin(){$('origin').style.left=Math.max(0,Math.min(100,Number($('ox').value)))+'%';$('origin').style.top=Math.max(0,Math.min(100,Number($('oy').value)))+'%';}
$('pick').onclick=e=>{const r=$('stage').getBoundingClientRect();$('ox').value=Math.round((e.clientX-r.left)/r.width*100);$('oy').value=Math.round((e.clientY-r.top)/r.height*100);updateOrigin();};
['ox','oy'].forEach(id=>$(id).oninput=updateOrigin);
$('duration').oninput=()=>{$('durationLabel').textContent=$('duration').value+' ms';};
$('preset').onchange=()=>{if(presets[$('preset').value])$('code').value=presets[$('preset').value];syncControls();};
$('restore').onclick=()=>{const preset=$('preset').value;if(presets[preset])$('code').value=presets[preset];else $('status').textContent='Choose a starting effect to restore its code.';syncControls();};
let controlTimer;
$('code').oninput=()=>{$('preset').value='custom';clearTimeout(controlTimer);controlTimer=setTimeout(syncControls,250);};
$('code').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();const a=e.target.selectionStart,b=e.target.selectionEnd;e.target.setRangeText('  ',a,b,'end');}};
$('play').onclick=()=>preview(true);$('reset').onclick=()=>preview(false);
$('code').value=presets.hex;syncControls();preview();

// Detect simple options access without executing the pasted code.

function readExtraControls() {
  return Object.fromEntries(extraFields.map(({name,input,type})=>[name,type==='number'?Number(input.value):type==='boolean'?input.checked:input.value]));
}
function syncControls() {
  const source=$('code').value.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  const detected=new Map();
  const add=(name,value)=>{if(/^[A-Za-z_$][\w$]*$/.test(name)&&!['__proto__','constructor','prototype'].includes(name))detected.set(name,value);};
  for(const match of source.matchAll(/\boptions(?:\?\.|\.)([A-Za-z_$][\w$]*)/g))add(match[1]);
  for(const match of source.matchAll(/\boptions\s*\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]/g))add(match[1]);
  for(const match of source.matchAll(/(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*options\b/g)) {
    for(const entry of match[1].split(',')) {
      const part=entry.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*[A-Za-z_$][\w$]*)?(?:\s*=\s*(.*))?$/);
      if(part)add(part[1],part[2]);
    }
  }
  // Read straightforward defaults such as options.strength ?? 2.
  for(const match of source.matchAll(/\boptions\.([A-Za-z_$][\w$]*)\s*(?:\?\?|\|\|)\s*(-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*")/g))add(match[1],match[2]);
  const fallback=detected.size===0;
  const show=name=>fallback||detected.has(name);
  $('duration').closest('label').hidden=!show('duration');
  $('ox').closest('.pair').hidden=!show('origin');
  $('ox').closest('.pair').nextElementSibling.hidden=!show('origin');
  $('origin').hidden=!show('origin');$('pick').hidden=!show('origin');
  $('size').closest('label').hidden=!show('hexSize');
  $('red').closest('.pair').hidden=!show('colors');
  const previous=readExtraControls();extraFields=[];$('extraControls').replaceChildren();
  for(const [name,raw] of detected) {
    if(['duration','origin','hexSize','colors'].includes(name))continue;
    let value=raw===undefined?1:raw.trim(),type='number';
    if(value==='true'||value==='false'){type='boolean';value=value==='true';}
    else if(/^['"]/.test(value)){type='text';value=value.slice(1,-1);}
    else if(!Number.isFinite(Number(value))){type='text';value='';}
    else value=Number(value);
    const label=document.createElement('label');label.textContent=name.replace(/([a-z])([A-Z])/g,'$1 $2');
    const input=document.createElement('input');input.type=type==='boolean'?'checkbox':type==='number'?'number':'text';
    input.setAttribute('aria-label',name);if(type==='number')input.step='any';
    value=Object.hasOwn(previous,name)?previous[name]:value;
    if(type==='boolean')input.checked=value;else input.value=value;
    label.append(input);$('extraControls').append(label);extraFields.push({name,input,type});
  }
  $('controlNotice').textContent=fallback?'Could not detect settings. Showing default controls.':'Detected settings: '+[...detected.keys()].join(', ')+'.';
}

const defaultButtonCode = `function buttonEffect(button, options) {
  const { clickScale = 0.9, duration = 120 } = options;
  let hovering = false;
  let pressed = false;
  let animation;
  let scale = 1;
  function animate(next) {
    const current = getComputedStyle(button).transform;
    animation?.cancel();
    animation = button.animate([
      { transform: current === 'none' ? 'scale(1)' : current },
      { transform: 'scale(' + next + ')' }
    ], { duration, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' });
    scale = next;
  }
  const down = event => {
    if (event.button !== 0) return;
    pressed = true;
    button.setPointerCapture(event.pointerId);
    animate(clickScale);
  };
  const release = event => {
    if (!pressed) return;
    pressed = false;
    const rect = button.getBoundingClientRect();
    hovering = event.pointerType !== 'touch' && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    animate(1);
  };
  const reset = () => { pressed = hovering = false; animate(1); };

  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  return { stop() {
    animation?.cancel();
    button.removeEventListener('pointerdown', down);
    button.removeEventListener('pointerup', release);
    button.removeEventListener('pointercancel', reset);
    window.removeEventListener('blur', reset);
  }};
}`;
let buttonRunId=0;
const buttonRunner=function(payload){
  const report=(type,message)=>parent.postMessage({buttonRunId:payload.id,type,message},'*');
  addEventListener('error',event=>report('error',event.message));
  addEventListener('unhandledrejection',event=>report('error',String(event.reason)));
  try {
    if(payload.engine){phaserRuntime(payload,report);return;}
    const button=document.querySelector('button');button.textContent=payload.label;
    const code=payload.code.replace(/\bexport\s+(?:default\s+)?/g,'');
    const effect=new Function(code+'\nreturn typeof buttonEffect === "function" ? buttonEffect : null;')();
    if(!effect)throw Error('Define function buttonEffect(button, options).');
    const behavior=effect(button,payload.options);
    let clicks=0;
    button.addEventListener('click',()=>{clicks++;document.querySelector('p').textContent='Clicks: '+clicks;report('ready','Click registered · '+clicks);});
    addEventListener('pagehide',()=>behavior?.stop?.());
    report('ready','Ready · tap or click the button');
  }catch(error){report('error',error.message);}
};
function applyButton(){
  const id=++buttonRunId;
  const payload={id,label:$('buttonLabel').value,code:$('buttonCode').value,options:{hoverScale:Math.max(0.1,Number($('hoverScale').value)),clickScale:Math.max(0.1,Number($('clickScale').value)),duration:Math.max(0,Number($('buttonDuration').value))}};
  payload.engine=needsPhaser(payload.code);
  const script='('+buttonRunner.toString()+')('+JSON.stringify(payload)+');';
  $('buttonPreview').srcdoc='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;;img-src data: blob:;script-src &apos;unsafe-inline&apos; &apos;unsafe-eval&apos; http://127.0.0.1:8765/vendor/phaser.min.js;style-src &apos;unsafe-inline&apos;"><style>html,body{margin:0;height:100%;background:#101522;color:white;font-family:system-ui}body{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:26px}button{background:linear-gradient(110deg,#ff305b,#1677ff);border:1px solid #ffffff66;color:white;font:700 20px system-ui;letter-spacing:1px;padding:23px 48px;border-radius:14px;cursor:pointer;touch-action:none}button:focus-visible{outline:3px solid white;outline-offset:8px}p{font-size:13px;color:#96a5bf}</style></head><body><button>PLAY NOW</button><p>Tap to test</p>'+engineScripts(payload.code)+'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
  $('buttonStatus').textContent='Applying…';$('buttonStatus').classList.remove('error');
}
addEventListener('message',event=>{
  if(event.source!==$('buttonPreview').contentWindow||event.data.buttonRunId!==buttonRunId)return;
  $('buttonStatus').textContent=event.data.message;$('buttonStatus').classList.toggle('error',event.data.type==='error');
});
function switchTab(buttonMode){
  $('scenePanel').hidden=buttonMode;$('buttonPanel').hidden=!buttonMode;
  $('sceneTab').setAttribute('aria-pressed',String(!buttonMode));$('buttonTab').setAttribute('aria-pressed',String(buttonMode));
  if(buttonMode&&!buttonRunId)applyButton();
}
$('sceneTab').onclick=()=>switchTab(false);$('buttonTab').onclick=()=>switchTab(true);
$('buttonCode').value=defaultButtonCode;
$('applyButton').onclick=applyButton;$('resetButton').onclick=()=>{$('buttonCode').value=defaultButtonCode;applyButton();};
['buttonLabel','hoverScale','clickScale','buttonDuration'].forEach(id=>$(id).onchange=applyButton);
