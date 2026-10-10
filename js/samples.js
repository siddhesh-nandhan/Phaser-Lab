// Two sample screens, so Screen transitions works before anything is uploaded.
function sample(title, line, [start, end]) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 960, 600);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 600);
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  for (let x = 60; x < 960; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
  for (let y = 60; y < 600; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('SAMPLE SCREEN', 64, 84);
  ctx.fillStyle = '#fff';
  ctx.font = '600 76px system-ui, sans-serif';
  ctx.fillText(title, 64, 312);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(line, 66, 362);
  return canvas.toDataURL('image/png');
}

export const sampleScreens = () => ({
  from: { src: sample('Current screen', 'This screen dissolves away.', ['#3a2150', '#b52c50']), name: 'Sample screen' },
  to: { src: sample('Next screen', 'This screen is revealed underneath.', ['#102e55', '#187b98']), name: 'Sample screen' },
});
