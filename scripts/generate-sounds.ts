import fs from 'node:fs';
import path from 'node:path';

function createWavBuffer(samples: Float32Array, sampleRate = 44100): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 for Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * 1 * 2)
  buffer.writeUInt16LE(2, 32); // BlockAlign (1 * 2)
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16-bit)

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    buffer.writeInt16LE(intVal, offset);
  }

  return buffer;
}

const sampleRate = 44100;
const soundsDir = path.join(process.cwd(), 'public', 'sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// 1. Chime: Rich 3-note ascending chord (D5 587.33Hz -> F#5 739.99Hz -> A5 880.00Hz), ~1.4s duration
{
  const duration = 1.4;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Note 1: D5 (587.33Hz) starts at t = 0s
    const note1Attack = Math.min(1, t / 0.008);
    const note1Decay = Math.exp(-t * 3.5);
    const note1 =
      (0.7 * Math.sin(2 * Math.PI * 587.33 * t) +
        0.25 * Math.sin(2 * Math.PI * 1174.66 * t) +
        0.05 * Math.sin(2 * Math.PI * 1761.99 * t)) *
      note1Attack *
      note1Decay;

    // Note 2: F#5 (739.99Hz) starts at t = 0.12s
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

    // Note 3: A5 (880.00Hz) starts at t = 0.24s (main resonant tone)
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
  }

  fs.writeFileSync(path.join(soundsDir, 'chime.wav'), createWavBuffer(samples, sampleRate));
}

// 2. Ding: Resonant singing glass bell (880Hz + harmonics with long sustain tail), ~1.6s duration
{
  const duration = 1.6;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.004);
    const decay = Math.exp(-t * 2.6);
    const s =
      (0.6 * Math.sin(2 * Math.PI * 880.0 * t) +
        0.25 * Math.sin(2 * Math.PI * 1760.0 * t) +
        0.1 * Math.sin(2 * Math.PI * 2640.0 * t) +
        0.05 * Math.sin(2 * Math.PI * 3520.0 * t)) *
      attack *
      decay *
      0.9;
    samples[i] = s;
  }

  fs.writeFileSync(path.join(soundsDir, 'ding.wav'), createWavBuffer(samples, sampleRate));
}

// 3. Pop: Pleasant double-pop marimba chime (520Hz -> 880Hz), ~0.7s duration
{
  const duration = 0.7;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Pop 1: 520Hz with slight frequency sweep
    const note1Attack = Math.min(1, t / 0.003);
    const note1Decay = Math.exp(-t * 10.0);
    const freq1 = 520 + 100 * Math.exp(-t * 30);
    const note1 = Math.sin(2 * Math.PI * freq1 * t) * note1Attack * note1Decay;

    // Pop 2: 880Hz starts at t = 0.1s
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
  }

  fs.writeFileSync(path.join(soundsDir, 'pop.wav'), createWavBuffer(samples, sampleRate));
}

// 4. Subtle: Warm gentle 3-tone ambient chord (G4 392Hz -> C5 523.25Hz -> E5 659.25Hz), ~1.5s duration
{
  const duration = 1.5;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Note 1: 392Hz (G4)
    const n1 = Math.sin(2 * Math.PI * 392.0 * t) * Math.min(1, t / 0.01) * Math.exp(-t * 3.2);

    // Note 2: 523.25Hz (C5) at t = 0.1s
    let n2 = 0;
    if (t >= 0.1) {
      const t2 = t - 0.1;
      n2 = Math.sin(2 * Math.PI * 523.25 * t2) * Math.min(1, t2 / 0.01) * Math.exp(-t2 * 2.8);
    }

    // Note 3: 659.25Hz (E5) at t = 0.2s
    let n3 = 0;
    if (t >= 0.2) {
      const t3 = t - 0.2;
      n3 = Math.sin(2 * Math.PI * 659.25 * t3) * Math.min(1, t3 / 0.01) * Math.exp(-t3 * 2.4);
    }

    samples[i] = (n1 * 0.3 + n2 * 0.35 + n3 * 0.5) * 0.8;
  }

  fs.writeFileSync(path.join(soundsDir, 'subtle.wav'), createWavBuffer(samples, sampleRate));
}

console.log('Successfully generated updated rich notification sounds in public/sounds/');
