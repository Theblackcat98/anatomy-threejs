import * as THREE from "three";
import { SPEC, bandHalf, getPrintState } from "./model.mjs";

export function buildShader(reg, kit) {
  const baseGroup = reg.groups.get("base.group")?.group || reg.root;
  const shaderGroup = reg.group("p1s.shaderGroup", {
    parent: baseGroup,
    stage: "shader"
  });
  const thGroup = reg.groups.get("subject.toolhead")?.group;

  const theme = kit.currentTheme;
  const initSt = getPrintState(SPEC.initialTheta, {}, {});

  const sharedUniforms = {
    uTime: { value: SPEC.initialTheta },
    uXt: { value: initSt.xt },
    uZc: { value: initSt.zc },
    uNozzleT: { value: initSt.nozzleT },
    uFan: { value: initSt.fan },
    uSpeed: { value: initSt.speed },
    uLayerH: { value: initSt.layerH },
    uBandHalf: { value: bandHalf(initSt.k) },
    uExtruding: { value: initSt.extruding ? 1.0 : 0.0 },
    uBedTopY: { value: initSt.bedTopY },
    uEnvelope: { value: 1.0 },
    uIsDark: { value: theme.isDark ? 1.0 : 0.0 },
    uColIntake: { value: new THREE.Color(theme.channels.intake) },
    uColComp: { value: new THREE.Color(theme.channels.comp) },
    uColComb: { value: new THREE.Color(theme.channels.comb) },
    uColExh: { value: new THREE.Color(theme.channels.exhaust) }
  };

  // 1. Horizontal Active-Layer Thermal Melt & Aux Fan Cross-Flow Cooling Plane
  const layerMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: sharedUniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uXt;
      uniform float uZc;
      uniform float uNozzleT;
      uniform float uFan;
      uniform float uSpeed;
      uniform float uLayerH;
      uniform float uBandHalf;
      uniform float uExtruding;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComp;
      uniform vec3 uColComb;
      uniform vec3 uColExh;
      varying vec3 vWorldPos;

      void main() {
        float px = vWorldPos.x;
        float pz = vWorldPos.z;

        // Soft chamber-interior mask (feathered well inside walls and lead screws)
        float maskX = smoothstep(-1.62, -1.32, px) * (1.0 - smoothstep(0.88, 1.28, px));
        float maskZ = smoothstep(-1.42, -1.05, pz) * (1.0 - smoothstep(1.05, 1.42, pz));
        float envMask = maskX * maskZ;
        if (envMask <= 0.002 || uEnvelope <= 0.002) discard;

        // Nozzle thermal melt pool around active position (uXt, uZc)
        float dNoz = length(vec2(px - uXt, pz - uZc));
        float tempNorm = clamp((uNozzleT - 180.0) / 120.0, 0.0, 1.0);
        float meltCore = exp(-pow(dNoz / (0.14 + 0.05 * tempNorm), 2.0));
        float meltHalo = exp(-pow(dNoz / 0.36, 2.0)) * 0.45;

        // Flow-limit subtle thermal ripple when speed exceeds volumetric threshold
        float rawFlow = uSpeed * 0.42 * uLayerH;
        float flowLim = 21.0 + (uNozzleT - 220.0) * 0.12;
        float overFlow = clamp((rawFlow - flowLim) / 12.0, 0.0, 1.0);
        float ripple = 0.88 + 0.12 * sin(dNoz * 28.0 - uTime * 6.0) * (0.35 + 0.65 * overFlow);

        float heatWeight = (meltCore * 0.95 + meltHalo * 0.55) * mix(0.35, 1.0, uExtruding) * ripple;
        vec3 heatCol = mix(uColComb, uColExh, 0.22 + 0.48 * tempNorm);
        if (uIsDark > 0.5) {
          heatCol = mix(heatCol, vec3(1.0, 0.94, 0.78), meltCore * 0.55 * tempNorm);
        }

        // Aux blower cross-flow cooling sheet blowing +X from left wall (x = -1.62, z = 0.18)
        float fanNorm = clamp(uFan / 100.0, 0.0, 1.0);
        float zPlume = exp(-pow((pz - 0.18) / 0.58, 2.0));
        float xDecay = smoothstep(-1.62, -1.20, px) * (1.0 - smoothstep(0.15, 1.25, px));
        float streamWave = 0.5 + 0.5 * sin(px * 9.5 - uTime * (4.0 + fanNorm * 8.0) + cos((pz - 0.18) * 10.0) * 0.6);
        float streakRibs = 0.55 + 0.45 * cos((pz - 0.18) * 18.0);
        float airWeight = fanNorm * zPlume * xDecay * (0.28 + 0.42 * streamWave * streakRibs) * 0.65;

        // Thermal wake cooling gradient where Aux air sweeps past nozzle toward +X
        vec3 airCol = mix(uColIntake, uColComp, clamp((px - uXt + 0.4) * 0.5, 0.0, 0.65));

        vec3 col = airCol * airWeight + heatCol * heatWeight;
        float alpha = clamp((airWeight * 0.62 + heatWeight * 0.78) * envMask * uEnvelope, 0.0, 0.74);
        if (alpha < 0.008) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const layerGeo = new THREE.PlaneGeometry(2.92, 2.86);
  layerGeo.rotateX(-Math.PI / 2);
  const layerMesh = new THREE.Mesh(layerGeo, layerMat);
  layerMesh.position.set(-0.17, SPEC.NOZZLE_TIP_Y - 0.008, 0.0);
  layerMesh.renderOrder = 3;
  reg.detail("p1s.layerShaderPlane", layerMesh, { parent: shaderGroup, stage: "shader" });

  // 2. Coaxial Toolhead Part-Cooling Cone & Brass Nozzle Heat Plume
  const coneMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: sharedUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uNozzleT;
      uniform float uFan;
      uniform float uExtruding;
      uniform float uEnvelope;
      uniform float uIsDark;
      uniform vec3 uColIntake;
      uniform vec3 uColComb;
      uniform vec3 uColExh;
      varying vec2 vUv;

      void main() {
        if (uEnvelope <= 0.002) discard;
        // vUv.y = 1.0 at nozzle tip (top), 0.0 at bottom skirt near printed layer
        float vertFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
        float fanNorm = clamp(uFan / 100.0, 0.0, 1.0);
        float tempNorm = clamp((uNozzleT - 180.0) / 120.0, 0.0, 1.0);

        float jetSwirl = 0.65 + 0.35 * sin(vUv.y * 16.0 + uTime * 7.0 + sin(vUv.x * 12.566) * 0.5);
        float innerHeat = smoothstep(0.55, 0.96, vUv.y) * mix(0.4, 1.0, uExtruding);
        float coolSkirt = fanNorm * smoothstep(0.85, 0.15, vUv.y) * jetSwirl;

        vec3 heatCol = mix(uColComb, uColExh, tempNorm * 0.65);
        if (uIsDark > 0.5) {
          heatCol = mix(heatCol, vec3(1.0, 0.95, 0.8), 0.35 * innerHeat);
        }

        vec3 col = mix(uColIntake, heatCol, clamp(innerHeat * 1.15, 0.0, 1.0));
        float alpha = clamp((coolSkirt * 0.44 + innerHeat * 0.68) * (0.3 + 0.7 * vertFade) * uEnvelope, 0.0, 0.68);
        if (alpha < 0.01) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const coneGeo = new THREE.CylinderGeometry(0.036, 0.185, 0.15, 24, 1, true);
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.set(0.0, SPEC.NOZZLE_TIP_Y - 0.075, 0.0);
  coneMesh.renderOrder = 4;
  reg.detail("p1s.nozzlePlume", coneMesh, {
    parent: thGroup || shaderGroup,
    stage: "shader"
  });

  kit.onThemeChange((nextTheme) => {
    sharedUniforms.uIsDark.value = nextTheme.isDark ? 1.0 : 0.0;
    sharedUniforms.uColIntake.value.set(nextTheme.channels.intake);
    sharedUniforms.uColComp.value.set(nextTheme.channels.comp);
    sharedUniforms.uColComb.value.set(nextTheme.channels.comb);
    sharedUniforms.uColExh.value.set(nextTheme.channels.exhaust);
  });
}
