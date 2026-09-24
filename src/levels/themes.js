// Cell presets per station. Track floors sit at y=0, platforms at y=1.

export const PLATFORM_Y = 1.0;

const tunnel = {
  floor: 0, ceil: 4.0, vault: 0.35, ft: 'track_bed', wt: 'rock_raw', ct: 'rock_raw',
  et: 'concrete_floor', wallH: 9, wallU: 3, wallV: 3, noise: 0.22, floorScale: 2,
};

const walkway = { ...tunnel, floor: 0.35, ft: 'concrete_floor', noise: 0.22 };

export const THEMES = {
  tunnel: { track: tunnel, walkway, service: { ...tunnel, floor: 0, ceil: 2.8, vault: 0, ft: 'concrete_floor', wt: 'tile_wall', ct: 'concrete_floor', wallU: 2, wallV: 2, noise: 0 } },

  solna: {
    track: { ...tunnel, ceil: 4.6, vault: 0.5, wt: 'rock_solna_forest', ct: 'rock_solna_red', wallH: 3.2, wallU: 8, wallV: 3.2, noise: 0.25 },
    platform: { floor: PLATFORM_Y, ceil: 4.6, vault: 0.5, ft: 'terrazzo', wt: 'rock_solna_forest', ct: 'rock_solna_red', et: 'concrete_floor', wallH: 2.2, wallU: 8, wallV: 3.2, noise: 0, floorScale: 2 },
    edge: { floor: PLATFORM_Y, ceil: 4.6, vault: 0.5, ft: 'platform_edge', wt: 'rock_solna_forest', ct: 'rock_solna_red', et: 'concrete_floor', wallH: 2.2, wallU: 8, wallV: 3.2, noise: 0, floorScale: 1 },
    cave: { floor: PLATFORM_Y, ceil: 3.4, vault: 0.35, ft: 'concrete_floor', wt: 'rock_solna_forest', ct: 'rock_solna_red', et: 'concrete_floor', wallH: 2.2, wallU: 8, wallV: 2.2, noise: 0.2, floorScale: 2 },
  },

  vskogen: {
    track: { ...tunnel, ceil: 4.4, vault: 0.45, wt: 'rock_vskogen', ct: 'rock_raw', wallH: 3.5, noise: 0.25 },
    platform: { floor: PLATFORM_Y, ceil: 4.4, vault: 0.45, ft: 'terrazzo', wt: 'rock_vskogen', ct: 'rock_raw', et: 'concrete_floor', wallH: 2.5, noise: 0, floorScale: 2, wallU: 3, wallV: 3 },
    edge: { floor: PLATFORM_Y, ceil: 4.4, vault: 0.45, ft: 'platform_edge', wt: 'rock_vskogen', ct: 'rock_raw', et: 'concrete_floor', wallH: 2.5, noise: 0, floorScale: 1, wallU: 3, wallV: 3 },
  },

  fridhem: {
    track: { ...tunnel, ceil: 4.4, vault: 0.45, wt: 'rock_fridhem', ct: 'rock_fridhem', wallH: 3.5, noise: 0.25 },
    platform: { floor: PLATFORM_Y, ceil: 4.4, vault: 0.45, ft: 'terrazzo', wt: 'rock_fridhem', ct: 'rock_fridhem', et: 'concrete_floor', wallH: 2.5, noise: 0, floorScale: 2, wallU: 3, wallV: 3 },
    edge: { floor: PLATFORM_Y, ceil: 4.4, vault: 0.45, ft: 'platform_edge', wt: 'rock_fridhem', ct: 'rock_fridhem', et: 'concrete_floor', wallH: 2.5, noise: 0, floorScale: 1, wallU: 3, wallV: 3 },
  },

  tc: {
    track: { ...tunnel, ceil: 4.8, vault: 0.5, wt: 'rock_tc_vines', ct: 'rock_tc_vines', wallH: 9, noise: 0.25 },
    platform: { floor: PLATFORM_Y, ceil: 4.8, vault: 0.5, ft: 'terrazzo', wt: 'rock_tc_vines', ct: 'rock_tc_vines', et: 'concrete_floor', wallH: 9, noise: 0, floorScale: 2, wallU: 3, wallV: 3 },
    edge: { floor: PLATFORM_Y, ceil: 4.8, vault: 0.5, ft: 'platform_edge', wt: 'rock_tc_vines', ct: 'rock_tc_vines', et: 'concrete_floor', wallH: 9, noise: 0, floorScale: 1, wallU: 3, wallV: 3 },
    hall: { floor: PLATFORM_Y, ceil: 4.2, vault: 0.4, ft: 'terrazzo', wt: 'rock_tc_vines', ct: 'rock_tc_vines', et: 'concrete_floor', wallH: 9, noise: 0.2, floorScale: 2, wallU: 3, wallV: 3 },
  },

  kungs: {
    track: { ...tunnel, ceil: 4.8, vault: 0.55, wt: 'rock_kungs', ct: 'rock_kungs', wallH: 9, noise: 0.3 },
    platform: { floor: PLATFORM_Y, ceil: 4.8, vault: 0.55, ft: 'terrazzo', wt: 'rock_kungs', ct: 'rock_kungs', et: 'concrete_floor', wallH: 9, noise: 0, floorScale: 2, wallU: 3, wallV: 3 },
    edge: { floor: PLATFORM_Y, ceil: 4.8, vault: 0.55, ft: 'platform_edge', wt: 'rock_kungs', ct: 'rock_kungs', et: 'concrete_floor', wallH: 9, noise: 0, floorScale: 1, wallU: 3, wallV: 3 },
    nest: { floor: 0.5, ceil: 5.5, vault: 0.6, ft: 'rock_raw', wt: 'mother_skin', ct: 'mother_skin', et: 'rock_raw', wallH: 9, wallU: 3, wallV: 3, noise: 0.45, floorScale: 3 },
    palace: { floor: PLATFORM_Y, ceil: 3.4, vault: 0.3, ft: 'concrete_floor', wt: 'brick', ct: 'rock_kungs', et: 'brick', wallH: 2.4, wallU: 2, wallV: 2, noise: 0.1, floorScale: 2 },
  },
};

/**
 * Carve a classic blue-line station: island platform between two tracks.
 * Tracks run along z. Returns the track centre lines.
 */
export function carveStation(g, theme, { x, z0, z1, platformW = 7, trackW = 4 }) {
  const leftTrack = [x, x + trackW - 1];
  const plat = [x + trackW, x + trackW + platformW - 1];
  const rightTrack = [plat[1] + 1, plat[1] + trackW];
  g.carve(leftTrack[0], z0, leftTrack[1], z1, theme.track);
  g.carve(plat[0], z0, plat[1], z1, theme.platform);
  g.paint(plat[0], z0, plat[0], z1, { ft: theme.edge.ft, floorScale: 1, fRot: true, fFlip: true });
  g.paint(plat[1], z0, plat[1], z1, { ft: theme.edge.ft, floorScale: 1, fRot: true });
  g.carve(rightTrack[0], z0, rightTrack[1], z1, theme.track);
  return {
    left: leftTrack[0] + trackW / 2,
    right: rightTrack[0] + trackW / 2,
    platform: [plat[0], plat[1] + 1],
  };
}

/** Carve a straight tunnel along z with rails. */
export function carveTunnelZ(g, cell, { cx, z0, z1, w = 5, rails = true, powerSide = 1 }) {
  const x0 = Math.round(cx - w / 2);
  g.carve(x0, z0, x0 + w - 1, z1, cell);
  if (rails) g.tracks.push({ axis: 'z', center: x0 + w / 2, from: Math.min(z0, z1), to: Math.max(z0, z1) + 1, y: cell.floor, powerSide });
}
