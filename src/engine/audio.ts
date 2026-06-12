import type { AudioBus, SfxId } from './types';

/** All SFX are synthesized — no audio assets. Each id maps to a tiny motif of
 * oscillator tones / noise bursts. */
export class WebAudio implements AudioBus {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;

  /** Call from a user gesture (first keydown) to satisfy autoplay policy. */
  unlock(): void {
    if (this.ac) {
      if (this.ac.state === 'suspended') void this.ac.resume();
      return;
    }
    try {
      this.ac = new AudioContext();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ac.destination);
    } catch {
      this.ac = null;
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    vol = 0.5,
    slideTo?: number,
    delay = 0,
  ): void {
    if (!this.ac || !this.master) return;
    const t0 = this.ac.currentTime + delay;
    const osc = this.ac.createOscillator();
    const g = this.ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, delay = 0, lowpass = 800): void {
    if (!this.ac || !this.master) return;
    const t0 = this.ac.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const filt = this.ac.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  play(id: SfxId): void {
    if (!this.ac) return;
    switch (id) {
      case 'blip':
        this.tone(520, 0.05, 'square', 0.25);
        break;
      case 'confirm':
        this.tone(660, 0.06, 'square', 0.3);
        this.tone(880, 0.08, 'square', 0.3, undefined, 0.05);
        break;
      case 'cancel':
        this.tone(330, 0.05, 'square', 0.25);
        this.tone(220, 0.09, 'square', 0.25, undefined, 0.04);
        break;
      case 'denied':
        this.tone(120, 0.09, 'sawtooth', 0.35);
        this.tone(110, 0.12, 'sawtooth', 0.35, undefined, 0.09);
        break;
      case 'scan':
        this.tone(880, 0.22, 'sine', 0.3, 1318);
        break;
      case 'scanDeep':
        this.tone(660, 0.45, 'sine', 0.3, 1760);
        this.tone(330, 0.45, 'sine', 0.15, 880, 0.05);
        break;
      case 'hit':
        this.tone(330, 0.08, 'square', 0.35, 196);
        this.noise(0.05, 0.15, 0, 2000);
        break;
      case 'bigHit':
        this.tone(392, 0.12, 'square', 0.4, 262);
        this.tone(523, 0.16, 'square', 0.3, 330, 0.03);
        this.noise(0.1, 0.2, 0, 1500);
        break;
      case 'zeroHit':
        this.tone(180, 0.15, 'triangle', 0.35, 90);
        break;
      case 'soothe':
        this.tone(523, 0.15, 'sine', 0.3, 659);
        break;
      case 'suspicion':
        this.tone(740, 0.05, 'triangle', 0.35);
        this.tone(740, 0.05, 'triangle', 0.35, undefined, 0.09);
        break;
      case 'sign':
        this.tone(440, 0.1, 'square', 0.3);
        this.tone(554, 0.1, 'square', 0.3, undefined, 0.09);
        this.tone(659, 0.22, 'square', 0.35, undefined, 0.18);
        this.tone(880, 0.3, 'sine', 0.25, undefined, 0.26);
        break;
      case 'flee':
        this.tone(600, 0.3, 'square', 0.35, 150);
        this.noise(0.25, 0.25, 0.05, 3000);
        break;
      case 'coin':
        this.tone(988, 0.05, 'square', 0.3);
        this.tone(1319, 0.12, 'square', 0.3, undefined, 0.05);
        break;
      case 'satan':
        this.tone(55, 1.4, 'sawtooth', 0.5, 36);
        this.noise(1.3, 0.4, 0, 220);
        this.tone(110, 0.7, 'sawtooth', 0.25, 55, 0.25);
        break;
      case 'door':
        this.tone(180, 0.07, 'triangle', 0.3, 140);
        break;
      case 'levelup':
        this.tone(523, 0.08, 'square', 0.3);
        this.tone(659, 0.08, 'square', 0.3, undefined, 0.08);
        this.tone(784, 0.08, 'square', 0.3, undefined, 0.16);
        this.tone(1047, 0.25, 'square', 0.35, undefined, 0.24);
        break;
    }
  }
}
