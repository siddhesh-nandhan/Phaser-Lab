// Starting code for the Animation lab: a canvas animation and a Phaser scene.

export const confetti = function animationEffect(canvas, options = {}) {
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
    ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,width,height);
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
    ctx.clearRect(0,0,width,height);}};
};

// Phaser presets are whole scripts (a scene class plus a config), so this one is plain text.
export const phaserOrbit = `class Orbit extends Phaser.Scene {
  create() {
    const { count = 12, radius = 180, speed = 1400 } = options;
    const { width, height } = this.scale;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const color = Phaser.Display.Color.HSVToRGB(i / count, 0.55, 1).color;
      const box = this.add.rectangle(width / 2, height / 2, 34, 34, color);
      this.tweens.add({
        targets: box,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        angle: 180,
        duration: speed,
        delay: i * 70,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
}

const config = { width: 800, height: 600, transparent: true, scene: Orbit };`;
