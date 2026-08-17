'use client';

export type NotificationSoundStyle = 'chime' | 'ding' | 'subtle' | 'pop';

const SOUND_ENABLED_KEY = 'planner_notification_sound_enabled';
const SOUND_STYLE_KEY = 'planner_notification_sound_style';

/**
 * Check whether notification audio is enabled in localStorage.
 * Defaults to true.
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const item = window.localStorage.getItem(SOUND_ENABLED_KEY);
    return item === null ? true : item === 'true';
  } catch {
    return true;
  }
}

/**
 * Update notification sound preference in localStorage.
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch (err) {
    console.error('Failed to save sound preference:', err);
  }
}

/**
 * Get current notification sound style.
 */
export function getNotificationSoundStyle(): NotificationSoundStyle {
  if (typeof window === 'undefined') return 'chime';
  try {
    const item = window.localStorage.getItem(SOUND_STYLE_KEY) as NotificationSoundStyle | null;
    return item && ['chime', 'ding', 'subtle', 'pop'].includes(item) ? item : 'chime';
  } catch {
    return 'chime';
  }
}

/**
 * Set notification sound style in localStorage.
 */
export function setNotificationSoundStyle(style: NotificationSoundStyle): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STYLE_KEY, style);
  } catch (err) {
    console.error('Failed to save sound style:', err);
  }
}

// ─── Inline 16-bit PCM WAV Data URI Generator ─────────────────────────────────

const wavCache = new Map<NotificationSoundStyle, string>();

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createWavDataUri(samples: Float32Array, sampleRate = 44100): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16-bit

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function getWavDataUri(style: NotificationSoundStyle): string {
  const cached = wavCache.get(style);
  if (cached) return cached;

  const sampleRate = 44100;
  let duration = 1.4;
  if (style === 'ding') duration = 1.6;
  if (style === 'pop') duration = 0.7;
  if (style === 'subtle') duration = 1.5;

  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    switch (style) {
      case 'ding': {
        const attack = Math.min(1, t / 0.004);
        const decay = Math.exp(-t * 2.6);
        samples[i] =
          (0.6 * Math.sin(2 * Math.PI * 880.0 * t) +
            0.25 * Math.sin(2 * Math.PI * 1760.0 * t) +
            0.1 * Math.sin(2 * Math.PI * 2640.0 * t) +
            0.05 * Math.sin(2 * Math.PI * 3520.0 * t)) *
          attack *
          decay *
          0.9;
        break;
      }

      case 'pop': {
        const note1Attack = Math.min(1, t / 0.003);
        const note1Decay = Math.exp(-t * 10.0);
        const freq1 = 520 + 100 * Math.exp(-t * 30);
        const note1 = Math.sin(2 * Math.PI * freq1 * t) * note1Attack * note1Decay;

        let note2 = 0;
        if (t >= 0.1) {
          const t2 = t - 0.1;
          const note2Attack = Math.min(1, t2 / 0.003);
          const note2Decay = Math.exp(-t2 * 6.5);
          const freq2 = 880 + 120 * Math.exp(-t2 * 30);
          note2 =
            (0.8 * Math.sin(2 * Math.PI * freq2 * t2) +
              0.2 * Math.sin(2 * Math.PI * (freq2 * 2) * t2)) *
            note2Attack *
            note2Decay;
        }

        samples[i] = (note1 * 0.45 + note2 * 0.65) * 0.85;
        break;
      }

      case 'subtle': {
        const n1 = Math.sin(2 * Math.PI * 392.0 * t) * Math.min(1, t / 0.01) * Math.exp(-t * 3.2);

        let n2 = 0;
        if (t >= 0.1) {
          const t2 = t - 0.1;
          n2 = Math.sin(2 * Math.PI * 523.25 * t2) * Math.min(1, t2 / 0.01) * Math.exp(-t2 * 2.8);
        }

        let n3 = 0;
        if (t >= 0.2) {
          const t3 = t - 0.2;
          n3 = Math.sin(2 * Math.PI * 659.25 * t3) * Math.min(1, t3 / 0.01) * Math.exp(-t3 * 2.4);
        }

        samples[i] = (n1 * 0.3 + n2 * 0.35 + n3 * 0.5) * 0.8;
        break;
      }

      case 'chime':
      default: {
        const note1Attack = Math.min(1, t / 0.008);
        const note1Decay = Math.exp(-t * 3.5);
        const note1 =
          (0.7 * Math.sin(2 * Math.PI * 587.33 * t) +
            0.25 * Math.sin(2 * Math.PI * 1174.66 * t) +
            0.05 * Math.sin(2 * Math.PI * 1761.99 * t)) *
          note1Attack *
          note1Decay;

        let note2 = 0;
        if (t >= 0.12) {
          const t2 = t - 0.12;
          const note2Attack = Math.min(1, t2 / 0.008);
          const note2Decay = Math.exp(-t2 * 3.2);
          note2 =
            (0.7 * Math.sin(2 * Math.PI * 739.99 * t2) +
              0.25 * Math.sin(2 * Math.PI * 1479.98 * t2) +
              0.05 * Math.sin(2 * Math.PI * 2219.97 * t2)) *
            note2Attack *
            note2Decay;
        }

        let note3 = 0;
        if (t >= 0.24) {
          const t3 = t - 0.24;
          const note3Attack = Math.min(1, t3 / 0.008);
          const note3Decay = Math.exp(-t3 * 2.8);
          note3 =
            (0.7 * Math.sin(2 * Math.PI * 880.0 * t3) +
              0.25 * Math.sin(2 * Math.PI * 1760.0 * t3) +
              0.05 * Math.sin(2 * Math.PI * 2640.0 * t3)) *
            note3Attack *
            note3Decay;
        }

        samples[i] = (note1 * 0.3 + note2 * 0.35 + note3 * 0.55) * 0.85;
        break;
      }
    }
  }

  const uri = createWavDataUri(samples, sampleRate);
  wavCache.set(style, uri);
  return uri;
}

// ─── Web Audio API Realtime Synthesizer ────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playWebAudioTone(ctx: AudioContext, style: NotificationSoundStyle): void {
  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.9, now);
    masterGain.connect(ctx.destination);

    switch (style) {
      case 'ding': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.85, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.6);
        break;
      }

      case 'pop': {
        // Pop 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(520, now);

        gain1.gain.setValueAtTime(0.8, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.32);

        // Pop 2
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.1);

        gain2.gain.setValueAtTime(0.0001, now);
        gain2.gain.setValueAtTime(0.85, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.7);
        break;
      }

      case 'subtle': {
        // Note 1: 392Hz
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(392, now);
        gain1.gain.setValueAtTime(0.65, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.85);

        // Note 2: 523.25Hz
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(523.25, now + 0.1);
        gain2.gain.setValueAtTime(0.0001, now);
        gain2.gain.setValueAtTime(0.7, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.1);
        osc2.stop(now + 1.15);

        // Note 3: 659.25Hz
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(659.25, now + 0.2);
        gain3.gain.setValueAtTime(0.0001, now);
        gain3.gain.setValueAtTime(0.75, now + 0.2);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
        osc3.connect(gain3);
        gain3.connect(masterGain);
        osc3.start(now + 0.2);
        osc3.stop(now + 1.5);
        break;
      }

      case 'chime':
      default: {
        // Note 1: D5 (587.33Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.7, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.95);

        // Note 2: F#5 (739.99Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(739.99, now + 0.12);
        gain2.gain.setValueAtTime(0.0001, now);
        gain2.gain.setValueAtTime(0.75, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.12);
        osc2.stop(now + 1.2);

        // Note 3: A5 (880.00Hz)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(880.0, now + 0.24);
        gain3.gain.setValueAtTime(0.0001, now);
        gain3.gain.setValueAtTime(0.85, now + 0.24);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.38);
        osc3.connect(gain3);
        gain3.connect(masterGain);
        osc3.start(now + 0.24);
        osc3.stop(now + 1.4);
        break;
      }
    }
  } catch (err) {
    console.error('Web Audio tone error:', err);
  }
}

// ─── Universal Notification Sound Player ──────────────────────────────────────

/**
 * Play a notification sound chime immediately.
 * Executes Web Audio synthesizer and HTML5 Audio fallback for guaranteed playback.
 */
export function playNotificationSound(style?: NotificationSoundStyle, forcePlay = false): void {
  if (typeof window === 'undefined') return;
  if (!forcePlay && !isNotificationSoundEnabled()) return;

  const soundStyle: NotificationSoundStyle =
    style && ['chime', 'ding', 'subtle', 'pop'].includes(style)
      ? style
      : getNotificationSoundStyle();

  // 1. Play via Web Audio API synchronously in user gesture
  const ctx = getAudioContext();
  let webAudioPlayed = false;
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      playWebAudioTone(ctx, soundStyle);
      webAudioPlayed = true;
    } catch {
      webAudioPlayed = false;
    }
  }

  // 2. Play via HTML5 Audio with Data URI fallback
  if (!webAudioPlayed && typeof Audio !== 'undefined') {
    try {
      const dataUri = getWavDataUri(soundStyle);
      const audio = new Audio(dataUri);
      audio.volume = 0.95;
      void audio.play().catch(() => undefined);
    } catch {
      // Ignored
    }
  }
}
