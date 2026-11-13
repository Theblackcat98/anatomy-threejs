import * as THREE from "three";
import { SPEC } from "./model.mjs";

export function buildShader(reg, kit) {
  const statorGroup = reg.groups.get("stator.group")?.group || reg.root;
  const theme = kit.currentTheme;

  const chamberShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTheta: { value: SPEC.initialTheta },
      uR: { value: SPEC.R },
      uE: { value: SPEC.e },
      uEnvelope: { value: 1.0 },
      uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
      uCavity: { value: new THREE.Color(theme.channels.cavity) },
      uColIntake: { value: new THREE.Color(theme.channels.intake) },
      uColComp: { value: new THREE.Color(theme.channels.comp) },
      uColComb: { value: new THREE.Color(theme.channels.comb) },
      uColExh: { value: new THREE.Color(theme.channels.exhaust) }
    },
    vertexShader: `
      varying vec2 vLocalXY;
      void main() {
        vLocalXY = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTheta;
      uniform float uR;
      uniform float uE;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uCavity;
      uniform vec3 uColIntake;
      uniform vec3 uColComp;
      uniform vec3 uColComb;
      uniform vec3 uColExh;
      varying vec2 vLocalXY;

      const float PI = 3.14159265359;

      void main() {
        vec2 p = vLocalXY;
        float t = atan(p.y, p.x);
        for (int iter = 0; iter < 2; iter++) {
          vec2 ep = vec2(uE * cos(3.0 * t) + uR * cos(t), uE * sin(3.0 * t) + uR * sin(t));
          float err = atan(p.y, p.x) - atan(ep.y, ep.x);
          t += err * 0.65;
        }
        vec2 wallPt = vec2(uE * cos(3.0 * t) + uR * cos(t), uE * sin(3.0 * t) + uR * sin(t));
        float rWall = length(wallPt);
        float rPt = length(p);

        if (rPt > rWall + 0.01) discard;

        vec2 rotorCenter = vec2(uE * cos(uTheta), uE * sin(uTheta));
        vec2 rel = p - rotorCenter;
        float alpha = uTheta / 3.0;
        float c = cos(-alpha);
        float s = sin(-alpha);
        vec2 rotLocal = vec2(c * rel.x - s * rel.y, s * rel.x + c * rel.y);

        float angLocal = mod(atan(rotLocal.y, rotLocal.x) + 2.0 * PI, 2.0 * PI);
        float sector = floor(angLocal / (2.0 * PI / 3.0));
        float flankWorldAngle = alpha + sector * (2.0 * PI / 3.0) + PI / 3.0;

        float cyc = mod(-flankWorldAngle + PI * 0.68 + 8.0 * PI, 2.0 * PI);
        float phaseNorm = cyc / (2.0 * PI);

        float wIntake = smoothstep(0.0, 0.06, phaseNorm) * (1.0 - smoothstep(0.22, 0.30, phaseNorm));
        float wComp   = smoothstep(0.22, 0.30, phaseNorm) * (1.0 - smoothstep(0.47, 0.53, phaseNorm));
        float wComb   = smoothstep(0.47, 0.52, phaseNorm) * (1.0 - smoothstep(0.72, 0.80, phaseNorm));
        float wExh    = smoothstep(0.72, 0.80, phaseNorm) * (1.0 - smoothstep(0.94, 1.0, phaseNorm));

        float sparkPulse = exp(-pow((phaseNorm - 0.54) / 0.045, 2.0));

        vec3 gasCol = uColIntake * wIntake
                    + uColComp * wComp
                    + uColComb * (wComb + sparkPulse * 0.65)
                    + uColExh * wExh;

        float radialNorm = clamp(rPt / rWall, 0.0, 1.0);
        float wave = 0.82 + 0.18 * sin(radialNorm * 18.0 - uTheta * 2.0);
        float rimFade = smoothstep(1.0, 0.92, radialNorm) * smoothstep(0.35, 0.55, radialNorm);

        float intensity = (wIntake * 0.42 + wComp * 0.55 + wComb * 0.82 + sparkPulse * 0.45 + wExh * 0.48) * wave * rimFade * uEnvelope;

        vec3 finalCol = mix(uCavity, gasCol, clamp(intensity, 0.0, 0.92));
        if (uIsDark > 0.5 && sparkPulse > 0.1) {
          finalCol = mix(finalCol, vec3(1.0, 0.97, 0.86), sparkPulse * 0.45 * uEnvelope);
        }

        gl_FragColor = vec4(finalCol, 0.95);
      }
    `
  });

  kit.onThemeChange((nextTheme) => {
    chamberShaderMat.uniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    chamberShaderMat.uniforms.uCavity.value.set(nextTheme.channels.cavity);
    chamberShaderMat.uniforms.uColIntake.value.set(nextTheme.channels.intake);
    chamberShaderMat.uniforms.uColComp.value.set(nextTheme.channels.comp);
    chamberShaderMat.uniforms.uColComb.value.set(nextTheme.channels.comb);
    chamberShaderMat.uniforms.uColExh.value.set(nextTheme.channels.exhaust);
  });

  const chamberPlaneGeo = new THREE.PlaneGeometry(3.4, 3.4);
  const chamberPlane = new THREE.Mesh(chamberPlaneGeo, chamberShaderMat);
  chamberPlane.position.z = -SPEC.depth * 0.46;
  reg.detail("chamber.shaderPlane", chamberPlane, { parent: statorGroup, stage: "shader" });
}
