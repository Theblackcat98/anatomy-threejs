import * as THREE from "three";
import { SPEC, getZoomState } from "./model.mjs";

export function buildShader(reg, kit) {
  const zoomAxisGroup = reg.groups.get("zoom.axisGroup")?.group || reg.root;
  const theme = kit.currentTheme;
  const initSt = getZoomState({ focal: 35, focusDist: 1.5, fstop: 2.8 });

  const zoomRayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: SPEC.initialTheta },
      uZoomNorm: { value: initSt.zoomNorm },
      uXG1: { value: initSt.xG1 },
      uXG2: { value: initSt.xG2 },
      uXG3: { value: initSt.xG3 },
      uRPupil: { value: initSt.rPupil },
      uPupilNorm: { value: initSt.pupilNorm },
      uIrisX: { value: SPEC.irisX },
      uG4X: { value: SPEC.g4X },
      uSensorX: { value: SPEC.sensorPlaneX },
      uPulseEnv: { value: 0.0 },
      uCutaway: { value: 1.0 },
      uEnvelope: { value: 1.0 },
      uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
      uColIntake: { value: new THREE.Color(theme.channels.intake) },
      uColComp: { value: new THREE.Color(theme.channels.comp) },
      uColComb: { value: new THREE.Color(theme.channels.comb) }
    },
    vertexShader: `
      varying vec3 vAxisPos;
      varying float vViewWeight;

      void main() {
        vAxisPos = position;
        vec3 viewN = normalize(normalMatrix * normal);
        vViewWeight = smoothstep(0.10, 0.65, abs(viewN.z));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uZoomNorm;
      uniform float uXG1;
      uniform float uXG2;
      uniform float uXG3;
      uniform float uRPupil;
      uniform float uPupilNorm;
      uniform float uIrisX;
      uniform float uG4X;
      uniform float uSensorX;
      uniform float uPulseEnv;
      uniform float uCutaway;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComp;
      uniform vec3 uColComb;

      varying vec3 vAxisPos;
      varying float vViewWeight;

      float smoothMix(float a, float b, float t) {
        float s = clamp(t, 0.0, 1.0);
        return mix(a, b, s * s * (3.0 - 2.0 * s));
      }

      // Parfocal 4-group beam radius tracking live G1, G2, G3 cam positions to fixed sensor plane
      float evalZoomBeamRadius(float x) {
        float xEnt = -1.78;
        float x1 = uXG1;
        float x2 = uXG2;
        float x3 = uXG3;
        float xStop = uIrisX;
        float x4 = uG4X;
        float xImg = uSensorX;

        // At 24mm wide, marginal/field envelope flares wide at front element & pinches at G2;
        // at 70mm tele, entrance bundle is narrower/collimated & expands smoothly into G3/G4.
        float rEnt = mix(0.51, 0.37, uZoomNorm);
        float r1 = mix(0.45, 0.36, uZoomNorm);
        float r2 = mix(0.24, 0.30, uZoomNorm);
        float r3 = mix(0.32, 0.35, uZoomNorm);
        float rStop = max(0.065, uRPupil * 0.96);
        float r4 = clamp(max(rStop * 1.06, mix(0.26, 0.31, uZoomNorm) * mix(0.38, 1.0, uPupilNorm)), 0.08, 0.35);
        float rImg = 0.022 + 0.012 * uPupilNorm;

        if (x <= x1) {
          return smoothMix(rEnt, r1, (x - xEnt) / max(0.02, x1 - xEnt));
        }
        if (x <= x2) {
          return smoothMix(r1, r2, (x - x1) / max(0.02, x2 - x1));
        }
        if (x <= x3) {
          return smoothMix(r2, r3, (x - x2) / max(0.02, x3 - x2));
        }
        if (x <= xStop) {
          return smoothMix(r3, rStop, (x - x3) / max(0.02, xStop - x3));
        }
        if (x <= x4) {
          return smoothMix(rStop, r4, (x - xStop) / max(0.02, x4 - xStop));
        }
        return smoothMix(r4, rImg, (x - x4) / max(0.02, xImg - x4));
      }

      void main() {
        if (uEnvelope < 0.002) discard;

        float x = vAxisPos.x;
        float leftFade = smoothstep(-1.78, -1.56, x);
        float rightFade = 1.0 - smoothstep(uSensorX - 0.03, uSensorX + 0.015, x);
        float barrelMask = mix(1.0 - smoothstep(-1.68, -1.42, x), 1.0, uCutaway);
        if (leftFade < 0.003 || rightFade < 0.003 || barrelMask < 0.003) discard;

        float beamR = evalZoomBeamRadius(x);
        float distAxis = length(vAxisPos.yz);
        float rNorm = distAxis / max(beamR, 0.01);
        if (rNorm > 1.06) discard;

        float coneBody = (1.0 - smoothstep(0.65, 1.02, rNorm)) * 0.36;
        float rayCenter = exp(-pow(rNorm / 0.08, 2.0)) * 0.54;
        float rayMid = exp(-pow((rNorm - 0.50) / 0.055, 2.0)) * 0.42;
        float rayEdge = exp(-pow((rNorm - 0.90) / 0.048, 2.0)) * 0.58;
        float rays = rayCenter + rayMid + rayEdge;

        float phaseWave = 0.90 + 0.10 * sin(x * 15.0 - uTime * 3.0);
        float slewPulse = uPulseEnv * exp(-pow(mod(x + 1.8 - uPulseEnv * 2.8, 1.4) - 0.7, 2.0) / 0.05);

        // Color progression across G1/G2/G3 cam zone -> iris -> parfocal sensor convergence
        float camZone = smoothstep(uXG1, uXG3, x);
        float postIris = smoothstep(uIrisX - 0.12, uSensorX - 0.25, x);
        float focalGlow = smoothstep(uSensorX - 0.32, uSensorX - 0.02, x);

        vec3 variatorCol = mix(uColIntake, uColComp, camZone * 0.65);
        vec3 relayCol = mix(uColComb, vec3(1.0, 0.96, 0.86), (0.35 * focalGlow + slewPulse * 0.4) * (0.4 + 0.6 * uIsDark));
        vec3 col = mix(variatorCol, relayCol, clamp(postIris * 0.86 + focalGlow * 0.25, 0.0, 1.0));

        float rawAlpha = (coneBody + rays * 0.74 + focalGlow * 0.34 * (1.0 - smoothstep(0.4, 1.0, rNorm))) * phaseWave;
        rawAlpha *= leftFade * rightFade * barrelMask;

        float maxA = uIsDark > 0.5 ? 0.74 : 0.56;
        float alpha = clamp(rawAlpha * vViewWeight * uEnvelope * (1.0 + 0.28 * uPulseEnv), 0.0, maxA);
        if (alpha < 0.004) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  kit.onThemeChange((nextTheme) => {
    zoomRayMat.uniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    zoomRayMat.uniforms.uColIntake.value.set(nextTheme.channels.intake);
    zoomRayMat.uniforms.uColComp.value.set(nextTheme.channels.comp);
    zoomRayMat.uniforms.uColComb.value.set(nextTheme.channels.comb);
  });

  const rayGroup = new THREE.Group();
  rayGroup.name = "zoom.rayShader";

  const basePlaneGeo = new THREE.PlaneGeometry(3.48, 1.14, 60, 1);
  basePlaneGeo.translate(-0.04, 0, 0); // spans [-1.78, +1.70] along X
  [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((ang, idx) => {
    const planeGeo = basePlaneGeo.clone();
    planeGeo.rotateX(ang);
    const mesh = new THREE.Mesh(planeGeo, zoomRayMat);
    mesh.name = `zoom.rayPlane.${idx}`;
    mesh.renderOrder = 10;
    rayGroup.add(mesh);
  });

  reg.detail("zoom.rayShader", rayGroup, { parent: zoomAxisGroup, stage: "shader" });
}
