// Starting code for Screen transitions. Each preset is a real function; the editor shows its source.
// Every tunable value is a destructured default, so it appears as a setting.

export const hexDissolve = async function transition({ ctx, from, to, width, height, options }) {
  const { duration = 1200, hexSize = 36, originX = 50, originY = 50, startColor = '#ff305b', endColor = '#1677ff' } = options;
  const radius = hexSize * width / 960;
  const ox = originX / 100 * width, oy = originY / 100 * height;
  const maxDistance = Math.max(...[[0,0],[width,0],[0,height],[width,height]].map(([x,y]) => Math.hypot(x-ox,y-oy)));
  const tiles = [];
  const pad=20, side=Math.ceil(radius*2+pad*2), center=side/2;
  const rgb = color => color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
  const red=rgb(startColor), blue=rgb(endColor);
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
};

export const crossfade = async function transition({ ctx, from, to, width, height, options }) {
  const { duration = 600 } = options;
  const start = performance.now();
  await new Promise(resolve => {
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      ctx.globalAlpha = 1;
      ctx.drawImage(from, 0, 0, width, height);
      ctx.globalAlpha = t;
      ctx.drawImage(to, 0, 0, width, height);
      ctx.globalAlpha = 1;
      t < 1 ? requestAnimationFrame(frame) : resolve();
    }
    requestAnimationFrame(frame);
  });
};

export const slide = async function transition({ ctx, from, to, width, height, options }) {
  const { duration = 700 } = options;
  const start = performance.now();
  await new Promise(resolve => {
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(to, (ease - 1) * width, 0, width, height);
      ctx.drawImage(from, ease * width, 0, width, height);
      t < 1 ? requestAnimationFrame(frame) : resolve();
    }
    requestAnimationFrame(frame);
  });
};
