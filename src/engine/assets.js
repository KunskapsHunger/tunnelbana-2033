import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createPS1Material, setMaterialMap } from './ps1Material.js';

// Loads textures and GLB models. Missing files degrade gracefully to a
// generated checker texture / placeholder box so the game always runs.

const BASE = `${import.meta.env.BASE_URL}assets/`;
const textureCache = new Map();
const modelCache = new Map();
const materialCache = new Map();
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

function prepTexture(tex) {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function fallbackTexture(name) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const on = ((x >> 2) + (y >> 2)) % 2 === 0;
      g.fillStyle = `hsl(${hue},25%,${on ? 38 : 26}%)`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return prepTexture(new THREE.CanvasTexture(c));
}

export function loadTexture(name) {
  if (textureCache.has(name)) return textureCache.get(name).promise;
  const entry = {};
  if (name === 'fallback') {
    entry.tex = fallbackTexture(name);
    entry.promise = Promise.resolve(entry.tex);
    textureCache.set(name, entry);
    return entry.promise;
  }
  entry.promise = new Promise((resolve) => {
    texLoader.load(
      `${BASE}textures/${name}.png`,
      (tex) => { entry.tex = prepTexture(tex); resolve(entry.tex); },
      undefined,
      () => {
        console.warn(`[assets] missing texture ${name}`);
        entry.tex = fallbackTexture(name);
        resolve(entry.tex);
      },
    );
  });
  textureCache.set(name, entry);
  return entry.promise;
}

export function getTexture(name) {
  const entry = textureCache.get(name);
  return entry?.tex ?? null;
}

export async function preloadTextures(names) {
  await Promise.all(names.map(loadTexture));
}

/** Shared PS1 material for a texture name (world geometry, props). */
export function materialFor(name, opts = {}) {
  const key = `${name}|${JSON.stringify(opts)}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const tex = getTexture(name);
  const alpha = /grate|graffiti|blood|bullet|fx_|sign_t|hud_/.test(name);
  const mat = createPS1Material({ map: tex ?? fallbackTexture(name), alphaTest: alpha ? 0.5 : 0.01, ...opts });
  materialCache.set(key, mat);
  // Not loaded yet: swap the real texture in as soon as it arrives.
  if (!tex && name !== 'fallback') loadTexture(name).then((t) => setMaterialMap(mat, t));
  return mat;
}

function fallbackModel(name) {
  const group = new THREE.Group();
  group.name = name;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5).translate(0, 0.5, 0), materialFor('fallback'));
  mesh.name = 'body';
  group.add(mesh);
  return group;
}

export function loadModel(name) {
  if (modelCache.has(name)) return modelCache.get(name);
  const p = new Promise((resolve) => {
    gltfLoader.load(
      `${BASE}models/${name}.glb`,
      (gltf) => resolve(gltf.scene),
      undefined,
      () => {
        console.warn(`[assets] missing model ${name}`);
        resolve(fallbackModel(name));
      },
    );
  });
  modelCache.set(name, p);
  return p;
}

/**
 * Clone a loaded model and swap every material for a PS1 material chosen by
 * the source material's name (= texture name).
 * @param {boolean} unique  give this instance its own materials (for tint/flash)
 */
export async function instantiateModel(name, { unique = false, lit = true } = {}) {
  const src = await loadModel(name);
  const root = src.clone(true);
  const pending = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const texName = (o.material?.name || 'fallback').replace(/\.\d+$/, '');
    pending.push(loadTexture(texName).then(() => {
      o.material = unique
        ? createPS1Material({ map: getTexture(texName), alphaTest: 0.5, lit })
        : materialFor(texName, lit ? {} : { lit: false });
    }));
    o.frustumCulled = true;
  });
  await Promise.all(pending);
  return root;
}

export function findPart(root, name) {
  let found = null;
  root.traverse((o) => { if (!found && o.name === name) found = o; });
  return found;
}
