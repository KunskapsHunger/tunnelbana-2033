// Checkpoint save + settings persistence in localStorage (guarded: storage
// may be unavailable in private windows).

const SAVE_KEY = 'tunnelbana2033.save.v1';
const SETTINGS_KEY = 'tunnelbana2033.settings.v1';

export const DEFAULT_SETTINGS = {
  sensitivity: 1,
  volume: 0.9,
  music: 0.55,
  resolution: 240,
  brightness: 0.5,
  difficulty: 1,
  jitter: true,
  affine: true,
  dither: true,
  invertY: false,
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isValidSave(s) {
  return s && typeof s === 'object' && typeof s.level === 'string' && typeof s.health === 'number' && s.arsenal && Array.isArray(s.arsenal.owned);
}

export class SaveStore {
  constructor() {
    this.memory = null;
  }

  exists() {
    return isValidSave(this.load());
  }

  load() {
    const s = read(SAVE_KEY) ?? this.memory;
    return isValidSave(s) ? s : null;
  }

  store(data) {
    this.memory = data;
    write(SAVE_KEY, data);
  }

  clear() {
    this.memory = null;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }

  loadSettings() {
    return { ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) ?? {}) };
  }

  storeSettings(s) {
    write(SETTINGS_KEY, s);
  }
}
