// WebAudio wrapper: one-shot SFX (optionally positional), looping ambience
// and music with crossfades. Buffers are loaded lazily and cached; missing
// files are silently ignored so the game never blocks on audio.

import { SFX_NAMES } from './soundList.js';

const BASE = `${import.meta.env.BASE_URL}assets/audio/`;

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.loading = new Map();
    this.volumes = { master: 0.9, sfx: 1, music: 0.55 };
    this.musicTrack = null;
    this.ambTrack = null;
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (!this.ctx) {
      queueMicrotask(() => this.preload(SFX_NAMES));
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfxBus.gain.value = this.volumes.sfx;
    this.musicBus.gain.value = this.volumes.music;
  }

  load(name) {
    if (!this.ctx) return Promise.resolve(null);
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
    if (this.loading.has(name)) return this.loading.get(name);
    const p = fetch(`${BASE}${name}.ogg`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((buf) => { this.buffers.set(name, buf); return buf; })
      .catch(() => { this.buffers.set(name, null); return null; });
    this.loading.set(name, p);
    return p;
  }

  preload(names) {
    return Promise.all(names.map((n) => this.load(n)));
  }

  setListener(pos, forward) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(pos.x, t);
      l.positionY.setValueAtTime(pos.y, t);
      l.positionZ.setValueAtTime(pos.z, t);
      l.forwardX.setValueAtTime(forward.x, t);
      l.forwardY.setValueAtTime(forward.y, t);
      l.forwardZ.setValueAtTime(forward.z, t);
      l.upX.setValueAtTime(0, t);
      l.upY.setValueAtTime(1, t);
      l.upZ.setValueAtTime(0, t);
    } else {
      l.setPosition(pos.x, pos.y, pos.z);
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  /**
   * Play a one-shot (or looping) sound.
   * @returns {{stop:Function, setPosition:Function, gain:GainNode}|null}
   */
  play(name, { volume = 1, rate = 1, pos = null, loop = false, bus = 'sfx', refDistance = 3, maxDistance = 40 } = {}) {
    if (!this.ctx) return null;
    const handle = { stopped: false, src: null, gain: null, panner: null };
    handle.stop = (fade = 0.05) => {
      handle.stopped = true;
      if (handle.src && handle.gain) {
        const t = this.ctx.currentTime;
        handle.gain.gain.setTargetAtTime(0, t, fade / 3);
        try { handle.src.stop(t + fade + 0.05); } catch { /* already stopped */ }
      }
    };
    handle.setPosition = (p) => {
      if (handle.panner) {
        handle.panner.positionX.value = p.x;
        handle.panner.positionY.value = p.y;
        handle.panner.positionZ.value = p.z;
      }
    };
    const start = (buf) => {
      if (!buf || handle.stopped) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = loop;
      src.playbackRate.value = rate;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      let node = src;
      if (pos) {
        const panner = this.ctx.createPanner();
        panner.panningModel = 'equalpower';
        panner.distanceModel = 'inverse';
        panner.refDistance = refDistance;
        panner.maxDistance = maxDistance;
        panner.rolloffFactor = 1.3;
        panner.positionX.value = pos.x;
        panner.positionY.value = pos.y;
        panner.positionZ.value = pos.z;
        node.connect(panner);
        node = panner;
        handle.panner = panner;
      }
      node.connect(gain);
      gain.connect(bus === 'music' ? this.musicBus : this.sfxBus);
      src.start();
      handle.src = src;
      handle.gain = gain;
    };
    const cached = this.buffers.get(name);
    if (cached !== undefined) start(cached);
    else this.load(name).then(start);
    return handle;
  }

  playMusic(name, fade = 2) {
    if (this.musicTrack?.name === name) return;
    this.musicTrack?.handle?.stop(fade);
    if (!name) { this.musicTrack = null; return; }
    const handle = this.play(name, { loop: true, bus: 'music', volume: 0 });
    if (handle) {
      const ramp = () => {
        if (!handle.gain) { setTimeout(ramp, 100); return; }
        handle.gain.gain.setTargetAtTime(1, this.ctx.currentTime, fade / 3);
      };
      ramp();
    }
    this.musicTrack = { name, handle };
  }

  playAmbience(name, volume = 0.7) {
    if (this.ambTrack?.name === name) return;
    this.ambTrack?.handle?.stop(1.5);
    this.ambTrack = name ? { name, handle: this.play(name, { loop: true, volume }) } : null;
  }

  stopAll() {
    this.playMusic(null);
    this.playAmbience(null);
  }
}

export const audio = new AudioSystem();
