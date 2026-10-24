/* DNAProved — WebGL DNA world.
   One particle field that re-forms into the subject of each section:
   helix, gel, chromosomes, barcode, sequencing trace, lake water, cells, wordmark.
   Morphing runs on the GPU (shader mixes two position buffers); the CPU only
   rebuilds a target buffer when the scene changes.
   API: window.DNAScene.set(name), window.DNAScene.setVelocity(v) */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

const canvas = document.getElementById("dna-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function boot() {
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    document.documentElement.classList.add("no-webgl");
    return;
  }

  const small = () => window.innerWidth < 900;
  const lowPower = small() || (navigator.hardwareConcurrency || 8) <= 4;
  const COUNT = lowPower ? 7000 : 18000;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // ---------- palette ----------
  const COL = {
    cyan: [0.34, 0.72, 0.88],
    mag: [0.82, 0.2, 0.47],
    white: [0.8, 0.9, 0.96],
    green: [0.22, 0.66, 0.45],
    grey: [0.7, 0.78, 0.83],
    dim: [0.16, 0.3, 0.4],
    teal: [0.18, 0.55, 0.66]
  };
  const BASE_COL = { A: COL.green, C: COL.cyan, G: COL.grey, T: COL.mag };

  const rnd = Math.random;
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const scaleC = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

  // ---------- formations: each fills pos/col for N points ----------
  function helix(pos, col, N, o) {
    const R = o.R || 1.5, H = o.H || 10, turns = o.turns || 2.4, sep = o.sep || 0, RUNGS = 44;
    for (let i = 0; i < N; i++) {
      const r = rnd();
      let x, y, z, c;
      if (r < 0.04) {
        // loose sparkle for depth
        x = gauss() * 3.5; y = (rnd() - 0.5) * H * 1.1; z = gauss() * 3;
        c = scaleC(rnd() < 0.5 ? COL.cyan : COL.mag, 0.45);
      } else if (r < 0.72) {
        const b = r < 0.38 ? 0 : 1;
        y = (rnd() - 0.5) * H;
        const th = (y / H) * turns * Math.PI * 2 + b * Math.PI;
        x = R * Math.cos(th) + (b ? sep : -sep) + gauss() * 0.05;
        z = R * Math.sin(th) + gauss() * 0.05;
        y += gauss() * 0.04;
        c = b ? COL.mag : COL.cyan;
      } else {
        const k = Math.floor(rnd() * RUNGS);
        y = (k / (RUNGS - 1) - 0.5) * H * 0.96;
        const th = (y / H) * turns * Math.PI * 2;
        const ax = R * Math.cos(th) - sep, az = R * Math.sin(th);
        const bx = R * Math.cos(th + Math.PI) + sep, bz = R * Math.sin(th + Math.PI);
        let u = rnd();
        if (sep > 0) u = u < 0.5 ? u * 0.42 : 1 - (1 - u) * 0.42; // unzipped: rungs broken in half
        x = ax + (bx - ax) * u + gauss() * 0.03;
        z = az + (bz - az) * u + gauss() * 0.03;
        y += gauss() * 0.03;
        c = u < 0.5 ? mixc(COL.white, COL.cyan, 0.35) : mixc(COL.white, COL.mag, 0.35);
        c = scaleC(c, 0.75);
      }
      pos.set([x, y, z], i * 3); col.set(c, i * 3);
    }
  }

  function gel(pos, col, N) {
    const lanes = [
      [2.3, 1.75, 1.25, 0.8, 0.4, 0.0, -0.4, -0.85, -1.3], // ladder
      [-0.95], [-0.6, -0.95], [-0.6, -0.95], [-0.95], [] // male, female, A, B, blank
    ];
    const bands = [];
    lanes.forEach((ys, l) => ys.forEach((y) => bands.push([l, y, l === 0 ? 0.55 : 1])));
    const a = -0.42, ca = Math.cos(a), sa = Math.sin(a), b = 0.28, cb = Math.cos(b), sb = Math.sin(b);
    for (let i = 0; i < N; i++) {
      let x, y, z, c;
      if (rnd() < 0.7) {
        const band = bands[Math.floor(rnd() * bands.length)];
        x = -3.3 + band[0] * 1.32 + (rnd() - 0.5) * 1.0;
        y = band[1] + gauss() * 0.045;
        z = gauss() * 0.07;
        c = scaleC(mixc(COL.white, COL.cyan, 0.3), band[2]);
      } else {
        x = (rnd() - 0.5) * 8.2; y = (rnd() - 0.5) * 6.2 + 0.3; z = (rnd() - 0.5) * 0.4 - 0.25;
        c = y > 2.95 && Math.abs(((x + 3.3) / 1.32) - Math.round((x + 3.3) / 1.32)) < 0.35 ? scaleC(COL.cyan, 0.5) : scaleC(COL.dim, 0.7);
      }
      // lay the slab back and turn it slightly
      const y1 = y * ca - z * sa, z1 = y * sa + z * ca;
      const x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;
      pos.set([x2, y1, z2], i * 3); col.set(c, i * 3);
    }
  }

  function cloud(pos, col, N) {
    for (let i = 0; i < N; i++) {
      const c = rnd() < 0.5 ? COL.cyan : rnd() < 0.5 ? COL.mag : COL.white;
      pos.set([gauss() * 7.5, gauss() * 4.6, gauss() * 4 - 1], i * 3);
      col.set(scaleC(c, 0.32 + rnd() * 0.3), i * 3);
    }
  }

  function zw(pos, col, N) {
    // male ZZ pair on the left, female ZW pair on the right; CHD1 marked as a bright ring
    const rods = [
      { x: -3.5, cy: 0, h: 3.8, c: COL.cyan }, { x: -2.3, cy: 0, h: 3.8, c: COL.cyan },
      { x: 2.3, cy: 0, h: 3.8, c: COL.cyan }, { x: 3.5, cy: 0.85, h: 2.1, c: COL.mag }
    ];
    for (let i = 0; i < N; i++) {
      const rod = rods[Math.floor(rnd() * 4)];
      const t = (rnd() - 0.5) * rod.h;
      const cen = rod.h * 0.14;
      let rad = 0.42 * (0.85 + 0.15 * rnd()) * (1 - 0.45 * Math.exp(-((t - cen) * (t - cen)) / 0.05));
      const cap = Math.abs(t) > rod.h / 2 - 0.4 ? Math.sqrt(Math.max(0, 1 - Math.pow((Math.abs(t) - (rod.h / 2 - 0.4)) / 0.42, 2))) : 1;
      rad *= cap;
      const ph = rnd() * Math.PI * 2;
      const ring = Math.abs(t + rod.h * 0.22) < 0.09;
      pos.set([rod.x + rad * Math.cos(ph), rod.cy + t, rad * Math.sin(ph)], i * 3);
      col.set(ring ? COL.white : scaleC(rod.c, 0.85), i * 3);
    }
  }

  function barcode(pos, col, N) {
    const bars = [];
    let x = -4.4;
    const bases = "ACGT";
    while (x < 4.4) {
      const w = [0.06, 0.1, 0.16, 0.22][Math.floor(rnd() * 4)];
      bars.push({ x, w, b: bases[Math.floor(rnd() * 4)], h: 4.2 + rnd() * 1.6 });
      x += w + 0.08 + rnd() * 0.12;
    }
    const a = -0.38, ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < N; i++) {
      const bar = bars[Math.floor(rnd() * bars.length)];
      const px = bar.x + rnd() * bar.w, py = (rnd() - 0.5) * bar.h, pz = gauss() * 0.12;
      pos.set([px * ca + pz * sa, py, -px * sa + pz * ca], i * 3);
      col.set(scaleC(BASE_COL[bar.b], 0.9), i * 3);
    }
  }

  function chromatogram(pos, col, N) {
    const seq = "TTGGATCATCCATTGGAGCCCTTCTAG";
    const xs = [...seq].map((_, i) => -5.2 + (i / (seq.length - 1)) * 10.4);
    const hs = [...seq].map(() => 0.6 + rnd() * 0.4);
    const zOf = { A: -0.6, C: -0.2, G: 0.2, T: 0.6 };
    const trace = (b, x) => { let y = 0; for (let i = 0; i < seq.length; i++) if (seq[i] === b) { const d = x - xs[i]; y += hs[i] * Math.exp(-(d * d) / (2 * 0.12 * 0.12)); } return y; };
    for (let i = 0; i < N; i++) {
      const b = "ACGT"[Math.floor(rnd() * 4)];
      let x, y, tries = 0;
      do { x = (rnd() - 0.5) * 11; y = trace(b, x); tries++; } while (y < 0.04 && rnd() > 0.25 && tries < 8);
      pos.set([x, y * 3.4 - 1.6 + gauss() * 0.02, zOf[b] + gauss() * 0.03], i * 3);
      col.set(BASE_COL[b], i * 3);
    }
  }

  function water(pos, col, N) {
    const frags = Array.from({ length: 12 }, () => [(rnd() - 0.5) * 12, -0.6 + rnd() * 3.2, (rnd() - 0.5) * 6 - 1, rnd() * 6]);
    for (let i = 0; i < N; i++) {
      if (rnd() < 0.1) {
        // shed DNA fragments drifting above the surface
        const f = frags[Math.floor(rnd() * frags.length)];
        const t = (rnd() - 0.5) * 1.2, th = t * 7 + f[3] + (rnd() < 0.5 ? 0 : Math.PI);
        pos.set([f[0] + Math.cos(th) * 0.22, f[1] + t, f[2] + Math.sin(th) * 0.22], i * 3);
        col.set(rnd() < 0.5 ? COL.mag : COL.cyan, i * 3);
      } else {
        const x = (rnd() - 0.5) * 20, z = -8 + rnd() * 11.5;
        const y = -2.2 + 0.22 * Math.sin(x * 0.8) * Math.cos(z * 0.7);
        const depth = (z + 8) / 11.5;
        pos.set([x, y, z], i * 3);
        col.set(scaleC(mixc(COL.teal, COL.cyan, depth), 0.35 + depth * 0.45), i * 3);
      }
    }
  }

  function cells(pos, col, N) {
    const list = [[0, 0.4, 0, 1.25, 1], [-2.1, 1.9, -0.8, 0.85, 0], [1.9, 2.0, -0.5, 0.95, 1], [-2.3, -1.6, 0.2, 1.0, 0], [1.6, -1.9, 0.4, 0.8, 0], [3.2, 0.2, -1.2, 0.7, 0], [-3.6, 0.3, -1.5, 0.6, 1]];
    for (let i = 0; i < N; i++) {
      const cl = list[Math.floor(rnd() * list.length)];
      let cx = cl[0], cy = cl[1], cz = cl[2], r = cl[3];
      if (cl[4] && rnd() < 0.18) { cx += r * 0.95; cy += r * 0.55; r *= 0.42; } // budding daughter cell
      let vx = gauss(), vy = gauss(), vz = gauss();
      const len = Math.hypot(vx, vy, vz) || 1;
      const inner = rnd() < 0.16;
      const rr = inner ? r * 0.32 * rnd() : r * (0.95 + 0.07 * rnd());
      pos.set([cx + (vx / len) * rr, cy + (vy / len) * rr, cz + (vz / len) * rr], i * 3);
      col.set(inner ? COL.mag : scaleC(mixc(COL.cyan, COL.white, 0.25), 0.8), i * 3);
    }
  }

  let wordPixels = null;
  function wordmark(pos, col, N) {
    if (!wordPixels) {
      const cv = document.createElement("canvas"), W = 1400, H = 320;
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      ctx.font = "800 250px Archivo, 'Helvetica Neue', Arial, sans-serif";
      const wDNA = ctx.measureText("DNA").width, wAll = ctx.measureText("DNAProved").width;
      const x0 = (W - wAll) / 2;
      ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
      ctx.fillText("DNAProved", x0, H / 2);
      const data = ctx.getImageData(0, 0, W, H).data, px = [];
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) px.push(x, y);
      wordPixels = { px, W, H, split: x0 + wDNA, span: wAll };
    }
    const { px, W, H, split, span } = wordPixels, n = px.length / 2, scale = 12.5 / span;
    for (let i = 0; i < N; i++) {
      const k = Math.floor(rnd() * n), x = px[k * 2], y = px[k * 2 + 1];
      pos.set([(x - W / 2) * scale + gauss() * 0.02, -(y - H / 2) * scale + gauss() * 0.02, gauss() * 0.18], i * 3);
      col.set(x < split ? COL.cyan : COL.mag, i * 3);
    }
  }

  // name: generator, desktop offset, spin speed, wave, mobile offset
  const SCENES = {
    helix: { gen: (p, c, n) => helix(p, c, n, {}), x: 3.6, y: 0, spin: 0.22 },
    unzip: { gen: (p, c, n) => helix(p, c, n, { R: 0.85, sep: 1.15, turns: 1.6 }), x: 3.8, y: 0, spin: 0.1 },
    gel: { gen: gel, x: 3.4, y: 0.2, spin: 0 },
    cloud: { gen: cloud, x: 0, y: 0, spin: 0.025 },
    zw: { gen: zw, x: 3.2, y: 0, spin: 0.16 },
    barcode: { gen: barcode, x: 3.4, y: 0, spin: 0.08 },
    chromatogram: { gen: chromatogram, x: 3, y: 0.2, spin: 0 },
    water: { gen: water, x: 0, y: -0.2, spin: 0, wave: 1 },
    cells: { gen: cells, x: 3.4, y: 0, spin: 0.12 },
    wordmark: { gen: wordmark, x: 0, y: 1.9, spin: 0 }
  };

  // ---------- geometry ----------
  const geo = new THREE.BufferGeometry();
  const from = new Float32Array(COUNT * 3), to = new Float32Array(COUNT * 3);
  const cFrom = new Float32Array(COUNT * 3), cTo = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT), size = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) { seed[i] = rnd(); size[i] = 0.55 + rnd() * rnd() * 1.6; }
  cloud(from, cFrom, COUNT);
  helix(to, cTo, COUNT, {});
  const attr = (arr, n) => new THREE.BufferAttribute(arr, n);
  geo.setAttribute("position", attr(to, 3));
  geo.setAttribute("aFrom", attr(from, 3));
  geo.setAttribute("aTo", attr(to, 3));
  geo.setAttribute("aColFrom", attr(cFrom, 3));
  geo.setAttribute("aColTo", attr(cTo, 3));
  geo.setAttribute("aSeed", attr(seed, 1));
  geo.setAttribute("aSize", attr(size, 1));

  const uniforms = {
    uMix: { value: 0 },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseStrength: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uSize: { value: lowPower ? 2.6 : 2.3 },
    uWave: { value: 0 },
    uOpacity: { value: small() ? 0.6 : 1 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uMix, uTime, uMouseStrength, uPixelRatio, uSize, uWave, uOpacity;
      uniform vec3 uMouse;
      attribute vec3 aFrom, aTo, aColFrom, aColTo;
      attribute float aSeed, aSize;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = clamp((uMix - aSeed * 0.35) / 0.65, 0.0, 1.0);
        float e = d * d * (3.0 - 2.0 * d);
        vec3 p = mix(aFrom, aTo, e);
        float flight = sin(e * 3.14159265);
        p += vec3(sin(aSeed * 91.0 + uTime * 0.7), cos(aSeed * 53.0 + uTime * 0.6), sin(aSeed * 27.0 + uTime * 0.5)) * flight * 1.7;
        p += vec3(sin(uTime * 0.8 + aSeed * 40.0), cos(uTime * 0.9 + aSeed * 30.0), sin(uTime * 0.7 + aSeed * 20.0)) * 0.035;
        p.y += uWave * sin(p.x * 0.9 + uTime * 1.1) * cos(p.z * 0.8 + uTime * 0.8) * 0.32;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vec2 toM = world.xy - uMouse.xy;
        float md = length(toM);
        float force = smoothstep(2.4, 0.0, md) * uMouseStrength;
        world.xy += (toM / max(md, 0.0001)) * force * 0.95;
        world.z += force * 0.6;
        vec4 mv = viewMatrix * world;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aSize * uPixelRatio * (14.0 / -mv.z);
        vColor = mix(aColFrom, aColTo, e) * (1.0 + force * 0.8);
        float twinkle = 0.5 + 0.5 * sin(uTime * 1.3 + aSeed * 60.0);
        vAlpha = uOpacity * (0.5 + 0.35 * twinkle);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float a = pow(1.0 - r * 2.0, 1.6);
        gl_FragColor = vec4(vColor, a * vAlpha);
      }`
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // ---------- state ----------
  let current = "helix", mixTween = null, velocity = 0, override = null;
  const target = { x: SCENES.helix.x, y: 0, spin: SCENES.helix.spin, wave: 0 };
  const mouse = { x: 99, y: 99, tx: 99, ty: 99, active: false, px: 0, py: 0 };
  let width = 1, height = 1, halfH = 1, halfW = 1;

  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    halfW = halfH * camera.aspect;
    uniforms.uOpacity.value = small() ? 0.55 : 1;
    applyOffsets();
    if (reduceMotion) render();
  }

  function applyOffsets() {
    const s = SCENES[current];
    if (small()) { target.x = 0; target.y = s.y + (current === "wordmark" ? 0 : 1.6); group.scale.setScalar(current === "wordmark" ? 0.55 : 0.72); }
    else if (override) { target.x = override.x; target.y = override.y; group.scale.setScalar(override.scale || 1); }
    else { target.x = s.x * Math.min(1, camera.aspect / 1.6); target.y = s.y; group.scale.setScalar(1); }
    target.spin = s.spin; target.wave = s.wave || 0;
  }

  function easeAt(m, sd) { const d = Math.min(1, Math.max(0, (m - sd * 0.35) / 0.65)); return d * d * (3 - 2 * d); }

  function set(name, opts) {
    if (!SCENES[name]) return;
    const nextOverride = opts && typeof opts.x === "number" ? opts : null;
    if (name === current) { override = nextOverride; applyOffsets(); return; }
    override = nextOverride;
    // freeze the in-between state as the new start, then aim at the new formation
    const m = uniforms.uMix.value;
    for (let i = 0; i < COUNT; i++) {
      const e = easeAt(m, seed[i]), k = i * 3;
      for (let j = 0; j < 3; j++) {
        from[k + j] = from[k + j] + (to[k + j] - from[k + j]) * e;
        cFrom[k + j] = cFrom[k + j] + (cTo[k + j] - cFrom[k + j]) * e;
      }
    }
    SCENES[name].gen(to, cTo, COUNT);
    ["aFrom", "aTo", "aColFrom", "aColTo"].forEach((n) => { geo.attributes[n].needsUpdate = true; });
    current = name;
    applyOffsets();
    uniforms.uMix.value = 0;
    if (mixTween) mixTween.kill && mixTween.kill();
    if (reduceMotion) { uniforms.uMix.value = 1; group.position.set(target.x, target.y, 0); render(); return; }
    if (window.gsap) mixTween = window.gsap.to(uniforms.uMix, { value: 1, duration: 2.1, ease: "power2.inOut" });
    else uniforms.uMix.value = 1;
  }

  // ---------- input ----------
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    mouse.px = (e.clientX / width) * 2 - 1;
    mouse.py = -(e.clientY / height) * 2 + 1;
    mouse.tx = mouse.px * halfW; mouse.ty = mouse.py * halfH; mouse.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.active = false; });
  window.addEventListener("resize", resize);

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let running = !document.hidden;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(tick); } });

  function render() { renderer.render(scene, camera); }

  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.12; mouse.y += (mouse.ty - mouse.y) * 0.12;
    uniforms.uMouse.value.set(mouse.x, mouse.y, 0);
    uniforms.uMouseStrength.value += ((mouse.active ? 1 : 0) - uniforms.uMouseStrength.value) * 0.06;
    uniforms.uWave.value += (target.wave - uniforms.uWave.value) * 0.03;
    group.position.x += (target.x - group.position.x) * 0.045;
    group.position.y += (target.y - group.position.y) * 0.045;
    velocity *= 0.92;
    if (target.spin > 0) group.rotation.y += dt * (target.spin + Math.min(Math.abs(velocity) / 2500, 1.2));
    else {
      const goal = Math.round(group.rotation.y / (Math.PI * 2)) * Math.PI * 2;
      group.rotation.y += (goal - group.rotation.y) * 0.04;
    }
    // gentle parallax tilt toward the pointer
    group.rotation.x += ((mouse.active ? mouse.py * 0.12 : 0) - group.rotation.x) * 0.05;
    group.rotation.z += ((mouse.active ? -mouse.px * 0.05 : 0) - group.rotation.z) * 0.05;
    render();
    requestAnimationFrame(tick);
  }

  resize();
  group.position.set(target.x, target.y, 0);
  if (reduceMotion) { uniforms.uMix.value = 1; render(); }
  else {
    requestAnimationFrame(tick);
    const intro = () => { if (window.gsap) mixTween = window.gsap.to(uniforms.uMix, { value: 1, duration: 2.6, ease: "power3.out" }); else uniforms.uMix.value = 1; };
    if (document.documentElement.classList.contains("is-loading")) document.addEventListener("dna:intro", intro, { once: true });
    else intro();
  }

  window.DNAScene = { set, setVelocity: (v) => { velocity = v; }, get current() { return current; } };
  if (window.__pendingScene) set(window.__pendingScene);
  document.documentElement.classList.add("has-webgl");
  document.dispatchEvent(new CustomEvent("dnascene:ready"));
}

boot();
