function confettiEffect(canvas, options = {}) {
  const {frequency=50, quantity=2, speed=250, drift=100, gravity=75,
    lifetime=2500, size=10, colors=['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff']}=options;
  const ctx=canvas.getContext('2d');
  const width=Math.max(1,canvas.clientWidth||800),height=Math.max(1,canvas.clientHeight||600);
  const ratio=Math.min(devicePixelRatio||1,2);
  canvas.width=width*ratio;canvas.height=height*ratio;
  ctx.scale(ratio,ratio);
  let particles=[],frameId,last,accumulator=0,stopped=false;
  const random=(min,max)=>min+Math.random()*(max-min);
  function emit(){
    for(let i=0;i<quantity&&particles.length<2000;i++) {
      particles.push({x:random(0,width),y:-50,vx:random(-drift,drift),
        vy:random(speed*.8,speed*1.2),gravity:random(gravity*2/3,gravity*4/3),
        life:random(lifetime*.8,lifetime*1.2)/1000,age:0,
        angle:random(-Math.PI,Math.PI),color:colors[Math.floor(Math.random()*colors.length)]});
    }
  }
  function frame(now){
    if(stopped)return;
    const dt=last===undefined?0:Math.min((now-last)/1000,.05);last=now;
    accumulator+=dt*1000;
    while(accumulator>=frequency){emit();accumulator-=frequency;}
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#333e40';ctx.fillRect(0,0,width,height);
    ctx.globalCompositeOperation='lighter';
    particles=particles.filter(p=>p.age<p.life);
    for(const p of particles){
      p.age+=dt;p.x+=p.vx*dt;p.vy+=p.gravity*dt;p.y+=p.vy*dt;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
      // The reference flips each piece along its X axis ten half-cycles.
      ctx.scale(Math.sin(p.age/p.life*Math.PI*10),1);
      ctx.fillStyle=p.color;ctx.fillRect(-size/2,-size/2,size,size);ctx.restore();
    }
    frameId=requestAnimationFrame(frame);
  }
  frameId=requestAnimationFrame(frame);
  return {stop(){stopped=true;cancelAnimationFrame(frameId);particles=[];
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#333e40';ctx.fillRect(0,0,width,height);}};
}
const defaultConfettiCode=confettiEffect.toString();
let confettiRunId=0;
const confettiRunner=function(payload){
  const report=(type,message)=>parent.postMessage({confettiRunId:payload.id,type,message},'*');
  addEventListener('error',event=>report('error',event.message));
  addEventListener('unhandledrejection',event=>report('error',String(event.reason)));
  try {
    if(payload.engine){phaserRuntime(payload,report);return;}
    const code=payload.code.replace(/\bexport\s+(?:default\s+)?/g,'');
    const effect=new Function(code+'\nreturn typeof animationEffect === "function" ? animationEffect : typeof confettiEffect === "function" ? confettiEffect : null;')();
    if(!effect)throw Error('Define animationEffect(canvas, options) or paste a Phaser scene.');
    const behavior=effect(document.querySelector('canvas'),payload.options);
    addEventListener('message',event=>{if(event.source===parent&&event.data==='stop'){behavior?.stop?.();report('ready','Stopped');}});
    addEventListener('pagehide',()=>behavior?.stop?.());report('ready','Running animation');
  }catch(error){report('error',error.message);}
};
function playConfetti(){
  const number=(id,min,max)=>Math.max(min,Math.min(max,Number($(id).value)||min));
  const payload={id:++confettiRunId,code:$('confettiCode').value,options:{
    frequency:number('confettiFrequency',10,1000),quantity:Math.round(number('confettiQuantity',1,20)),
    speed:number('confettiSpeed',10,1000),drift:number('confettiDrift',0,500),gravity:number('confettiGravity',0,1000),
    lifetime:number('confettiLife',200,10000),size:number('confettiSize',2,40),
    colors:$('confettiPalette').value==='neon'?['#ff305b','#1677ff']:['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff']}};
  payload.engine=needsPhaser(payload.code);
  const script='('+confettiRunner.toString()+')('+JSON.stringify(payload)+');';
  $('confettiPreview').srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;;img-src data: blob:;script-src &apos;unsafe-inline&apos; &apos;unsafe-eval&apos; http://127.0.0.1:8765/vendor/phaser.min.js;style-src &apos;unsafe-inline&apos;"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#333e40}canvas{display:block;width:100%;height:100%}</style></head><body><canvas></canvas>'+engineScripts(payload.code)+'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
  $('confettiStatus').textContent='Preparing…';
}
addEventListener('message',event=>{if(event.source!==$('confettiPreview').contentWindow||event.data.confettiRunId!==confettiRunId)return;$('confettiStatus').textContent=event.data.message;$('confettiStatus').classList.toggle('error',event.data.type==='error');});
$('confettiCode').value=defaultConfettiCode;
$('startConfetti').onclick=playConfetti;
$('stopConfetti').onclick=()=>{$('confettiPreview').contentWindow.postMessage('stop','*');};
$('resetConfetti').onclick=()=>{$('confettiCode').value=defaultConfettiCode;playConfetti();};
['confettiFrequency','confettiQuantity','confettiSpeed','confettiDrift','confettiGravity','confettiLife','confettiSize','confettiPalette'].forEach(id=>$(id).onchange=playConfetti);
const sceneClick=$('sceneTab').onclick,buttonClick=$('buttonTab').onclick;
function leaveConfetti(){ document.body.classList.remove('confetti-active'); $('confettiPanel').hidden=true;$('confettiTab').setAttribute('aria-pressed','false');$('confettiPreview').contentWindow.postMessage('stop','*'); }
$('sceneTab').onclick=()=>{leaveConfetti();sceneClick();};
$('buttonTab').onclick=()=>{leaveConfetti();buttonClick();};
$('confettiTab').onclick=()=>{document.body.classList.add('confetti-active');$('scenePanel').hidden=true;$('buttonPanel').hidden=true;$('confettiPanel').hidden=false;$('sceneTab').setAttribute('aria-pressed','false');$('buttonTab').setAttribute('aria-pressed','false');$('confettiTab').setAttribute('aria-pressed','true');playConfetti();};

// Promote the particle demo tab to a general animation workspace.
$('confettiTab').textContent='Animation tester';
const panel=$('confettiPanel');
const workspace=panel.querySelector('.workspace');
workspace.querySelector('h1').textContent='Animation preview';
workspace.querySelector('p').textContent='Run browser animations or standalone Phaser scenes.';
const editor=document.createElement('div');editor.id='animationEditor';
const heading=document.createElement('h2');heading.textContent='Animation code';editor.append(heading,$('confettiCode'));
const actions=document.createElement('div');actions.className='editorActions';
$('startConfetti').textContent='Run code';$('resetConfetti').textContent='Load confetti example';
actions.append($('startConfetti'),$('stopConfetti'),$('resetConfetti'));editor.append(actions);
const help=document.createElement('p');help.className='hint';help.textContent='Paste a Phaser.Scene, a complete Phaser.Game example, or animationEffect(canvas, options). Settings are read from options and simple config values.';editor.append(help);
panel.querySelector('.buttonSettings').remove();
workspace.querySelector('h2')?.remove();workspace.querySelector('p:last-child')?.remove();panel.prepend(editor);
const controls=document.createElement('div');controls.id='animationControls';workspace.append(controls);
let animationFields=[];
function animationOptions(){return Object.fromEntries(animationFields.map(f=>[f.key,f.type==='number'?Number(f.input.value):f.type==='boolean'?f.input.checked:f.input.value]));}
function animationSettings(){
  const code=$('confettiCode').value.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  const fields=new Map();
  const add=(key,raw)=>{if(!['__proto__','prototype','constructor'].includes(key))fields.set(key,raw);};
  for(const match of code.matchAll(/(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*options\b/g))for(const part of match[1].split(',')){const m=part.trim().match(/^([\w$]+)(?:\s*=\s*(-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*"))?$/);if(m)add(m[1],m[2]);}
  for(const match of code.matchAll(/\boptions(?:\?\.|\.)([\w$]+)(?:\s*\?\?\s*(-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*"))?/g))if(!fields.has(match[1]))add(match[1],match[2]);
  // Scalar properties in a config object can be overridden in the preview.
  const config=code.match(/(?:const|let|var)\s+config\s*=\s*\{([\s\S]*?)\n?\s*\};/);
  if(config)for(const match of config[1].matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*(-?\d+(?:\.\d+)?|true|false|'[^']*'|"[^"]*")\s*(?=[,}])/g))if(!['width','height','parent','type','mode','autoCenter'].includes(match[1]))add('config.'+match[1],match[2]);
  const previous=animationOptions();animationFields=[];controls.replaceChildren();
  const title=document.createElement('h2');title.textContent='Animation controls';controls.append(title);
  const notice=document.createElement('p');notice.id='animationControlNotice';notice.className='hint';
  notice.textContent=fields.size?'Detected settings. Change values, then press Run code.':'No editable settings detected. Run and Stop are available. Use options.speed (or another options property) to expose a control.';controls.append(notice);
  for(const [key,raw] of fields){
    let value=raw??'1',type='number';
    if(value==='true'||value==='false'){type='boolean';value=value==='true';}
    else if(/^['"]/.test(value)){type='text';value=value.slice(1,-1);}
    else if(Number.isFinite(Number(value)))value=Number(value);else{type='text';value='';}
    if(Object.hasOwn(previous,key))value=previous[key];
    const label=document.createElement('label');label.textContent=key.replace(/^config\./,'').replace(/([a-z])([A-Z])/g,'$1 $2');
    const input=document.createElement('input');input.type=type==='boolean'?'checkbox':type==='number'?'number':'text';input.setAttribute('aria-label',key);if(type==='number')input.step='any';if(type==='boolean')input.checked=value;else input.value=value;
    label.append(input);controls.append(label);animationFields.push({key,input,type});
  }
}
playConfetti=function(){
  const values=animationOptions(),options={},configOverrides={};
  for(const [key,value] of Object.entries(values)){if(key.startsWith('config.'))configOverrides[key.slice(7)]=value;else options[key]=value;}
  const payload={id:++confettiRunId,code:$('confettiCode').value,options,configOverrides};payload.engine=needsPhaser(payload.code);
  const script='('+confettiRunner.toString()+')('+JSON.stringify(payload)+');';
  $('confettiPreview').srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;;img-src data: blob:;script-src &apos;unsafe-inline&apos; &apos;unsafe-eval&apos; http://127.0.0.1:8765/vendor/phaser.min.js;style-src &apos;unsafe-inline&apos;"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#333e40}canvas{display:block;width:100%;height:100%}</style></head><body><canvas></canvas>'+engineScripts(payload.code)+'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
  $('confettiStatus').textContent='Preparing…';
};
$('startConfetti').onclick=()=>playConfetti();$('resetConfetti').onclick=()=>{$('confettiCode').value=defaultConfettiCode;animationSettings();playConfetti();};
let settingsTimer;$('confettiCode').oninput=()=>{clearTimeout(settingsTimer);settingsTimer=setTimeout(animationSettings,300);};
animationSettings();

function fitAnimationViewer(){
  if($('confettiPanel').hidden)return;
  const area=$('confettiPanel').querySelector('.workspace');
  const style=getComputedStyle(area);
  const availableWidth=area.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  let availableHeight=area.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-20;
  for(const child of area.children){
    if(child===$('confettiPreview')||child.hidden)continue;
    const cs=getComputedStyle(child);
    availableHeight-=child.getBoundingClientRect().height+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom);
  }
  const width=Math.max(0,Math.min(availableWidth,Math.max(0,availableHeight)*4/3));
  $('confettiPreview').style.width=width+'px';
  $('confettiPreview').style.height=width*3/4+'px';
}
const animationResize=new ResizeObserver(()=>requestAnimationFrame(fitAnimationViewer));
animationResize.observe($('confettiPanel').querySelector('.workspace'));
animationResize.observe($('animationControls'));
const openAnimationTab=$('confettiTab').onclick;
$('confettiTab').onclick=()=>{openAnimationTab();fitAnimationViewer();};
