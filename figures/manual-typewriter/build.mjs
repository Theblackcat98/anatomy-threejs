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
  outFile: join(HERE, "dist", "manual-typewriter.html"),
  meta: {
    title: "Anatomy · Manual Type-Bar Typewriter (Three.js Isometric)",
    ariaLabel: "Interactive drawing of a manual type-bar typewriter",
    figLabel: "Fig 07 · Manual Typewriter",
    initialPhase: "READY · TYPEBARS AT REST",
    initialReadout: "COLUMN 00/12 · LEFT MARGIN",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">NO. 5 · QWERTY · ESCAPEMENT</div>`,
      `<div class="engraved-tag" id="tag-paper">TYPE · FEED · RETURN</div>`
    ].join("\n        "),
    captionHtml: `<strong>The object is the explanation.</strong> A key stroke pivots a typebar into the ink ribbon and paper, while the escapement meters the carriage one character at a time. <strong>SPACE</strong> feeds without printing; <strong>RETURN</strong> releases the rack and brings the carriage home.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Typebar &amp; typehead</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-brass"></span>Escapement &amp; fittings</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-copper"></span>Ink ribbon</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-paper"></span>Platen &amp; paper</span>`
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
