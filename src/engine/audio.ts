// ─── Web Audio API Sound Effects ────────────────────────────────

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  type: OscillatorType = 'sine',
  duration = 0.15,
  vol = 0.2,
) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {
    // Silently fail if audio is not available
  }
}

export function soundCardPlay() {
  tone(320, 'triangle', 0.1, 0.25);
  setTimeout(() => tone(500, 'sine', 0.06, 0.15), 50);
}

export function soundCardDeal() {
  tone(280, 'triangle', 0.06, 0.15);
}

export function soundShuffle() {
  const freqs = [220, 260, 240, 280, 250, 310, 270, 330];
  freqs.forEach((freq, idx) => {
    setTimeout(() => tone(freq, 'triangle', 0.04, 0.1), idx * 65);
  });
}

export function soundCall() {
  tone(440, 'square', 0.07, 0.12);
  setTimeout(() => tone(660, 'square', 0.15, 0.18), 80);
}

export function soundTruco() {
  tone(350, 'sawtooth', 0.1, 0.15);
  setTimeout(() => tone(550, 'sawtooth', 0.1, 0.2), 100);
  setTimeout(() => tone(700, 'sawtooth', 0.2, 0.25), 200);
}

export function soundWinRound() {
  tone(523.25, 'triangle', 0.12, 0.2);
  setTimeout(() => tone(659.25, 'triangle', 0.12, 0.2), 100);
  setTimeout(() => tone(783.99, 'triangle', 0.25, 0.25), 200);
}

export function soundLoseRound() {
  tone(300, 'sawtooth', 0.2, 0.15);
  setTimeout(() => tone(220, 'sawtooth', 0.3, 0.2), 150);
}

export function soundMatchWin() {
  tone(523, 'triangle', 0.15, 0.25);
  setTimeout(() => tone(659, 'triangle', 0.15, 0.25), 120);
  setTimeout(() => tone(784, 'triangle', 0.15, 0.25), 240);
  setTimeout(() => tone(1047, 'triangle', 0.4, 0.3), 360);
}

export function soundButton() {
  tone(500, 'sine', 0.04, 0.08);
}
