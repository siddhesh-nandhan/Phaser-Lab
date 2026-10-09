function phaserRuntime(payload, report) {
  if (!window.Phaser?.Game) throw Error('Phaser could not load. Use the local server URL.');
  document.body.replaceChildren();
  document.documentElement.style.cssText='width:100%;height:100%;overflow:hidden';
  document.body.style.cssText='margin:0;width:100%;height:100%;overflow:hidden;background:#333e40';
  // Apply the same responsive sizing to complete pasted Game examples.
  const Engine=window.Phaser;
  const games=[];
  const PreviewPhaser=Object.create(Engine);
  PreviewPhaser.Game=class extends Engine.Game {
    constructor(config={}) {
      // Preserve authored coordinates; fit the scene into the preview.
      const logicalWidth=Number(config.width)||800;
      const logicalHeight=Number(config.height)||600;
      const fitted={...config,...payload.configOverrides,parent:document.body,
        width:logicalWidth,height:logicalHeight,
        scale:{...config.scale,parent:document.body,width:logicalWidth,
          height:logicalHeight,mode:Engine.Scale.FIT,
          autoCenter:Engine.Scale.CENTER_BOTH}};
      super(fitted);
      games.push(this);
    }
  };

  const code=payload.code.replace(/\bexport\s+default\s+/g,'').replace(/\bexport\s+(?=(?:class|const|let|var|function|async)\b)/g,'');
  const names=[...code.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)\s+extends\s+Phaser\.Scene/g)].map(m=>m[1]);
  const run=new Function('Phaser','options',code+'\nreturn {scenes:['+names.map(n=>'typeof '+n+'!=="undefined"?'+n+':null').join(',')+'].filter(Boolean),config:typeof config!=="undefined"?config:null,preload:typeof preload==="function"?preload:null,create:typeof create==="function"?create:null,update:typeof update==="function"?update:null};');
  const result=run(PreviewPhaser,payload.options);let game;
  if(games.length===0) {
    const c=result.config||{};
    if(!result.scenes.length&&!c.scene&&!result.create)throw Error('Provide a Phaser.Scene class, create() function, or full Phaser.Game example.');
    game=new PreviewPhaser.Game({...c,type:c.type??Phaser.AUTO,width:c.width||800,height:c.height||600,backgroundColor:c.backgroundColor||'#333e40',parent:document.body,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,...c.scale},scene:result.scenes.length?result.scenes:c.scene||{preload:result.preload||undefined,create:result.create||undefined,update:result.update||undefined}});
  }
  const stop=()=>{for(const g of games)if(g.scene)g.destroy(true);report('ready','Stopped');};
  addEventListener('message',e=>{if(e.source===parent&&e.data==='stop')stop();});
  addEventListener('pagehide',stop);report('ready','Running Phaser 3.90 · standalone scene');
}
function needsPhaser(code){return /\bPhaser\b/.test(code)&&! /\bfunction\s+goToScene\s*\(/.test(code);}
function engineScripts(code){if(!needsPhaser(code))return '';return '<script src="http://127.0.0.1:8765/vendor/phaser.min.js"></script><script>'+phaserRuntime.toString()+'</script>';}
