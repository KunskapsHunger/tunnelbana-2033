import * as THREE from 'three';

// PS1-style material: per-vertex (Gouraud) lighting, vertex snapping to a
// coarse screen grid, affine (non perspective-correct) texture mapping and
// linear black fog. All materials share the same light uniforms so the
// light manager updates them once per frame.

export const MAX_POINT_LIGHTS = 12;

export const sharedUniforms = {
  uAmbient: { value: new THREE.Color(0.08, 0.08, 0.09) },
  uPointPos: { value: Array.from({ length: MAX_POINT_LIGHTS }, () => new THREE.Vector3()) },
  uPointColor: { value: Array.from({ length: MAX_POINT_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
  uPointRange: { value: new Array(MAX_POINT_LIGHTS).fill(1) },
  uSpotPos: { value: new THREE.Vector3() },
  uSpotDir: { value: new THREE.Vector3(0, 0, -1) },
  uSpotColor: { value: new THREE.Color(0, 0, 0) },
  uSpotCos: { value: Math.cos(0.5) },
  uSpotRange: { value: 26 },
  uFogColor: { value: new THREE.Color(0, 0, 0) },
  uFogNear: { value: 4 },
  uFogFar: { value: 30 },
  uSnap: { value: new THREE.Vector2(160, 120) },
  uAffine: { value: 0.85 },
  uTime: { value: 0 },
};

const vertexShader = /* glsl */ `
  #define MAX_POINT_LIGHTS ${MAX_POINT_LIGHTS}
  uniform vec3 uAmbient;
  uniform vec3 uPointPos[MAX_POINT_LIGHTS];
  uniform vec3 uPointColor[MAX_POINT_LIGHTS];
  uniform float uPointRange[MAX_POINT_LIGHTS];
  uniform vec3 uSpotPos;
  uniform vec3 uSpotDir;
  uniform vec3 uSpotColor;
  uniform float uSpotCos;
  uniform float uSpotRange;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec2 uSnap;
  uniform float uLit;
  uniform vec3 uEmissive;
  uniform vec3 uTint;
  uniform vec2 uUvOffset;
  uniform vec2 uUvScale;
  #ifdef USE_VCOLOR
  attribute vec3 color;
  #endif
  varying vec2 vUvAffine;
  varying float vW;
  varying vec2 vUvPersp;
  varying vec3 vLight;
  varying float vFog;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 N = normalize(mat3(modelMatrix) * normal);
    vec3 light = uAmbient;
    for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
      vec3 L = uPointPos[i] - world.xyz;
      float d = length(L) + 1e-4;
      float att = clamp(1.0 - d / uPointRange[i], 0.0, 1.0);
      att *= att;
      float ndl = max(dot(N, L / d), 0.0) * 0.75 + 0.25;
      light += uPointColor[i] * att * ndl;
    }
    vec3 S = world.xyz - uSpotPos;
    float sd = length(S) + 1e-4;
    float cosA = dot(S / sd, uSpotDir);
    float cone = smoothstep(uSpotCos, uSpotCos + 0.12, cosA);
    float sAtt = clamp(1.0 - sd / uSpotRange, 0.0, 1.0);
    float sNdl = max(dot(N, -S / sd), 0.0) * 0.7 + 0.3;
    light += uSpotColor * cone * sAtt * sAtt * sNdl;
    light = mix(vec3(1.0), light, uLit);
    #ifdef USE_VCOLOR
    light *= color;
    #endif
    vLight = light * uTint + uEmissive;

    vec4 view = viewMatrix * world;
    vec4 clip = projectionMatrix * view;
    // Snap to a coarse grid in screen space (PS1 lacks sub-pixel precision).
    vec2 ndc = clip.xy / clip.w;
    ndc = floor(ndc * uSnap + 0.5) / uSnap;
    clip.xy = ndc * clip.w;
    gl_Position = clip;

    vec2 uv2 = uv * uUvScale + uUvOffset;
    vUvPersp = uv2;
    vUvAffine = uv2 * clip.w;
    vW = clip.w;
    vFog = clamp((-view.z - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float uHasMap;
  uniform vec3 uColor;
  uniform vec3 uFogColor;
  uniform float uAffine;
  uniform float uAlphaTest;
  uniform float uOpacity;
  varying vec2 vUvAffine;
  varying float vW;
  varying vec2 vUvPersp;
  varying vec3 vLight;
  varying float vFog;

  void main() {
    vec2 uv = mix(vUvPersp, vUvAffine / vW, uAffine);
    vec4 tex = uHasMap > 0.5 ? texture2D(map, uv) : vec4(1.0);
    if (tex.a < uAlphaTest) discard;
    vec3 col = tex.rgb * uColor * min(vLight, vec3(2.0));
    col = mix(col, uFogColor, vFog);
    gl_FragColor = vec4(col, tex.a * uOpacity);
  }
`;

/**
 * @param {object} opts
 * @param {THREE.Texture=} opts.map
 * @param {THREE.Color|number=} opts.color
 * @param {boolean=} opts.lit  false = fullbright (fx, signs)
 * @param {boolean=} opts.vertexColors
 * @param {number=} opts.alphaTest
 * @param {boolean=} opts.transparent
 * @param {boolean=} opts.additive
 * @param {number=} opts.side
 */
export function createPS1Material(opts = {}) {
  const uniforms = {
    ...sharedUniforms,
    map: { value: opts.map ?? null },
    uHasMap: { value: opts.map ? 1 : 0 },
    uColor: { value: new THREE.Color(opts.color ?? 0xffffff) },
    uLit: { value: opts.lit === false ? 0 : 1 },
    uEmissive: { value: new THREE.Color(opts.emissive ?? 0x000000) },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uAlphaTest: { value: opts.alphaTest ?? 0.5 },
    uOpacity: { value: opts.opacity ?? 1 },
    uUvOffset: { value: new THREE.Vector2(0, 0) },
    uUvScale: { value: new THREE.Vector2(1, 1) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    defines: opts.vertexColors ? { USE_VCOLOR: '' } : {},
    transparent: !!opts.transparent || !!opts.additive,
    depthWrite: !(opts.transparent || opts.additive),
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: opts.side ?? THREE.FrontSide,
  });
  mat.userData.ps1 = true;
  return mat;
}

export function setMaterialMap(mat, tex) {
  mat.uniforms.map.value = tex;
  mat.uniforms.uHasMap.value = tex ? 1 : 0;
}
