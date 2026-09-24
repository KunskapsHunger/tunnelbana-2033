import * as THREE from 'three';
import { sharedUniforms } from './ps1Material.js';

// Renders the world at a tiny internal resolution into a render target,
// then upscales it with nearest filtering through a post shader that
// quantises to 15-bit colour with a 4x4 ordered dither.

export const INTERNAL_HEIGHT = 240;

const postVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const postFragment = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uRes;
  uniform float uLevels;
  uniform float uDither;
  uniform float uDamage;
  uniform float uToxic;
  uniform float uFade;
  uniform float uTime;
  uniform float uNoise;
  uniform float uGamma;
  varying vec2 vUv;

  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m[16];
    m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0;
    m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0;
    m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
    for (int k = 0; k < 16; k++) { if (k == i) return m[k] / 16.0 - 0.5; }
    return 0.0;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 px = floor(vUv * uRes);
    vec3 c = texture2D(tDiffuse, (px + 0.5) / uRes).rgb;
    // Mild film grain so darkness is never perfectly flat.
    c += (hash(px + fract(uTime) * 91.0) - 0.5) * uNoise;
    vec2 d = vUv - 0.5;
    float vig = dot(d, d);
    c *= 1.0 - vig * 0.9;
    c = mix(c, vec3(c.r * 0.6 + c.g * 0.3, c.g * 1.1, c.b * 0.5), uToxic * 0.5);
    c = mix(c, vec3(0.6, 0.0, 0.0), clamp(uDamage * (0.3 + vig * 3.0), 0.0, 0.8));
    c *= 1.0 - uFade;
    c = pow(max(c, vec3(0.0)), vec3(uGamma));
    c += bayer(px) * uDither / uLevels;
    c = floor(clamp(c, 0.0, 1.0) * uLevels + 0.5) / uLevels;
    gl_FragColor = vec4(c, 1.0);
  }
`;

export class PS1Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.target = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.postUniforms = {
      tDiffuse: { value: this.target.texture },
      uRes: { value: new THREE.Vector2(4, 4) },
      uLevels: { value: 31 },
      uDither: { value: 1.0 },
      uDamage: { value: 0 },
      uToxic: { value: 0 },
      uFade: { value: 0 },
      uTime: { value: 0 },
      uNoise: { value: 0.025 },
      uGamma: { value: 0.72 },
    };
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: this.postUniforms, vertexShader: postVertex, fragmentShader: postFragment, depthTest: false }),
    ));
    this.internalHeight = INTERNAL_HEIGHT;
    this.width = 4;
    this.height = 4;
    this.resize();
  }

  setInternalHeight(h) {
    this.internalHeight = h;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.height = this.internalHeight;
    this.width = Math.max(1, Math.round(this.internalHeight * (w / h)));
    this.target.setSize(this.width, this.height);
    this.postUniforms.uRes.value.set(this.width, this.height);
    // Vertex snap grid: half the internal resolution gives visible wobble.
    sharedUniforms.uSnap.value.set(this.width / 2, this.height / 2);
  }

  get aspect() {
    return this.width / this.height;
  }

  render(scene, camera, viewScene, viewCamera) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.setClearColor(sharedUniforms.uFogColor.value, 1);
    r.clear(true, true, true);
    r.render(scene, camera);
    if (viewScene && viewCamera) {
      r.clearDepth();
      r.render(viewScene, viewCamera);
    }
    r.setRenderTarget(null);
    r.clear(true, true, true);
    r.render(this.postScene, this.postCamera);
  }
}
