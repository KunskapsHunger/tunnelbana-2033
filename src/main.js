import { Game } from './game/game.js';

const game = new Game(document.getElementById('gl'), document.getElementById('hud'));
game.start();

// ?level=<id> skips the title screen (development / testing).
const params = new URLSearchParams(location.search);
const level = params.get('level');
game.boot().then(() => {
  if (level) game.startLevel(level);
});

// Debug hooks (used by automated playtesting).
window.__game = game;
// Advance the simulation deterministically (rAF is throttled in hidden tabs).
window.__step = (frames = 1, dt = 1 / 60, before = null) => {
  for (let i = 0; i < frames; i++) {
    before?.(i);
    game.update(dt);
  }
};
window.__tp = (x, z, yaw = 0, pitch = 0) => {
  const p = game.player;
  p.spawn(x, game.world.grid.floorAt(x, z), z, yaw);
  p.pitch = pitch;
};
