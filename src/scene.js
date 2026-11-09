import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { brandIcon } from "./brands.js";

/* ------------------------------------------------------------------ */
/* Shared GLSL                                                          */
/* ------------------------------------------------------------------ */
const NOISE = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

/* ------------------------------------------------------------------ */
/* Planet                                                               */
/* ------------------------------------------------------------------ */
function createPlanet(radius) {
  const uniforms = {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0.6, 0.35, 0.75).normalize() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vObj;
      varying vec3 vView;
      void main() {
        vObj = normalize(position);
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uLightDir;
      varying vec3 vNormal;
      varying vec3 vObj;
      varying vec3 vView;
      ${NOISE}
      void main() {
        vec3 p = vObj;
        float n = fbm(p * 1.8 + vec3(uTime * 0.03, uTime * 0.015, 0.0));
        float n2 = fbm(p * 4.5 - vec3(0.0, uTime * 0.04, uTime * 0.02));
        float bands = 0.5 + 0.5 * sin(p.y * 6.0 + n * 6.0 + uTime * 0.12);

        vec3 deep   = vec3(0.010, 0.016, 0.070);
        vec3 blue   = vec3(0.040, 0.140, 0.620);
        vec3 cyan   = vec3(0.060, 0.700, 0.900);
        vec3 violet = vec3(0.420, 0.120, 0.850);

        vec3 col = mix(deep, blue, bands * 0.9);
        col = mix(col, violet, smoothstep(0.52, 0.82, n) * 0.85);
        col = mix(col, cyan, smoothstep(0.62, 0.95, bands * n2 * 1.6) * 0.7);

        float diff = max(dot(vNormal, uLightDir), 0.0);
        float shade = 0.08 + diff * 1.25;
        col *= shade;

        // glowing "data nodes" on the night side
        vec3 cell = floor(p * 42.0);
        float h = hash(cell);
        float node = step(0.984, h) * (0.55 + 0.45 * sin(uTime * 2.5 + h * 40.0));
        col += node * (1.0 - smoothstep(0.0, 0.45, diff)) * vec3(0.35, 0.95, 1.0) * 2.2;

        // soft specular sheen
        vec3 hv = normalize(uLightDir + vView);
        col += pow(max(dot(vNormal, hv), 0.0), 24.0) * vec3(0.3, 0.6, 1.0) * 0.18;

        // rim
        float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
        col += fres * vec3(0.15, 0.55, 1.0) * 0.9;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 160, 160), material);
  return { mesh, uniforms };
}

function createAtmosphere(radius) {
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        // back faces: dot is -1 at centre, 0 at the outer silhouette
        float d = -dot(vNormal, vView);
        float i = pow(clamp(d / 0.55, 0.0, 1.0), 3.0);
        vec3 col = mix(vec3(0.15, 0.55, 1.0), vec3(0.55, 0.3, 1.0), 0.3);
        gl_FragColor = vec4(col, i * 0.55);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.NormalBlending,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 96), material);
}

/* ------------------------------------------------------------------ */
/* Rings                                                                */
/* ------------------------------------------------------------------ */
function createRing(inner, outer) {
  const uniforms = { uTime: { value: 0 }, uInner: { value: inner }, uOuter: { value: outer } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      varying vec3 vPos;
      float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
      void main() {
        float r = (length(vPos.xy) - uInner) / (uOuter - uInner);
        float band = h1(floor(r * 90.0));
        float fine = 0.6 + 0.4 * sin(r * 420.0);
        float edge = smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.75, r);
        float gap = 1.0 - smoothstep(0.42, 0.44, r) * smoothstep(0.50, 0.48, r);
        float a = edge * gap * (0.12 + 0.55 * band) * fine;
        vec3 col = mix(vec3(0.02, 0.45, 0.75), vec3(0.42, 0.15, 0.85), r);
        gl_FragColor = vec4(col, a * 0.9);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256, 1), material);
}

function createDust(count, inner, outer) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const a = new THREE.Color("#0891b2");
  const b = new THREE.Color("#7c3aed");
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = inner + Math.pow(Math.random(), 0.7) * (outer - inner);
    const t = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(t) * r;
    pos[i * 3 + 1] = Math.sin(t) * r;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    tmp.copy(a).lerp(b, (r - inner) / (outer - inner));
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.028,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/* ------------------------------------------------------------------ */
/* Stars                                                                */
/* ------------------------------------------------------------------ */
function createStars(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const palette = ["#2563eb", "#0891b2", "#7c3aed", "#60a5fa", "#a78bfa"].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const r = 18 + Math.random() * 50;
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(t);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(t);
    size[i] = Math.random() < 0.04 ? 3 + Math.random() * 3 : 0.8 + Math.random() * 1.6;
    seed[i] = Math.random() * 100;
    const c = palette[(Math.random() * palette.length) | 0];
    color.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));

  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aSeed;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aSeed) * 2.0) + aSeed);
        vColor = aColor;
        gl_PointSize = aSize * uPixelRatio * (60.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float core = smoothstep(0.5, 0.0, d);
        float glow = pow(core, 3.0);
        gl_FragColor = vec4(vColor, glow * vTw * 0.55);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  return { points: new THREE.Points(geo, mat), uniforms };
}

/* ------------------------------------------------------------------ */
/* Orbiting marketplace crystals                                         */
/* ------------------------------------------------------------------ */
const PLATFORMS = [
  { key: "amazon", name: "Amazon", color: "#ff9900", geo: () => new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.06) },
  { key: "ebay", name: "eBay", color: "#3665f3", geo: () => new THREE.IcosahedronGeometry(0.28, 0) },
  { key: "etsy", name: "Etsy", color: "#f1641e", geo: () => new THREE.OctahedronGeometry(0.3, 0) },
  { key: "temu", name: "Temu", color: "#fb7701", geo: () => new THREE.DodecahedronGeometry(0.27, 0) },
  { key: "tiktok", name: "TikTok Shop", color: "#25f4ee", geo: () => new THREE.TorusGeometry(0.2, 0.08, 24, 64) },
  { key: "facebook", name: "Facebook Shop", color: "#1877f2", geo: () => new THREE.CapsuleGeometry(0.13, 0.26, 8, 24) },
];

function createOrbiters(labelsEnabled) {
  const group = new THREE.Group();
  const items = PLATFORMS.map((p, i) => {
    const color = new THREE.Color(p.color);
    const geometry = p.geo();
    const material = new THREE.MeshPhysicalMaterial({
      color: color.clone().lerp(new THREE.Color("#ffffff"), 0.35),
      metalness: 0.05,
      roughness: 0.06,
      transmission: 1,
      thickness: 0.9,
      ior: 1.6,
      iridescence: 0.7,
      iridescenceIOR: 1.3,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      attenuationColor: color,
      attenuationDistance: 0.9,
      envMapIntensity: 1.2,
    });
    const mesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.8), transparent: true, opacity: 0.9 })
    );
    edges.scale.setScalar(1.002);
    mesh.add(edges);

    const glow = new THREE.PointLight(color, 1.6, 2.2, 2);
    mesh.add(glow);

    if (labelsEnabled) {
      const el = document.createElement("div");
      el.className = "orb-label";
      el.style.setProperty("--c", p.color);
      el.appendChild(brandIcon(p.key, "orb-label__icon"));
      el.append(p.name);
      const label = new CSS2DObject(el);
      label.position.set(0, 0.42, 0);
      label.center.set(0.5, 1);
      mesh.add(label);
    }

    group.add(mesh);
    return {
      mesh,
      radius: 2.55 + (i % 3) * 0.45,
      speed: 0.16 + (i % 2) * 0.06 + i * 0.012,
      phase: (i / PLATFORMS.length) * Math.PI * 2,
      tilt: new THREE.Euler(0.35 + (i % 3) * 0.18, 0, (i % 2 ? -1 : 1) * 0.22),
      spin: new THREE.Vector3(0.4 + i * 0.07, 0.6 - i * 0.05, 0.2),
    };
  });
  return { group, items };
}

/* ------------------------------------------------------------------ */
/* Brand emblem on the globe                                            */
/* ------------------------------------------------------------------ */
function drawEmblem(ctx, size) {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  // soft dark disc so the logo reads clearly over the planet surface
  const disc = ctx.createRadialGradient(c, c, 0, c, c, c);
  disc.addColorStop(0, "rgba(4, 8, 28, 0.78)");
  disc.addColorStop(0.62, "rgba(4, 8, 28, 0.5)");
  disc.addColorStop(1, "rgba(4, 8, 28, 0)");
  ctx.fillStyle = disc;
  ctx.fillRect(0, 0, size, size);

  // glowing outer ring
  ctx.lineWidth = size * 0.008;
  ctx.strokeStyle = "rgba(34, 211, 238, 0.85)";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = size * 0.03;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = size * 0.003;
  ctx.strokeStyle = "rgba(168, 85, 247, 0.7)";
  ctx.beginPath();
  ctx.arc(c, c, size * 0.39, 0, Math.PI * 2);
  ctx.stroke();

  const grad = ctx.createLinearGradient(c - size * 0.2, c - size * 0.2, c + size * 0.2, c + size * 0.2);
  grad.addColorStop(0, "#22d3ee");
  grad.addColorStop(0.55, "#3b82f6");
  grad.addColorStop(1, "#a855f7");

  // crown mark (same shape as the site logo, 64-unit viewBox)
  const k = size * 0.0062;
  const ox = c - 32 * k;
  const oy = c - size * 0.2 - 16 * k;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(k, k);
  ctx.fillStyle = grad;
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(12, 44);
  ctx.lineTo(16, 22);
  ctx.lineTo(25, 32);
  ctx.lineTo(32, 16);
  ctx.lineTo(39, 32);
  ctx.lineTo(48, 22);
  ctx.lineTo(52, 44);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(12, 47, 40, 5, 2.5);
  ctx.fill();
  ctx.restore();

  // wordmark
  ctx.shadowColor = "rgba(59, 130, 246, 0.9)";
  ctx.shadowBlur = size * 0.02;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${size * 0.085}px "Space Grotesk", system-ui, sans-serif`;
  const y = c + size * 0.1;
  const parts = [["Sky", "#ffffff"], ["IT", grad], ["Empire", "#ffffff"]];
  const widths = parts.map(([t]) => ctx.measureText(t).width);
  let x = c - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = "left";
  parts.forEach(([t, fill], i) => {
    ctx.fillStyle = fill;
    ctx.fillText(t, x, y);
    x += widths[i];
  });

  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.font = `500 ${size * 0.03}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(200, 215, 255, 0.85)";
  ctx.fillText("S O F T W A R E   H O U S E", c, c + size * 0.19);
}

function createEmblem() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  drawEmblem(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  // redraw once the web fonts are ready so the wordmark uses Space Grotesk
  document.fonts?.ready.then(() => {
    drawEmblem(ctx, size);
    texture.needsUpdate = true;
  });

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), material);
  mesh.renderOrder = 2;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const smooth = (t) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */
export function initScene(canvas, { onProgress } = {}) {
  const isMobile = () => window.innerWidth < 860;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor("#f6f8fd", 1);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  onProgress?.(0.2);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#f6f8fd", 0.01);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 9);

  // Lights for the glass crystals
  scene.add(new THREE.AmbientLight("#ffffff", 0.9));
  const key = new THREE.DirectionalLight("#ffffff", 2.4);
  key.position.set(5, 3, 6);
  scene.add(key);
  const rimA = new THREE.PointLight("#22d3ee", 40, 30, 2);
  rimA.position.set(-5, -2, 3);
  scene.add(rimA);
  const rimB = new THREE.PointLight("#a855f7", 40, 30, 2);
  rimB.position.set(5, 3, -4);
  scene.add(rimB);

  // World group (planet system) — moved around by scroll
  const world = new THREE.Group();
  scene.add(world);

  const system = new THREE.Group();
  system.rotation.set(0.28, 0, -0.18);
  world.add(system);

  const planet = createPlanet(1.4);
  system.add(planet.mesh);
  system.add(createAtmosphere(1.65));

  const shell = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.95, 2)),
    new THREE.LineBasicMaterial({ color: "#2563eb", transparent: true, opacity: 0.14, depthWrite: false })
  );
  system.add(shell);

  const ringGroup = new THREE.Group();
  ringGroup.rotation.x = -Math.PI / 2 + 0.32;
  const ring = createRing(2.0, 3.1);
  ringGroup.add(ring);
  const dust = createDust(isMobile() ? 1800 : 4200, 3.25, 4.5);
  ringGroup.add(dust);
  system.add(ringGroup);

  // Brand logo sitting in the circle on the front of the globe
  const emblem = createEmblem();
  emblem.position.set(0, 0, 1.45);
  world.add(emblem);

  const orbiters = createOrbiters(true);
  world.add(orbiters.group);
  onProgress?.(0.55);

  const stars = createStars(isMobile() ? 2500 : 6000);
  scene.add(stars.points);

  // Label renderer
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "label-layer";
  document.body.appendChild(labelRenderer.domElement);

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w < h ? 55 : 42;
    camera.updateProjectionMatrix();
    stars.uniforms.uPixelRatio.value = pr;
  }
  resize();
  window.addEventListener("resize", resize);

  // Input
  const mouse = new THREE.Vector2();
  const mouseSmooth = new THREE.Vector2();
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let scrollP = 0;
  let heroP = 0;
  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = max > 0 ? window.scrollY / max : 0;
    heroP = Math.min(window.scrollY / window.innerHeight, 1);
  }
  readScroll();
  window.addEventListener("scroll", readScroll, { passive: true });

  // Scroll choreography: each section declares where the planet should sit
  // via data-planet="x,y,scale" (desktop) and data-planet-m (mobile).
  let anchors = [];
  function measureAnchors() {
    const mobile = isMobile();
    anchors = [...document.querySelectorAll("[data-planet]")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const raw = (mobile && el.dataset.planetM) || el.dataset.planet;
        const [x, y, sc] = raw.split(",").map(Number);
        return { c: r.top + window.scrollY + r.height / 2, x: mobile ? 0 : x, y, s: sc };
      })
      .sort((a, b) => a.c - b.c);
  }
  measureAnchors();
  window.addEventListener("resize", measureAnchors);
  window.addEventListener("load", measureAnchors);
  new ResizeObserver(measureAnchors).observe(document.body);

  function planetTarget(out) {
    if (!anchors.length) return out.set(0, 0, 1);
    const vc = window.scrollY + window.innerHeight / 2;
    let a = anchors[0];
    let b = anchors[anchors.length - 1];
    if (vc <= a.c) return out.set(a.x, a.y, a.s);
    if (vc >= b.c) return out.set(b.x, b.y, b.s);
    for (let i = 1; i < anchors.length; i++) {
      if (vc <= anchors[i].c) {
        a = anchors[i - 1];
        b = anchors[i];
        break;
      }
    }
    const t = smooth((vc - a.c) / (b.c - a.c));
    return out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.s + (b.s - a.s) * t);
  }
  const goal = new THREE.Vector3();

  const target = new THREE.Vector3();
  const clock = new THREE.Clock();
  const timeScale = reducedMotion ? 0.25 : 1;
  let elapsed = 0;
  let running = true;
  const tmpV = new THREE.Vector3();

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05) * timeScale;
    elapsed += dt;
    const t = elapsed;

    planet.uniforms.uTime.value = t;
    stars.uniforms.uTime.value = t;

    // World placement from scroll
    planetTarget(goal);
    target.set(goal.x, goal.y, 0);
    world.position.lerp(target, 0.06);
    world.scale.setScalar(THREE.MathUtils.lerp(world.scale.x, goal.z, 0.06));

    // Rotation
    planet.mesh.rotation.y = t * 0.06;
    shell.rotation.y = -t * 0.04;
    shell.rotation.x = t * 0.02;
    ring.rotation.z = t * 0.03;
    dust.rotation.z = t * 0.05;
    system.rotation.y = scrollP * Math.PI * 1.2;

    // Orbiters
    for (const o of orbiters.items) {
      const a = o.phase + t * o.speed + scrollP * 2.5;
      tmpV.set(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius).applyEuler(o.tilt);
      o.mesh.position.copy(tmpV);
      o.mesh.rotation.x = t * o.spin.x;
      o.mesh.rotation.y = t * o.spin.y;
      o.mesh.rotation.z = t * o.spin.z;
    }

    // Labels only on the hero (desktop)
    const labelOpacity = isMobile() ? 0 : Math.max(0, 1 - heroP * 2.2);
    labelRenderer.domElement.style.opacity = labelOpacity.toFixed(3);
    labelRenderer.domElement.style.visibility = labelOpacity > 0.01 ? "visible" : "hidden";

    // Stars drift + parallax
    stars.points.rotation.y = t * 0.006 + scrollP * 0.5;
    stars.points.rotation.x = scrollP * 0.35;

    // Camera parallax
    mouseSmooth.lerp(mouse, 0.04);
    camera.position.x = mouseSmooth.x * 0.45;
    camera.position.y = -mouseSmooth.y * 0.3;
    camera.lookAt(0, 0, 0);

    // Keep the logo facing the viewer with a gentle float
    emblem.quaternion.copy(camera.quaternion);
    emblem.position.y = Math.sin(t * 0.8) * 0.04;

    composer.render();
    if (labelOpacity > 0.01) labelRenderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    }
  });

  // Warm up shaders before the loader disappears
  renderer.compile(scene, camera);
  onProgress?.(0.9);
  composer.render();
  onProgress?.(1);
  requestAnimationFrame(frame);
}
