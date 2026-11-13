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
  outFile: join(HERE, "dist", "helicopter-swashplate.html"),
  meta: {
    title: "Anatomy · Helicopter Swashplate & Rotor Hub (Three.js Isometric)",
    ariaLabel: "Interactive helicopter swashplate and articulated rotor hub test rig",
    figLabel: "Fig 05 · Rotor Swashplate",
    initialPhase: "LOW COLLECTIVE",
    initialReadout: "ψ 000° · COLL 3.8° · CONE 3.4° · 180 rpm",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">MRH-3 · CCPM 120° · 4:1</div>`,
      `<div class="engraved-tag" id="tag-gauge">CONE°</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Three 120° servo actuators tilt and lift a non-rotating lower swashplate around a spherical uniball; a bearing-mounted upper swashplate rotates with the mast so pitch links pump <strong>once per revolution</strong> to feather and cone all three blades.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Rotor Hub &amp; Blades</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Swept Rotor-Disc Blur</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Pitch Links &amp; Scissors</span>`
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
