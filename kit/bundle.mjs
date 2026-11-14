import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { createShaderKit } from "./shaders.mjs";
import { Recorder3D } from "./registry.mjs";
import { runModelAudit, runGeometryAudit } from "./audit3d.mjs";

const KIT_DIR = dirname(fileURLToPath(import.meta.url));

function stripEsmModule(source) {
  return source
    .replace(/^\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "")
    .replace(/^\s*export\s+(?=(?:const|let|var|function|class)\b)/gm, "");
}

export function buildAndVerifyFigure(config) {
  const {
    figureDir,
    outFile,
    copyToFiles = [],
    meta,
    model,
    buildBase,
    buildStructure,
    buildSubject,
    buildMechanism,
    buildShader,
    updateKinematics,
    moduleFiles = [
      "model.mjs",
      "base.mjs",
      "structure.mjs",
      "subject.mjs",
      "mechanism.mjs",
      "shader.mjs"
    ]
  } = config;

  const argv = process.argv.slice(2);
  const wantTestModel = argv.includes("--test-model");
  const wantAudit = argv.includes("--audit");

  // 1. Stage 1 Model Check
  if (wantTestModel || wantAudit) {
    const t0 = performance.now();
    const modelErrors = runModelAudit(model);
    if (modelErrors.length > 0) {
      console.error(`✗ ${modelErrors.length} model problem(s) found:`);
      for (const err of modelErrors) console.error(`  ${err}`);
      process.exit(1);
    }
    const elapsed = (performance.now() - t0).toFixed(1);
    console.log(
      `✓ Stage 1 model check passed · ${Object.keys(model.ANCHORS || {}).length} anchors · full cycle verified (${elapsed} ms)`
    );
    if (wantTestModel && !wantAudit) {
      return;
    }
  }

  // 2. Headless Node.js 3D Geometry Audit
  if (wantAudit) {
    const t0 = performance.now();
    const worldGroup = new THREE.Group();
    const kit = createShaderKit();
    const reg = new Recorder3D(worldGroup, kit);

    reg.setStage("base");
    if (buildBase) buildBase(reg, kit);
    reg.setStage("structure");
    if (buildStructure) buildStructure(reg, kit);
    reg.setStage("subject");
    if (buildSubject) buildSubject(reg, kit);
    reg.setStage("mechanism");
    if (buildMechanism) buildMechanism(reg, kit);
    reg.setStage("shader");
    if (buildShader) buildShader(reg, kit);

    const defaultParams = {};
    if (Array.isArray(model.SPEC?.controls)) {
      for (const c of model.SPEC.controls) defaultParams[c.id] = c.initial;
    }

    const stepPoseFn = (theta, explode, poseParams = {}, poseMeta = {}) => {
      reg.applyExplode(explode, true);
      if (updateKinematics) {
        const mergedParams = Object.assign({}, defaultParams, poseParams);
        const rpmVal =
          mergedParams.rpm !== undefined
            ? mergedParams.rpm
            : model.SPEC?.initialRpm !== undefined
              ? model.SPEC.initialRpm
              : 720;
        const triggers = Object.assign({}, poseMeta?.triggers || {});
        if (Array.isArray(model.SPEC?.triggers)) {
          for (const t of model.SPEC.triggers) {
            if (triggers[t.id] === undefined) triggers[t.id] = 0;
          }
        }
        updateKinematics(reg, {
          theta,
          explode,
          rpm: rpmVal,
          effectiveRpm: rpmVal,
          shaderEnv: 1.0,
          cutaway: model.SPEC?.features?.cutaway === false ? false : true,
          section: poseMeta?.section ?? null,
          simClock: poseMeta?.simClock ?? 0,
          dt: 0.016,
          simulationMode: model.SPEC?.simulationMode || "continuous",
          timeline: mergedParams.timeline ?? 0,
          stepIndex: poseMeta?.stepIndex ?? 0,
          triggers,
          triggerAges: poseMeta?.triggerAges || {},
          params: mergedParams,
          ...mergedParams
        });
      }
    };

    const auditPoses = model.SPEC?.auditPoses;
    const poseCount =
      Array.isArray(auditPoses) && auditPoses.length > 0
        ? auditPoses.length
        : model.SPEC?.features?.explode === false
          ? 4
          : 5;

    const auditErrors = runGeometryAudit(reg, stepPoseFn, {
      features: model.SPEC?.features,
      poses: auditPoses,
      archetype: model.SPEC?.archetype,
      toneMode: model.SPEC?.toneMode,
      simulationMode: model.SPEC?.simulationMode
    });
    const elapsed = (performance.now() - t0).toFixed(1);

    if (auditErrors.length > 0) {
      console.error(`✗ ${auditErrors.length} problem(s) found:`);
      for (const err of auditErrors) console.error(`  ${err}`);
      process.exit(1);
    }

    console.log(
      `✓ 3D geometry audit passed · ${reg.parts.size} parts · ${reg.tubes.length} tubes · ${reg.joints.size} joints · ${poseCount} poses · 0 problems (${elapsed} ms)`
    );
  }

  // 3. Compile standalone HTML bundle from kit + modular stage files
  const shellTemplate = readFileSync(join(KIT_DIR, "shell.html"), "utf8");
  const kitFiles = ["shaders.mjs", "primitives.mjs", "registry.mjs", "runtime.mjs"];

  const chunks = [];
  for (const kf of kitFiles) {
    chunks.push(`/* --- kit/${kf} --- */\n` + stripEsmModule(readFileSync(join(KIT_DIR, kf), "utf8")));
  }
  for (const mf of moduleFiles) {
    chunks.push(`/* --- figure/${mf} --- */\n` + stripEsmModule(readFileSync(join(figureDir, mf), "utf8")));
  }

  chunks.push(`
/* --- mount --- */
mountAnatomyFigure({
  spec: SPEC,
  buildBase: typeof buildBase !== "undefined" ? buildBase : null,
  buildStructure: typeof buildStructure !== "undefined" ? buildStructure : null,
  buildSubject: typeof buildSubject !== "undefined" ? buildSubject : null,
  buildMechanism: typeof buildMechanism !== "undefined" ? buildMechanism : null,
  buildShader: typeof buildShader !== "undefined" ? buildShader : null,
  updateKinematics: typeof updateKinematics !== "undefined" ? updateKinematics : null,
  formatReadout: typeof formatReadout !== "undefined" ? formatReadout : null,
  tourAt: typeof tourAt !== "undefined" ? tourAt : (SPEC.tour || null)
});
`);

  const bundleScript = chunks.join("\n\n");

  const html = shellTemplate
    .replace("{{TITLE}}", meta.title)
    .replace("{{ARIA_LABEL}}", meta.ariaLabel)
    .replace("{{FIG_LABEL}}", meta.figLabel)
    .replace("{{INITIAL_PHASE}}", meta.initialPhase)
    .replace("{{INITIAL_READOUT}}", meta.initialReadout)
    .replace("{{ENGRAVED_TAGS_HTML}}", meta.engravedTagsHtml)
    .replace("{{CAPTION_HTML}}", meta.captionHtml)
    .replace("{{LEGEND_HTML}}", meta.legendHtml)
    .replace("{{BUNDLE_SCRIPT}}", bundleScript);

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html, "utf8");
  console.log(`wrote ${outFile}`);

  for (const dest of copyToFiles) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html, "utf8");
    console.log(`wrote ${dest}`);
  }
}
