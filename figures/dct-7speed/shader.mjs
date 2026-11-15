import * as THREE from "three";
import { SPEC, ANCHORS } from "./model.mjs";

export function buildShader(reg, kit) {
  const theme = kit.currentTheme;
  const shaderGroup = reg.group("shader.group", { stage: "shader" });

  const fluxMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOddGearX: { value: 1.10 },
      uEvenGearX: { value: -0.28 },
      uOddGearR: { value: 0.35 },
      uEvenGearR: { value: 0.41 },
      uK1: { value: 1.0 },
      uK2: { value: 0.0 },
      uLoad: { value: 0.72 },
      uEnvelope: { value: 1.0 },
      uColOdd: { value: new THREE.Color(theme.channels.comb) },
      uColEven: { value: new THREE.Color(theme.channels.comp) },
      uColOut: { value: new THREE.Color(theme.channels.intake) }
    },
    vertexShader: `
      attribute float aRole;
      varying vec2 vUv;
      varying float vRole;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vRole = aRole;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOddGearX;
      uniform float uEvenGearX;
      uniform float uOddGearR;
      uniform float uEvenGearR;
      uniform float uK1;
      uniform float uK2;
      uniform float uLoad;
      uniform float uEnvelope;
      uniform vec3 uColOdd;
      uniform vec3 uColEven;
      uniform vec3 uColOut;
      varying vec2 vUv;
      varying float vRole;
      varying vec3 vWorldPos;

      void main() {
        float loadBoost = 0.55 + 0.45 * uLoad;
        vec3 col = uColOdd;
        float alpha = 0.0;

        if (vRole < 0.5) {
          // Role 0: K1 Inner Wet Clutch Engagement Ring Halo
          float ringEdge = smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.70, vUv.y);
          float pulse = 0.65 + 0.35 * sin(vUv.x * 18.85 - uTime * 8.0);
          col = uColOdd;
          alpha = uK1 * ringEdge * pulse * 0.55 * loadBoost;
        } else if (vRole < 1.5) {
          // Role 1: K2 Outer Wet Clutch Engagement Ring Halo
          float ringEdge = smoothstep(0.0, 0.30, vUv.y) * smoothstep(1.0, 0.70, vUv.y);
          float pulse = 0.65 + 0.35 * sin(vUv.x * 25.13 - uTime * 8.0);
          col = uColEven;
          alpha = uK2 * ringEdge * pulse * 0.52 * loadBoost;
        } else if (vRole < 2.5) {
          // Role 2: K1 Odd Torque Stream + Active Odd Gear Mesh Bridge
          float activeStart = -1.44;
          float inSpan = smoothstep(activeStart - 0.08, activeStart + 0.12, vWorldPos.x)
                       * (1.0 - smoothstep(uOddGearX - 0.04, uOddGearX + 0.06, vWorldPos.x));
          float meshBand = exp(-pow((vWorldPos.x - uOddGearX) / 0.075, 2.0));
          float chevron = 0.55 + 0.45 * sin(vWorldPos.x * 18.0 - uTime * 11.0);
          float vFeather = smoothstep(0.0, 0.35, 1.0 - abs(vUv.y - 0.5) * 2.0);
          col = uColOdd;
          alpha = uK1 * max(inSpan * 0.36, meshBand * 0.68) * chevron * vFeather * loadBoost;
        } else if (vRole < 3.5) {
          // Role 3: K2 Even Torque Stream + Active Even Gear Mesh Bridge
          float activeStart = -1.42;
          float inSpan = smoothstep(activeStart - 0.08, activeStart + 0.12, vWorldPos.x)
                       * (1.0 - smoothstep(uEvenGearX - 0.04, uEvenGearX + 0.06, vWorldPos.x));
          float meshBand = exp(-pow((vWorldPos.x - uEvenGearX) / 0.075, 2.0));
          float chevron = 0.55 + 0.45 * sin(vWorldPos.x * 18.0 - uTime * 11.0);
          float vFeather = smoothstep(0.0, 0.35, 1.0 - abs(vUv.y - 0.5) * 2.0);
          col = uColEven;
          alpha = uK2 * max(inSpan * 0.36, meshBand * 0.68) * chevron * vFeather * loadBoost;
        } else if (vRole < 4.5) {
          // Role 4: Output Countershaft Torque Flow (from active mesh to rear flange)
          float activeX = uOddGearX * uK1 + uEvenGearX * uK2;
          float outSpan = smoothstep(activeX - 0.10, activeX + 0.12, vWorldPos.x)
                        * (1.0 - smoothstep(2.14, 2.28, vWorldPos.x));
          float chevron = 0.60 + 0.40 * sin(vWorldPos.x * 15.0 - uTime * 10.5);
          col = mix(uColEven, uColOdd, uK1);
          alpha = outSpan * chevron * 0.46 * loadBoost;
        } else {
          // Role 5: Mechatronics Glass Oil-Gallery Hydraulic Pressure Pulse
          float edgeX = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
          float edgeY = smoothstep(0.0, 0.20, vUv.y) * smoothstep(1.0, 0.80, vUv.y);
          float wave = 0.5 + 0.5 * sin(vUv.x * 20.0 - uTime * 7.5);
          col = mix(uColEven, uColOdd, uK1);
          alpha = edgeX * edgeY * wave * 0.38 * loadBoost;
        }

        alpha *= uEnvelope;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.72));
      }
    `
  });

  function tagRole(geo, role) {
    const n = geo.attributes.position.count;
    geo.setAttribute("aRole", new THREE.BufferAttribute(new Float32Array(n).fill(role), 1));
    return geo;
  }

  // 1. K1 & K2 Cutaway Clutch Engagement Glow Sleeves (wrapped around cutaway windows)
  const k1HaloGeo = tagRole(new THREE.CylinderGeometry(0.355, 0.355, 0.34, 24, 1, true, 0.4, 3.6), 0.0);
  k1HaloGeo.rotateZ(-Math.PI / 2);
  const k1Halo = new THREE.Mesh(k1HaloGeo, fluxMat);
  k1Halo.position.set(-1.43, SPEC.inY, SPEC.inZ);
  reg.detail("shader.k1.halo", k1Halo, { parent: shaderGroup, stage: "shader" });

  const k2HaloGeo = tagRole(new THREE.CylinderGeometry(0.575, 0.575, 0.38, 28, 1, true, 0.4, 3.6), 1.0);
  k2HaloGeo.rotateZ(-Math.PI / 2);
  const k2Halo = new THREE.Mesh(k2HaloGeo, fluxMat);
  k2Halo.position.set(-1.42, SPEC.inY, SPEC.inZ);
  reg.detail("shader.k2.halo", k2Halo, { parent: shaderGroup, stage: "shader" });

  // 2. Odd & Even Shaft Torque-Transfer Ribbons (angled between input & output axes so mesh bridge glows!)
  const midY = (SPEC.inY + SPEC.outY) * 0.5;
  const midZ = (SPEC.inZ + SPEC.outZ) * 0.5;
  const ribbonH = SPEC.shaftCenterDist * 0.88;
  const ribbonAngle = Math.atan2(SPEC.outZ - SPEC.inZ, SPEC.inY - SPEC.outY);

  const oddBridgeGeo = tagRole(new THREE.PlaneGeometry(3.40, ribbonH, 28, 1), 2.0);
  const oddBridge = new THREE.Mesh(oddBridgeGeo, fluxMat);
  oddBridge.position.set(0.24, midY, midZ + 0.06);
  oddBridge.rotation.x = -ribbonAngle;
  reg.detail("shader.odd.bridge", oddBridge, { parent: shaderGroup, stage: "shader" });

  const evenBridgeGeo = tagRole(new THREE.PlaneGeometry(1.70, ribbonH, 20, 1), 3.0);
  const evenBridge = new THREE.Mesh(evenBridgeGeo, fluxMat);
  evenBridge.position.set(-0.62, midY, midZ + 0.08);
  evenBridge.rotation.x = -ribbonAngle;
  reg.detail("shader.even.bridge", evenBridge, { parent: shaderGroup, stage: "shader" });

  // 3. Output Countershaft Outer Torque Sheath (r = 0.112, outside shaft.out r=0.084)
  const outStreamGeo = tagRole(new THREE.CylinderGeometry(0.112, 0.112, 3.20, 18, 1, true), 4.0);
  outStreamGeo.rotateZ(-Math.PI / 2);
  const outStream = new THREE.Mesh(outStreamGeo, fluxMat);
  outStream.position.set(0.68, SPEC.outY, SPEC.outZ);
  reg.detail("shader.out.stream", outStream, { parent: shaderGroup, stage: "shader" });

  // 4. Mechatronics Glass Oil Gallery Flow Layer
  const [mcX, , mcZ] = ANCHORS.mechatronicsMount;
  const mcPadTop = SPEC.BASE_Y + 0.11;
  const galleryGeo = tagRole(new THREE.PlaneGeometry(1.02, 0.26, 8, 2), 5.0);
  galleryGeo.rotateX(-Math.PI / 2);
  const galleryMesh = new THREE.Mesh(galleryGeo, fluxMat);
  galleryMesh.position.set(mcX, mcPadTop + 0.222, mcZ - 0.04);
  reg.detail("shader.mecha.gallery", galleryMesh, { parent: shaderGroup, stage: "shader" });

  const fData = reg.group("shader.fluxData", { parent: shaderGroup, stage: "shader" });
  fData.userData.material = fluxMat;

  kit.onThemeChange((nextTheme) => {
    fluxMat.uniforms.uColOdd.value.set(nextTheme.channels.comb);
    fluxMat.uniforms.uColEven.value.set(nextTheme.channels.comp);
    fluxMat.uniforms.uColOut.value.set(nextTheme.channels.intake);
  });
}
