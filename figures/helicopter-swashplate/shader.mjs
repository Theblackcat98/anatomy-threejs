import * as THREE from "three";
import { SPEC, getRotorState } from "./model.mjs";

export function buildShader(reg, kit) {
  const hubAssembly = reg.groups.get("hub.assembly")?.group || reg.root;
  const theme = kit.currentTheme;
  const initSt = getRotorState(SPEC.initialTheta, SPEC.initialRpm);

  const discMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTheta: { value: SPEC.initialTheta },
      uRpmNorm: { value: initSt.rpmNorm },
      uConeRad: { value: initSt.coningRad },
      uTiltX: { value: initSt.tiltX },
      uTiltZ: { value: initSt.tiltZ },
      uHingeR: { value: SPEC.flapHingeR },
      uRotorR: { value: SPEC.rotorR },
      uEnvelope: { value: 1.0 },
      uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
      uColWake: { value: new THREE.Color(theme.channels.intake) },
      uColTip: { value: new THREE.Color(theme.channels.comb) }
    },
    vertexShader: `
      uniform float uConeRad;
      uniform float uTiltX;
      uniform float uTiltZ;
      uniform float uHingeR;
      varying vec2 vLocalXZ;
      varying float vRadial;

      void main() {
        // PlaneGeometry sits in XZ after rotateX(-PI/2)
        vec3 p = position;
        float r = length(p.xz);
        // Track animated blade coning cone & gentle tip-path cyclic tilt
        float coneLift = max(0.0, r - uHingeR) * tan(uConeRad);
        float tipTilt = (p.z * uTiltX - p.x * uTiltZ) * 0.14;
        p.y += coneLift + tipTilt;

        vLocalXZ = p.xz;
        vRadial = r;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTheta;
      uniform float uRpmNorm;
      uniform float uRotorR;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColWake;
      uniform vec3 uColTip;
      varying vec2 vLocalXZ;
      varying float vRadial;

      const float PI = 3.14159265359;
      const float TWO_PI = 6.28318530718;

      void main() {
        float r = vRadial;
        float rInner = 0.64;
        float rOuter = uRotorR + 0.05;

        // Smooth radial bounds so alpha reaches 0 well inside the plane quad
        float innerMask = smoothstep(rInner, rInner + 0.24, r);
        float outerMask = 1.0 - smoothstep(uRotorR - 0.02, rOuter, r);
        float discMask = innerMask * outerMask;
        if (discMask < 0.002 || uEnvelope < 0.002) discard;

        float rNorm = clamp((r - rInner) / (uRotorR - rInner), 0.0, 1.0);

        // Angle matches Three.js +Y rotation: blade k at (cos A, -sin A) -> A = atan(-z, x)
        float fragAng = atan(-vLocalXZ.y, vLocalXZ.x);

        // Trailing motion-blur wake behind each of the 3 rotating blades
        float trailSpan = mix(0.32, 1.48, clamp(uRpmNorm * 1.25, 0.0, 1.0));
        float wake = 0.0;
        for (int k = 0; k < 3; k++) {
          float bladeAng = uTheta + float(k) * (TWO_PI / 3.0);
          float dAng = mod(fragAng - bladeAng + 8.0 * TWO_PI, TWO_PI);
          // Soft leading-edge feather + long trailing decay
          float trail = exp(-dAng / max(0.18, trailSpan * 0.45)) * smoothstep(0.0, 0.06, dAng);
          float leadGlow = exp(-pow(min(dAng, TWO_PI - dAng) / 0.075, 2.0)) * 0.45;
          wake = max(wake, trail + leadGlow);
        }

        // Crisp translucent outer rotor-disc blur ring + subtle tip-vortex double track
        float tipBand = exp(-pow((rNorm - 0.945) / 0.032, 2.0));
        float subRing = exp(-pow((rNorm - 0.855) / 0.020, 2.0)) * 0.42;
        float radialSweep = smoothstep(0.08, 0.72, rNorm);

        // Concentric aerodynamic downwash ripples inside swept annulus
        float ripple = 0.86 + 0.14 * sin(rNorm * 28.0 - uTheta * 2.0);

        float baseDisc = (0.09 + 0.14 * uRpmNorm) * radialSweep;
        float wakeTerm = wake * (0.24 + 0.34 * uRpmNorm) * radialSweep * ripple;
        float vortexRing = (tipBand * 0.55 + subRing * 0.35) * (0.45 + 0.55 * uRpmNorm);

        float rawAlpha = (baseDisc + wakeTerm + vortexRing) * discMask * uEnvelope;
        float alpha = clamp(rawAlpha * (uIsDark > 0.5 ? 0.82 : 0.68), 0.0, 0.62);
        if (alpha < 0.004) discard;

        vec3 discCol = mix(uColWake, uColTip, clamp(tipBand * 0.75 + wake * 0.18, 0.0, 1.0));
        if (uIsDark > 0.5) {
          discCol = mix(discCol, vec3(0.95, 0.98, 1.0), tipBand * 0.28);
        }

        gl_FragColor = vec4(discCol, alpha);
      }
    `
  });

  kit.onThemeChange((nextTheme) => {
    discMat.uniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    discMat.uniforms.uColWake.value.set(nextTheme.channels.intake);
    discMat.uniforms.uColTip.value.set(nextTheme.channels.comb);
  });

  const planeSize = (SPEC.rotorR + 0.25) * 2.0;
  const discGeo = new THREE.PlaneGeometry(planeSize, planeSize, 48, 48);
  discGeo.rotateX(-Math.PI / 2);
  const discMesh = new THREE.Mesh(discGeo, discMat);
  discMesh.position.set(0, SPEC.hubY - 0.012, 0);
  reg.detail("rotor.discShader", discMesh, { parent: hubAssembly, stage: "shader" });
}
