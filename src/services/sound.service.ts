import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  play(type: 'click' | 'success' | 'alert'): void {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      let frequency = 440;
      let duration = 0.15;

      if (type === 'click') {
        frequency = 440;
        duration = 0.08;
      } else if (type === 'success') {
        frequency = 880;
        duration = 0.2;
      } else if (type === 'alert') {
        frequency = 220;
        duration = 0.25;
      }

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (err) {
      console.warn('Audio playback failed', err);
    }
  }
}
