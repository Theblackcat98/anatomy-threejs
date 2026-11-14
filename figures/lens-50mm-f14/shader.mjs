import * as THREE from "three";
import { SPEC, getLensState } from "./model.mjs";

export function buildShader(reg, kit) {
  const lensAxisGroup = reg.groups.get("lens.axisGroup")?.group || reg.root;
  const theme = kit.currentTheme;
  const initSt = getLensState({ focusDist: 1.2, fstop: 2.0, fieldDeg: 0 });

  const primeRayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: SPEC.initialTheta },
      uFocusShift: { value: initSt.helicoidShiftX },
      uRPupil: { value: initSt.rPupil },
      uPupilNorm: { value: initSt.pupilNorm },
      uFieldRad: { value: initSt.fieldRad },
      uSensorShiftY: { value: initSt.sensorShiftY },
      uIrisX: { value: SPEC.irisX },
      uSensorX: { value: SPEC.sensorPlaneX },
      uAfPulse: { value: 0.0 },
      uCutaway: { value: 1.0 },
      uEnvelope: { value: 1.0 },
      uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
      uColIntake: { value: new THREE.Color(theme.channels.intake) },
      uColComb: { value: new THREE.Color(theme.channels.comb) },
      uColComp: { value: new THREE.Color(theme.channels.comp) }
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
      uniform float uFocusShift;
      uniform float uRPupil;
      uniform float uPupilNorm;
      uniform float uFieldRad;
      uniform float uSensorShiftY;
      uniform float uIrisX;
      uniform float uSensorX;
      uniform float uAfPulse;
      uniform float uCutaway;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComb;
      uniform vec3 uColComp;

      varying vec3 vAxisPos;
      varying float vViewWeight;

      float smoothMix(float a, float b, float t) {
        float s = clamp(t, 0.0, 1.0);
        return mix(a, b, s * s * (3.0 - 2.0 * s));
      }

      // Piecewise optical marginal ray envelope along +X through the Double-Gauss 7E/6G stack
      float evalPrimeBeamRadius(float x) {
        float x0 = -1.42;
        float xFront = -0.82 + uFocusShift;
        float xStop = uIrisX + uFocusShift;
        float xRear = 0.56 + uFocusShift;
        float xImg = uSensorX;

        float rOpen = 0.44 * mix(0.32, 1.0, uPupilNorm);
        float rEnt = clamp(rOpen + tan(abs(uFieldRad)) * 0.16, 0.14, 0.50);
        float rFront = clamp(rOpen * 0.96, 0.12, 0.47);
        float rStop = max(0.068, uRPupil * 0.96);
        float rRear = clamp(mix(rStop * 1.10, 0.34, 0.25 * uPupilNorm), 0.08, 0.36);
        float rImg = 0.022 + 0.014 * uPupilNorm;

        if (x <= xFront) {
          return smoothMix(rEnt, rFront, (x - x0) / max(0.01, xFront - x0));
        }
        if (x <= xStop) {
          return smoothMix(rFront, rStop, (x - xFront) / max(0.01, xStop - xFront));
        }
        if (x <= xRear) {
          return smoothMix(rStop, rRear, (x - xStop) / max(0.01, xRear - xStop));
        }
        return smoothMix(rRear, rImg, (x - xRear) / max(0.01, xImg - xRear));
      }

      // Chief ray centerline Y offset due to off-axis fieldDeg
      float evalPrimeChiefY(float x) {
        float xStop = uIrisX + uFocusShift;
        float slopeIn = sin(uFieldRad) * 0.55;
        if (x <= xStop) {
          return (x - xStop) * slopeIn;
        }
        float t = clamp((x - xStop) / max(0.01, uSensorX - xStop), 0.0, 1.0);
        return mix(0.0, -uSensorShiftY, pow(t, 1.08));
      }

      void main() {
        if (uEnvelope < 0.002) discard;

        float x = vAxisPos.x;
        // Fade gracefully before filter front and precisely on CMOS die
        float leftFade = smoothstep(-1.44, -1.26, x);
        float rightFade = 1.0 - smoothstep(uSensorX - 0.03, uSensorX + 0.015, x);
        // When outer cover is closed (uCutaway=0), only faintly show light cone entering front glass
        float barrelMask = mix(1.0 - smoothstep(-1.32, -1.08, x), 1.0, uCutaway);
        if (leftFade < 0.003 || rightFade < 0.003 || barrelMask < 0.003) discard;

        float beamR = evalPrimeBeamRadius(x);
        float cy = evalPrimeChiefY(x);
        float distAxis = length(vec2(vAxisPos.y - cy, vAxisPos.z));

        float rNorm = distAxis / max(beamR, 0.01);
        if (rNorm > 1.06) discard;

        // Soft cone body + crisp axial & marginal geometrical optics ray traces
        float coneBody = (1.0 - smoothstep(0.65, 1.02, rNorm)) * 0.38;
        float rayCenter = exp(-pow(rNorm / 0.08, 2.0)) * 0.55;
        float rayMid = exp(-pow((rNorm - 0.52) / 0.055, 2.0)) * 0.42;
        float rayEdge = exp(-pow((rNorm - 0.90) / 0.048, 2.0)) * 0.58;
        float rays = rayCenter + rayMid + rayEdge;

        // Traveling wavefront ripples + AF lock burst
        float phaseWave = 0.90 + 0.10 * sin(x * 16.0 - uTime * 3.0);
        float afPulseWave = uAfPulse * exp(-pow(mod(x + 1.5 - uAfPulse * 2.2, 1.2) - 0.6, 2.0) / 0.04);

        // Color transition: cool cyan-blue entrance -> warm amber focal converge toward CMOS die
        float xStop = uIrisX + uFocusShift;
        float postStop = smoothstep(xStop - 0.14, xStop + 0.35, x);
        float focalGlow = smoothstep(uSensorX - 0.32, uSensorX - 0.02, x);

        vec3 preCol = mix(uColIntake, uColComp, 0.25);
        vec3 postCol = mix(uColComb, vec3(1.0, 0.96, 0.85), (0.35 * focalGlow + afPulseWave * 0.4) * (0.4 + 0.6 * uIsDark));
        vec3 col = mix(preCol, postCol, clamp(postStop * 0.88 + focalGlow * 0.25, 0.0, 1.0));

        float rawAlpha = (coneBody + rays * 0.72 + focalGlow * 0.35 * (1.0 - smoothstep(0.4, 1.0, rNorm))) * phaseWave;
        rawAlpha *= leftFade * rightFade * barrelMask;

        float maxA = uIsDark > 0.5 ? 0.74 : 0.56;
        float alpha = clamp(rawAlpha * vViewWeight * uEnvelope * (1.0 + 0.28 * uAfPulse), 0.0, maxA);
        if (alpha < 0.004) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  kit.onThemeChange((nextTheme) => {
    primeRayMat.uniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    primeRayMat.uniforms.uColIntake.value.set(nextTheme.channels.intake);
    primeRayMat.uniforms.uColComb.value.set(nextTheme.channels.comb);
    primeRayMat.uniforms.uColComp.value.set(nextTheme.channels.comp);
  });

  const rayGroup = new THREE.Group();
  rayGroup.name = "optics.rayShader";

  const basePlaneGeo = new THREE.PlaneGeometry(2.92, 1.12, 56, 1);
  basePlaneGeo.translate(0.01, 0, 0); // spans [-1.45, +1.47] along X
  [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((ang, idx) => {
    const planeGeo = basePlaneGeo.clone();
    planeGeo.rotateX(ang);
    const mesh = new THREE.Mesh(planeGeo, primeRayMat);
    mesh.name = `optics.rayPlane.${idx}`;
    mesh.renderOrder = 10;
    rayGroup.add(mesh);
  });

  reg.detail("optics.rayShader", rayGroup, { parent: lensAxisGroup, stage: "shader" });
}
