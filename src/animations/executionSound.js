let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();
  }

  return audioContext;
}

export function playLoopSound() {
  const ctx = getAudioContext();

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Main tone — audible on laptop speakers
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";

  oscillator.frequency.setValueAtTime(240, now);

  // Descending pitch creates the "thmm" feeling.
  oscillator.frequency.exponentialRampToValueAtTime(
    145,
    now + 0.20
  );

  gain.gain.setValueAtTime(0.0001, now);

  gain.gain.exponentialRampToValueAtTime(
    0.20,
    now + 0.012
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + 0.32
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.34);
}
