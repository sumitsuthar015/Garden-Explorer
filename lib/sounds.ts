/**
 * Tiny synthesised sound effects for the learning flow.
 *
 * Generated with the Web Audio API, so there are no audio files to download.
 * Sounds only ever play in response to something the visitor just did (they are
 * never autoplayed), stay quiet, and can be switched off from the header — the
 * choice is remembered in this browser only.
 */

export type SoundName = "correct" | "tryAgain" | "complete" | "badge" | "pop";

type Note = readonly [frequency: number, start: number, duration: number];

const SOUNDS: Record<SoundName, { wave: OscillatorType; volume: number; notes: readonly Note[] }> = {
  // Rising two-note chime.
  correct: { wave: "triangle", volume: 0.16, notes: [[659.25, 0, 0.12], [987.77, 0.1, 0.22]] },
  // Soft, friendly "hmm" — never a buzzer.
  tryAgain: { wave: "sine", volume: 0.1, notes: [[440, 0, 0.14], [392, 0.13, 0.2]] },
  // Little fanfare: C–E–G–C.
  complete: {
    wave: "triangle",
    volume: 0.16,
    notes: [[523.25, 0, 0.12], [659.25, 0.11, 0.12], [783.99, 0.22, 0.12], [1046.5, 0.33, 0.34]],
  },
  badge: { wave: "sine", volume: 0.15, notes: [[783.99, 0, 0.1], [1046.5, 0.09, 0.1], [1318.51, 0.18, 0.3]] },
  pop: { wave: "sine", volume: 0.07, notes: [[880, 0, 0.07]] },
};

const STORAGE_KEY = "garden-explorer:sound";
const listeners = new Set<() => void>();
let context: AudioContext | null = null;

export function isSoundOn(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this visit.
  }
  for (const listener of listeners) listener();
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined" || !isSoundOn()) return;

  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();

    const { wave, volume, notes } = SOUNDS[name];
    const now = context.currentTime;

    for (const [frequency, start, duration] of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = now + start;

      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.05);
    }
  } catch {
    // Audio is a nicety; never let it break the lesson.
  }
}
