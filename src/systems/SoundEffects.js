/**
 * Tiny synthesised sound-effect module. Uses the Web Audio API so no
 * audio assets need to be shipped. The AudioContext is lazily created on
 * first play (browsers require a user gesture, which the windup/strike
 * inputs naturally are).
 */
export class SoundEffects {
  constructor() {
    this._ctx = null;
    this._muted = false;
    this._windupNodes = null;
  }

  _ensureContext() {
    if (this._ctx) return this._ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this._ctx = new Ctx();
    return this._ctx;
  }

  setMuted(value) {
    this._muted = !!value;
    if (this._muted) this.stopWindup();
  }

  /**
   * Starts a sustained whoosh that pitches up over the windup ramp. Safe
   * to call repeatedly; only one windup plays at a time.
   */
  playWindup({ rampSeconds = 0.22 } = {}) {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    this.stopWindup();

    const now = ctx.currentTime;
    const noise = this._createNoiseSource(ctx, rampSeconds + 0.2);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.value = 6;
    bandpass.frequency.setValueAtTime(180, now);
    bandpass.frequency.exponentialRampToValueAtTime(900, now + rampSeconds);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.22, now + rampSeconds);

    noise.connect(bandpass).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + rampSeconds + 0.2);

    this._windupNodes = { gain, noise };
  }

  /**
   * Quickly fades out an in-flight windup whoosh (used when the player
   * releases very early or aborts).
   */
  stopWindup() {
    if (!this._windupNodes || !this._ctx) return;
    const { gain, noise } = this._windupNodes;
    const now = this._ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      noise.stop(now + 0.08);
    } catch {
      // Ignore — node may already be stopped.
    }
    this._windupNodes = null;
  }

  /**
   * Heavy thud: a low sine "boom" plus a short noise crack for the impact
   * transient.
   */
  playStrike() {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    this.stopWindup();

    const now = ctx.currentTime;

    // Low-freq boom
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.45, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // Noise crack (impact transient)
    const noise = this._createNoiseSource(ctx, 0.12);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.32, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    noise.connect(hp).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  /**
   * Wet "squash" splat for when the hammer connects with a bug: a sharp
   * highpassed noise burst with a quick downward-pitched body thump.
   */
  playSquash() {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Splat body — short pitch-dropping square for a wet "squelch".
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    // Splatter noise — mid-band burst for the squish texture.
    const noise = this._createNoiseSource(ctx, 0.16);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 1.2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.3, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    noise.connect(bp).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.18);
  }

  playJump() {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playBreach() {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.18, now + 0.008);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    const noise = this._createNoiseSource(ctx, 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.12);
  }

  playPickup() {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playResolve() {
    if (this._muted) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const first = ctx.createOscillator();
    first.type = 'sine';
    first.frequency.setValueAtTime(520, now);
    const firstGain = ctx.createGain();
    firstGain.gain.setValueAtTime(0.0001, now);
    firstGain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
    firstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    first.connect(firstGain).connect(ctx.destination);
    first.start(now);
    first.stop(now + 0.1);

    const second = ctx.createOscillator();
    second.type = 'sine';
    second.frequency.setValueAtTime(780, now + 0.06);
    const secondGain = ctx.createGain();
    secondGain.gain.setValueAtTime(0.0001, now + 0.05);
    secondGain.gain.exponentialRampToValueAtTime(0.08, now + 0.07);
    secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    second.connect(secondGain).connect(ctx.destination);
    second.start(now + 0.06);
    second.stop(now + 0.16);
  }

  _createNoiseSource(ctx, durationSeconds) {
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }
}
