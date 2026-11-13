import { dive } from "./dive";

type Bed = {
  ctx: AudioContext;
  master: GainNode;
  air: GainNode;
  deep: GainNode;
  craft: GainNode;
  filter: BiquadFilterNode;
};

let bed: Bed | null = null;
let timer = 0;
let want = false;

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.96 + white * 0.04;
    data[i] = last * 3.2;
  }
  return buffer;
}

function makeBed(): Bed {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const buffer = noiseBuffer(ctx, 3);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  const air = ctx.createGain();
  air.gain.value = 0.22;
  source.connect(filter);
  filter.connect(air);
  air.connect(master);
  source.start();

  const deep = ctx.createGain();
  deep.gain.value = 0.02;
  const a = ctx.createOscillator();
  a.type = "sine";
  a.frequency.value = 52;
  const b = ctx.createOscillator();
  b.type = "sine";
  b.frequency.value = 78;
  const low = ctx.createGain();
  low.gain.value = 0.45;
  a.connect(low);
  b.connect(low);
  low.connect(deep);
  deep.connect(master);
  a.start();
  b.start();

  const craft = ctx.createGain();
  craft.gain.value = 0;
  const hum = ctx.createOscillator();
  hum.type = "triangle";
  hum.frequency.value = 146;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.08;
  hum.connect(humGain);
  humGain.connect(craft);
  craft.connect(master);
  hum.start();

  return { ctx, master, air, deep, craft, filter };
}

function mix(): void {
  if (!bed) return;
  const depth = Math.max(0, -dive.cameraY);
  const under = Math.min(1, depth / 8);
  const abyss = Math.min(1, Math.max(0, depth - 18) / 30);
  const nearCraft = Math.min(1, Math.max(0, dive.smooth - 0.55) / 0.25) * (1 - Math.min(1, Math.max(0, dive.smooth - 0.9) / 0.1));
  const now = bed.ctx.currentTime;
  bed.filter.frequency.setTargetAtTime(900 - under * 640 - abyss * 120, now, 0.4);
  bed.air.gain.setTargetAtTime(0.2 * (1 - under * 0.72), now, 0.4);
  bed.deep.gain.setTargetAtTime(0.015 + under * 0.05 + abyss * 0.04, now, 0.4);
  bed.craft.gain.setTargetAtTime(nearCraft * 0.9, now, 0.3);
}

export function setAmbient(on: boolean): void {
  want = on;
  if (!on) {
    if (bed) bed.master.gain.setTargetAtTime(0, bed.ctx.currentTime, 0.08);
    if (timer) window.clearInterval(timer);
    timer = 0;
    return;
  }
  if (!bed) bed = makeBed();
  void bed.ctx.resume();
  bed.master.gain.setTargetAtTime(0.9, bed.ctx.currentTime, 0.15);
  mix();
  if (!timer) timer = window.setInterval(mix, 200);
}

export function ambientWanted(): boolean {
  return want;
}
