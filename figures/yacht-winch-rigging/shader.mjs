import * as THREE from "three";
import { SPEC } from "./model.mjs";

export function buildShader(reg, kit) {
  const theme = kit.currentTheme;
  const boomGroup = reg.groups.get("boom.group")?.group || reg.root;
  const shaderGroup = reg.group("shader.group", { stage: "shader" });

  // 1. Dynamic Wind-Pressure Cambered Mainsail with Curved Roach & Batten Pockets
  const sailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uCamber: { value: 0.22 },
      uWind: { value: 18.0 },
      uEnvelope: { value: 1.0 },
      uColSail: { value: new THREE.Color(theme.ramps.hi[2]) },
      uColSailShade: { value: new THREE.Color(theme.ramps.mid[1]) },
      uColHi: { value: new THREE.Color(theme.channels.comb) },
      uColLo: { value: new THREE.Color(theme.channels.intake) },
      uInk: { value: new THREE.Color(theme.ink) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uCamber;
      uniform float uWind;
      varying vec2 vSailUv;
      varying float vBillow;

      void main() {
        vSailUv = uv;
        float u = uv.x; // 0 = luff (mast), 1 = leech
        float v = uv.y; // 0 = foot (boom), 1 = head (masthead)

        // Authentic airfoil camber peaking at ~35% chord, tapering smoothly toward luff, foot & head
        float chordEnv = sin(3.14159265 * pow(clamp(u, 0.0, 1.0), 0.76));
        float spanEnv = sin(3.14159265 * clamp(v, 0.06, 0.96));
        float flutter = sin(uTime * (3.2 + uWind * 0.15) - u * 6.5) * 0.010 * u * smoothstep(0.3, 1.0, u);
        float billow = chordEnv * (0.42 + 0.58 * spanEnv) * uCamber + flutter;

        vec3 displaced = position;
        displaced.z += billow;
        vBillow = billow / max(0.05, uCamber);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uEnvelope;
      uniform float uTime;
      uniform float uWind;
      uniform vec3 uColSail;
      uniform vec3 uColSailShade;
      uniform vec3 uColHi;
      uniform vec3 uColLo;
      uniform vec3 uInk;
      varying vec2 vSailUv;
      varying float vBillow;

      void main() {
        float u = vSailUv.x;
        float v = vSailUv.y;

        // Crisp batten pockets & horizontal draft stripe
        float batten = step(0.95, fract(v * 4.0)) * step(0.35, u);
        float draftStripe = exp(-pow((v - 0.40) / 0.014, 2.0));

        // Quantized 3-band cel shading on sailcloth + aerodynamic pressure field
        float cp = clamp(vBillow, 0.0, 1.0);
        float band = floor(cp * 3.0 + 0.5) / 3.0;
        vec3 clothCol = mix(uColSailShade, uColSail, 0.35 + 0.65 * band);

        // Animated flow ripple across pressure contours when shader is ON
        float flowWave = 0.06 * sin(u * 18.0 - uTime * (1.8 + uWind * 0.12));
        vec3 pressCol = mix(uColLo, uColHi, smoothstep(0.22, 0.88, cp + flowWave));
        vec3 baseCol = mix(clothCol, pressCol, 0.68 * uEnvelope);
        baseCol = mix(baseCol, uInk, 0.22 * batten + 0.26 * draftStripe);

        // Crisp technical ink border along luff, foot, and roach leech
        float edge = min(min(u, 1.0 - u), min(v, 1.0 - v));
        if (edge < 0.016) {
          baseCol = mix(baseCol, uInk, 0.65);
        }

        float alpha = mix(0.96, 0.88, uEnvelope);
        gl_FragColor = vec4(baseCol, alpha);
      }
    `
  });

  // Build roach-curved mainsail mesh in boom local space
  const segU = 24;
  const segV = 24;
  const sailH = SPEC.topSurfaceY + 0.14 + SPEC.mastHeight - 0.08 - SPEC.boomY;
  const sailLen = SPEC.boomLength - 0.12;
  const posArr = [];
  const uvArr = [];
  const idxArr = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    // Convex parabolic roach gives realistic sailboat mainsail profile
    const roach = 0.14 * Math.sin(Math.PI * v);
    const maxLenAtV = sailLen * (1.0 - v * 0.90) + roach;
    const y = v * sailH + 0.06;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const x = 0.02 + u * maxLenAtV;
      posArr.push(x, y, 0);
      uvArr.push(u, v);
    }
  }
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      idxArr.push(a, b, d, a, d, c);
    }
  }

  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
  sailGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  sailGeo.setIndex(idxArr);
  sailGeo.computeVertexNormals();

  const sailMesh = new THREE.Mesh(sailGeo, sailMat);
  reg.detail("shader.mainsail", sailMesh, { parent: boomGroup, stage: "shader" });

  // 2. Non-Intersecting Leeward/Windward Aerodynamic Flow Streamlines (parented to boomGroup so they wrap cleanly around the sail!)
  const windMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: 18.0 },
      uEnvelope: { value: 1.0 },
      uColWind: { value: new THREE.Color(theme.channels.intake) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uWind;
      uniform float uEnvelope;
      uniform vec3 uColWind;
      varying vec2 vUv;
      void main() {
        float streak = smoothstep(0.25, 0.92, sin(vUv.x * 16.0 - uTime * (2.6 + uWind * 0.22)));
        float ends = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
        float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float alpha = ends * smoothstep(0.0, 0.45, edge) * (0.20 + 0.58 * streak) * uEnvelope;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColWind, clamp(alpha, 0.0, 0.72));
      }
    `
  });

  // Streamlines sweep cleanly on the leeward (+Z) side of the cambered sail without piercing the cloth
  [0.24, 0.48, 0.72].forEach((vFrac, idx) => {
    const wy = vFrac * sailH + 0.08;
    const maxX = sailLen * (1.0 - vFrac * 0.90) + 0.14 * Math.sin(Math.PI * vFrac);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.75, wy, -0.35),
      new THREE.Vector3(-0.08, wy + 0.03, 0.18),
      new THREE.Vector3(maxX * 0.45, wy + 0.02, 0.42),
      new THREE.Vector3(maxX + 0.45, wy - 0.03, 0.16)
    ]);
    const ribbonGeo = new THREE.TubeGeometry(curve, 36, 0.015, 6, false);
    const ribbonMesh = new THREE.Mesh(ribbonGeo, windMat);
    reg.detail(`shader.windRibbon.${idx}`, ribbonMesh, { parent: boomGroup, stage: "shader" });
  });

  const sData = reg.group("shader.sailData", { parent: shaderGroup, stage: "shader" });
  sData.userData.material = sailMat;
  const wData = reg.group("shader.windData", { parent: shaderGroup, stage: "shader" });
  wData.userData.material = windMat;

  kit.onThemeChange((nextTheme) => {
    sailMat.uniforms.uColSail.value.set(nextTheme.ramps.hi[2]);
    sailMat.uniforms.uColSailShade.value.set(nextTheme.ramps.mid[1]);
    sailMat.uniforms.uColHi.value.set(nextTheme.channels.comb);
    sailMat.uniforms.uColLo.value.set(nextTheme.channels.intake);
    sailMat.uniforms.uInk.value.set(nextTheme.ink);
    windMat.uniforms.uColWind.value.set(nextTheme.channels.intake);
  });
}
