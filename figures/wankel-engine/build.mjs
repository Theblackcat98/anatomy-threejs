import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndVerifyFigure } from "../../kit/bundle.mjs";
import * as model from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics } from "./mechanism.mjs";
import { buildShader } from "./shader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

buildAndVerifyFigure({
  figureDir: HERE,
  outFile: join(HERE, "dist", "wankel-engine.html"),
  meta: {
    title: "Anatomy · Wankel Rotary Engine (Three.js Isometric)",
    ariaLabel: "Interactive Wankel rotary engine test rig",
    figLabel: "Fig 04 · Wankel Rotary Engine",
    initialPhase: "CHAMBER A · INTAKE",
    initialReadout: "θ 000° · α 000° · 720 rpm · P 1.0 bar",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">13B · R 105 · e 15 · 34:51</div>`,
      `<div class="engraved-tag" id="tag-gauge">BAR</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> A 34-tooth fixed reaction gear inside a 51-tooth rotor bore locks the triangular rotor to <strong>⅓ eccentric shaft speed</strong>, sweeping three crescent chambers simultaneously through Intake, Compression, Ignition, and Exhaust.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Rotor (1/3 ω)</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Intake</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Ignition</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-exh"></span>Exhaust</span>`
    ].join("\n        ")
  },
  model,
  buildBase,
  buildStructure,
  buildSubject,
  buildMechanism,
  buildShader,
  updateKinematics
});
