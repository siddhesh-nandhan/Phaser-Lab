// The page side of a preview. Every run gets a fresh, same-origin preview.html frame (so the browser
// treats it like the page itself), the job is sent once the frame's engine has loaded, and the frame's
// heartbeat is checked: a preview that stops drawing while the page is visible restarts itself once,
// then says so instead of claiming to run. Browsers pause drawing in background tabs; coming back
// gives the preview a fresh chance to restart.

const READY_TIMEOUT = 10000;
const SILENCE_LIMIT = 2500;

export class Preview {
  constructor(stage, { onStatus, onPick }) {
    this.stage = stage;
    this.onStatus = onStatus;
    this.onPick = onPick;
    this.runId = 0;
    this.frame = null;
    addEventListener('message', event => this.receive(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      this.visibleAt = performance.now();
      this.restarted = false;
    });
    this.visibleAt = performance.now();
    setInterval(() => this.watch(), 1000);
  }

  // Start a job: { kind, engine, ...data }.
  run(job) {
    this.start(job);
  }

  start(job, restarted = false) {
    this.clear();
    const id = String(++this.runId);
    this.job = job;
    this.restarted = restarted;
    this.state = 'loading';
    this.startedAt = performance.now();
    const frame = document.createElement('iframe');
    frame.title = 'Preview';
    frame.src = 'preview.html?run=' + id + (job.engine ? '&engine=' + job.engine : '');
    this.frame = frame;
    this.stage.append(frame);
    this.onStatus({ text: 'Preparing…' });
  }

  stop() {
    if (!this.frame) return;
    this.frame.contentWindow?.postMessage({ type: 'stop' }, location.origin);
  }

  // Remove the frame entirely; nothing keeps running in the background.
  clear() {
    this.state = 'idle';
    this.frame?.remove();
    this.frame = null;
  }

  receive(event) {
    const data = event.data;
    if (!this.frame || event.source !== this.frame.contentWindow || data?.from !== 'preview' || data.run !== String(this.runId)) return;
    switch (data.type) {
      case 'ready':
        this.frame.contentWindow.postMessage({ type: 'job', job: this.job }, location.origin);
        break;
      case 'running':
        this.state = 'running';
        this.live = Boolean(data.live);
        this.lastBeat = performance.now();
        this.onStatus({ text: data.message, info: data.size });
        break;
      case 'frame':
        if (data.fps > 0) this.lastBeat = performance.now();
        if (this.state === 'running') this.onStatus({ fps: data.fps });
        break;
      case 'done':
        this.state = 'done';
        this.onStatus({ text: data.message, info: data.size, fps: null });
        break;
      case 'stopped':
        this.state = 'stopped';
        this.onStatus({ text: data.message, fps: null });
        break;
      case 'pick':
        this.onPick?.(data.x, data.y);
        break;
      case 'error':
        this.state = 'error';
        this.onStatus({ text: data.message, error: true, fps: null });
        break;
    }
  }

  // A frame that never loads, or stops drawing while the page is visible, is restarted once.
  watch() {
    if (document.hidden || !this.frame) return;
    const now = performance.now();
    const stuckLoading = this.state === 'loading' && now - Math.max(this.startedAt, this.visibleAt) > READY_TIMEOUT;
    const silent = this.state === 'running' && this.live && now - Math.max(this.lastBeat, this.visibleAt) > SILENCE_LIMIT;
    if (!stuckLoading && !silent) return;
    if (!this.restarted) {
      this.start(this.job, true);
    } else {
      this.state = 'error';
      this.onStatus({ text: stuckLoading ? 'The preview did not load. Press Run to try again.' : 'The browser stopped drawing this preview. Press Run to restart it.', error: true, fps: null });
    }
  }
}
