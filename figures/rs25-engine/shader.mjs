import * as THREE from "three";
import { SPEC, getEngineState } from "./model.mjs";

export function buildShader(reg, kit) {
  const engineGimbal = reg.groups.get("engine.gimbal")?.group || reg.root;
  const theme = kit.currentTheme;
  const initEng = getEngineState({ throttle: 100 });

  const plumeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: SPEC.initialTheta },
      uThrottle: { value: initEng.thrFrac },
      uValveNorm: { value: initEng.valveNorm },
      uEnvelope: { value: 1.0 },
      uCutaway: { value: 1.0 },
      uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
      uColComb: { value: new THREE.Color(theme.channels.comb) },
      uColComp: { value: new THREE.Color(theme.channels.comp) },
      uColIntake: { value: new THREE.Color(theme.channels.intake) }
    },
    vertexShader: `
      varying vec2 vPlaneXY;
      varying float vViewWeight;

      void main() {
        // Plane local X is radial distance from engine centerline; local Y is axial height
        vPlaneXY = position.xy;
        vec3 viewN = normalize(normalMatrix * normal);
        // Attenuate edge-on planes smoothly so 3 crossed axial planes read volumetrically
        vViewWeight = smoothstep(0.12, 0.68, abs(viewN.z));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uThrottle;
      uniform float uValveNorm;
      uniform float uEnvelope;
      uniform float uCutaway;
      uniform float uIsDark;
      uniform vec3 uColComb;
      uniform vec3 uColComp;
      uniform vec3 uColIntake;

      varying vec2 vPlaneXY;
      varying float vViewWeight;

      const float PI = 3.14159265359;

      // Exact analytic match to model.mjs nozzleInnerRadiusAtY(y)
      float nozzleInnerR(float y) {
        float mccTopY = -0.60;
        float mccThroatY = -1.04;
        float exitY = -2.76;
        if (y >= mccTopY) return 0.295;
        if (y >= mccThroatY) {
          float u = (mccTopY - y) / (mccTopY - mccThroatY);
          float sm = 0.5 - 0.5 * cos(PI * u);
          return mix(0.295, 0.185, sm);
        }
        float t = clamp((mccThroatY - y) / (mccThroatY - exitY), 0.0, 1.0);
        return 0.185 + (0.86 - 0.185) * pow(t, 0.68);
      }

      void main() {
        if (uEnvelope < 0.002) discard;

        float r = abs(vPlaneXY.x);
        float y = vPlaneXY.y;

        // Top & bottom axial envelope well inside quad bounds [-3.58, -0.58]
        float openTop = smoothstep(-0.60, -0.74, y);
        float closedTop = smoothstep(-2.58, -2.78, y);
        float topFade = mix(closedTop, openTop, uCutaway);

        // Keep strong through nozzle exit into sea-level shock-diamond zone, feather smoothly before deflector
        float plumeBottom = mix(-3.44, -3.55, uValveNorm);
        float botFade = smoothstep(plumeBottom, -3.22, y);

        // Compute radial envelope: confined inside nozzle wall above exit, overexpanded shock pinch below exit
        float rWall = nozzleInnerR(max(y, -2.76));
        float rOuter;
        if (y >= -2.76) {
          rOuter = rWall * 0.94;
        } else {
          float dExit = -2.76 - y;
          // At sea level, 77.5:1 nozzle overexpands -> plume pinches inward then pulses with Mach cells
          float basePinch = mix(0.56, 0.72, uValveNorm);
          float cellWave = 0.09 * cos(dExit * 13.0);
          rOuter = rWall * (basePinch + cellWave) * (1.0 - 0.28 * clamp(dExit / 0.80, 0.0, 1.0));
        }

        float radialMask = 1.0 - smoothstep(rOuter * 0.35, rOuter, r);
        if (radialMask < 0.003 || topFade < 0.003 || botFade < 0.003) discard;

        float rNorm = clamp(r / max(rOuter, 0.01), 0.0, 1.0);

        // High-speed supersonic flow advection
        float advect = uTime * 8.5;

        // Standing Mach shock diamonds (2-3 distinct nodes below exit; wavelength stretches with Pc)
        float shockK = mix(19.5, 13.5, uValveNorm);
        float distFromExit = max(0.0, -2.68 - y);
        float machWave = 0.5 + 0.5 * cos(distFromExit * shockK - rNorm * 1.8);
        float inExhaustJet = smoothstep(-2.45, -2.74, y);
        float diamondCore = pow(machWave, 3.2) * exp(-rNorm * rNorm * 2.8) * (0.35 + 0.85 * inExhaustJet);

        // Subtle high-velocity axial shear streaks
        float streak = 0.88 + 0.12 * sin(y * 24.0 + advect + rNorm * 7.0);

        // Axial zone transitions: hot combustion throat -> blue-violet LH2/LOX Mach plume
        float inChamber = smoothstep(-1.35, -0.95, y);
        float inPlume = smoothstep(-2.25, -2.72, y);

        vec3 chamberCol = mix(uColComb, vec3(1.0, 0.95, 0.82), uIsDark * 0.45);
        vec3 machCol = mix(uColIntake, uColComp, 0.35 + 0.45 * diamondCore);
        vec3 col = mix(machCol, chamberCol, clamp(inChamber * 0.9 + (1.0 - inPlume) * 0.35, 0.0, 1.0));

        // Brighten Mach shock diamond nodes
        vec3 nodeTint = uIsDark > 0.5 ? vec3(0.92, 0.97, 1.0) : mix(uColIntake, uColComb, 0.25);
        col = mix(col, nodeTint, clamp(diamondCore * (uIsDark > 0.5 ? 0.72 : 0.48), 0.0, 1.0));

        float coreDensity = mix(0.62, 0.96, uValveNorm) * streak;
        float jetBoost = mix(1.0, 1.28, inExhaustJet);
        float alphaRaw = (coreDensity * 0.50 + diamondCore * 0.58) * jetBoost * radialMask * topFade * botFade;
        float maxAlpha = uIsDark > 0.5 ? 0.82 : 0.68;
        float alpha = clamp(alphaRaw * vViewWeight * uEnvelope, 0.0, maxAlpha);

        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  kit.onThemeChange((nextTheme) => {
    plumeMat.uniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    plumeMat.uniforms.uColComb.value.set(nextTheme.channels.comb);
    plumeMat.uniforms.uColComp.value.set(nextTheme.channels.comp);
    plumeMat.uniforms.uColIntake.value.set(nextTheme.channels.intake);
  });

  // Assemble 3 crossed axial planes inside a single Group named "exhaust.plumeShader"
  // Note: store shared material on a primary mesh named "exhaust.plumeShader" or group with children
  const plumeGroup = new THREE.Group();
  const planeGeo = new THREE.PlaneGeometry(1.85, 3.00, 1, 48);
  planeGeo.translate(0, -2.08, 0);
  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
  angles.forEach((ang, idx) => {
    const m = new THREE.Mesh(planeGeo, plumeMat);
    m.rotation.y = ang;
    // First mesh carries the lookup name used by updateKinematics
    m.name = idx === 0 ? "exhaust.plumeShader" : `exhaust.plumeShader.${idx}`;
    m.renderOrder = 10;
    plumeGroup.add(m);
  });

  reg.detail("exhaust.plumeGroup", plumeGroup, { parent: engineGimbal, stage: "shader" });
}
