// Starting code for Button effects. "Button Juice" is its own function; the other presets share one
// implementation and differ only in MODE, which is filled in when the preset is shown.

export const juice = function buttonEffect(button, options) {
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
};

export function effectImplementation(button, options = {}) {
  const mode = 'MODE';
  const { clickScale = 0.9, duration = 120,
    colors = ['#ff305b', '#1677ff'], onComplete } = options;
  const original = button.style.cssText;
  let hovering = false, busy = false, stopped = false;
  const nodes = new Set(), animations = new Set(), timers = new Set();
  const listeners = [];
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  };
  const wait = ms => new Promise(resolve => {
    const id = setTimeout(() => { timers.delete(id); resolve(); }, ms);
    timers.add(id);
  });
  const animate = (target, frames, ms = duration, extra = {}) => {
    const animation = target.animate(frames, {
      duration: ms, easing: 'cubic-bezier(.16,1,.3,1)', ...extra
    });
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    return animation;
  };
  const hexClip = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';
  const spawn = style => {
    const node = document.createElement('div');
    Object.assign(node.style, { position:'fixed', pointerEvents:'none',
      zIndex:'9999', ...style });
    document.body.append(node); nodes.add(node); return node;
  };
  const remove = node => { node.remove(); nodes.delete(node); };
  function particles(count = 18, subtle = false) {
    const rect = button.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const x = rect.left + rect.width / 2 + Math.cos(angle) * rect.width / 2;
      const y = rect.top + rect.height / 2 + Math.sin(angle) * rect.height / 2;
      const size = subtle ? 5 : 5 + Math.random() * 7;
      const node = spawn({ left:x+'px', top:y+'px', width:size+'px',height:size+'px',
        clipPath:hexClip, background:colors[i%2], filter:'drop-shadow(0 0 4px '+colors[i%2]+')' });
      const distance = subtle ? 12 : 35 + Math.random() * 65;
      const animation = animate(node, [
        { transform:'translate(-50%,-50%) scale(1)', opacity:1 },
        { transform:'translate('+ (Math.cos(angle)*distance-size/2) +'px,'+
          (Math.sin(angle)*distance-size/2)+'px) rotate(120deg) scale(.1)', opacity:0 }
      ], subtle ? 500 : 650);
      animation.finished.catch(()=>{}).finally(()=>remove(node));
    }
  }
  function shine() {
    const rect = button.getBoundingClientRect();
    const node = spawn({ left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',
      height:rect.height+'px',borderRadius:getComputedStyle(button).borderRadius,
      overflow:'hidden' });
    const streak=document.createElement('div');
    Object.assign(streak.style,{position:'absolute',inset:'-40% auto -40% -50%',width:'35%',
      background:'linear-gradient(90deg,transparent,#ffffffaa,transparent)',transform:'skewX(-20deg)'});
    node.append(streak);
    const animation=animate(streak,[{left:'-50%'},{left:'140%'}],650);
    animation.finished.catch(()=>{}).finally(()=>remove(node));
  }
  function outline() {
    const rect=button.getBoundingClientRect();
    const node=spawn({left:(rect.left-8)+'px',top:(rect.top-8)+'px',width:(rect.width+16)+'px',
      height:(rect.height+16)+'px',clipPath:hexClip,
      background:'linear-gradient(90deg,'+colors.join(',')+')',opacity:'.45'});
    const inner=document.createElement('div');
    Object.assign(inner.style,{position:'absolute',inset:'2px',clipPath:hexClip,background:'#101522'});
    node.append(inner);node.style.zIndex='0';return node;
  }
  let hoverOutline;
  const down = () => {
    if(busy||stopped)return;
    if(mode==='neon') animate(button,[{transform:'scale(1)'},{transform:'scale('+clickScale+')'}],duration,{fill:'forwards'});
  };
  const release = () => {
    if(mode==='neon'&&!busy){for(const animation of animations)animation.cancel();animate(button,[{transform:'scale('+clickScale+')'},{transform:'scale('+1+')'}],duration);}
  };
  const activate = async () => {
    if(busy||stopped)return;busy=true;button.disabled=true;
    if(hoverOutline){remove(hoverOutline);hoverOutline=null;}
    try {
      if(mode==='neon') {
        button.style.boxShadow='-7px 0 22px '+colors[0]+'88,7px 0 22px '+colors[1]+'88';
        await animate(button,[{transform:'scale('+clickScale+')'},{transform:'scale(1.04)'},{transform:'scale(1)'}],Math.max(220,duration*2)).finished;
      } else if(mode==='hex') {
        particles();await wait(650);
      } else if(mode==='energy') {
        await animate(button,[{filter:'brightness(1)',boxShadow:'0 0 0 transparent'},
          {filter:'brightness(2)',boxShadow:'0 0 40px '+colors[0]},
          {filter:'brightness(1)',boxShadow:'0 0 55px '+colors[1]}],600).finished;
        particles(12);await wait(200);
      } else if(mode==='glitch') {
        const rect=button.getBoundingClientRect();
        const layers=[];
        // Offset clipped copies create visible red/blue scan-line tearing.
        for(let i=0;i<4;i++) {
          const node=spawn({left:rect.left+'px',top:rect.top+'px',
            width:rect.width+'px',height:rect.height+'px',overflow:'hidden',
            clipPath:'inset('+(i*25)+'% 0 '+(75-i*25)+'% 0)'});
          const clone=button.cloneNode(true);clone.removeAttribute('id');clone.disabled=false;
          Object.assign(clone.style,{width:rect.width+'px',height:rect.height+'px',
            margin:'0',background:colors[i%2],opacity:'.8',filter:'contrast(1.5)'});
          node.append(clone);layers.push(node);
        }
        const glitchDuration=Math.max(500,duration*4);
        const jumps=[0,-10,8,-5,12,-8,4,-11,6,0];
        const frames=jumps.map((x,i)=>({
          transform:'translate('+x+'px,'+((i%3)-1)*2+'px) skewX('+(x/2)+'deg)',
          filter:i%2?'contrast(1.8) hue-rotate(40deg)':'none',
          textShadow:i%2?'5px 0 '+colors[0]+',-5px 0 '+colors[1]:'none',
          offset:i/(jumps.length-1),easing:'steps(1,end)'
        }));
        // Stepping each segment keeps intermediate glitch frames visible.
        // A single steps(1) on the entire animation held its first frame.
        try {
          const effects=layers.map((node,index)=>animate(node,jumps.map((x,i)=>({
            transform:'translateX('+(x*(index%2?-1:1))+'px)',
            opacity:i===0||i===jumps.length-1?0:0.85,
            offset:i/(jumps.length-1),easing:'steps(1,end)'
          })),glitchDuration,{easing:'linear'}));
          effects.push(animate(button,frames,glitchDuration,{easing:'linear'}));
          await Promise.all(effects.map(animation=>animation.finished));
        } finally { layers.forEach(remove); }
      } else if(mode==='shine') {
        shine();await animate(button,[{transform:'scale(1)',filter:'brightness(1)'},
          {transform:'scale(1.08)',filter:'brightness(1.6)'},
          {transform:'scale(1)',filter:'brightness(1)'}],350).finished;
      } else if(mode==='dissolve') {
        const rect=button.getBoundingClientRect();const radius=16;
        const pieces=[];
        for(let col=0;col*radius*1.5<rect.width+radius;col++) {
          for(let row=-1;row*radius*Math.sqrt(3)<rect.height+radius;row++) {
            const x=col*radius*1.5,y=(row+(col%2)/2)*radius*Math.sqrt(3);
            const piece=spawn({left:(rect.left+x-radius)+'px',top:(rect.top+y-radius)+'px',
              width:radius*2+'px',height:radius*2+'px',clipPath:hexClip,overflow:'hidden'});
            const clone=button.cloneNode(true);clone.removeAttribute('id');clone.disabled=false;
            Object.assign(clone.style,{position:'absolute',left:(radius-x)+'px',top:(radius-y)+'px',
              width:rect.width+'px',height:rect.height+'px',margin:'0',transform:'none',opacity:'1'});
            piece.append(clone);pieces.push({piece,x,y});
          }
        }
        button.style.opacity='0';
        await Promise.all(pieces.map(({piece,x,y})=>{
          const angle=Math.atan2(y-rect.height/2,x-rect.width/2);
          return animate(piece,[{transform:'translate(0) scale(1)',opacity:1},
            {transform:'translate('+Math.cos(angle)*65+'px,'+Math.sin(angle)*65+'px) rotate(30deg) scale(.15)',opacity:0}],650,{delay:Math.random()*120}).finished.catch(()=>{}).finally(()=>remove(piece));
        }));
      }
      if(!stopped&&typeof onComplete==='function')onComplete();
    } catch(error) { if(!stopped)console.warn(error); }
    finally {if(!stopped){button.style.cssText=original;button.disabled=false;busy=false;}}
  };

  listen(button,'pointerdown',down);listen(window,'pointerup',release);
  listen(button,'pointercancel',release);listen(button,'click',activate);
  return {stop(){stopped=true;listeners.forEach(removeListener=>removeListener());
    animations.forEach(animation=>animation.cancel());timers.forEach(clearTimeout);
    nodes.forEach(node=>node.remove());button.style.cssText=original;button.disabled=false;}};
}
