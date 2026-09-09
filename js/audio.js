/**
 * Mohammed-Taqi Jalil - Spatial Workstation Audio Engine
 * Zero external audio files: synthesizes realistic mechanical key clicks,
 * CRT power hums, and UI feedback via the Web Audio API.
 */

(function (window) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) {
        this.init();
        this.playTone(520, 0.04, 'sine', 0.08);
      }
      return this.enabled;
    }

    playTone(freq, duration = 0.05, type = 'triangle', gainLevel = 0.08) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (err) {
        // Silently fallback if audio permissions are blocked
      }
    }

    /**
     * Mechanical keypress click (randomized frequency to mimic physical keyboard)
     */
    playKeyClick() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const freq = 680 + Math.random() * 240;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.025);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.028);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.03);
      } catch (err) {}
    }

    /**
     * Camera zoom sound (CRT beam warm up)
     */
    playZoomIn() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.09, this.ctx.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.32);
      } catch (err) {}
    }

    /**
     * Camera zoom out sound
     */
    playZoomOut() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.22);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.26);
      } catch (err) {}
    }

    /**
     * Window open sound
     */
    playWindowOpen() {
      this.playTone(520, 0.06, 'triangle', 0.07);
    }

    /**
     * Window close sound
     */
    playWindowClose() {
      this.playTone(340, 0.05, 'triangle', 0.06);
    }

    /**
     * Warm harmonic chord chime for audiophile headphones
     */
    playWarmChord() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const freqs = [329.63, 440.0, 554.37]; // E major warm triad
        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.04);
          gain.gain.setValueAtTime(0.06, this.ctx.currentTime + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.04 + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.04);
          osc.stop(this.ctx.currentTime + idx * 0.04 + 0.65);
        });
      } catch (err) {}
    }
  }

  window.soundEngine = new SoundEngine();
})(window);
