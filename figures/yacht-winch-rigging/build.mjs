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
  outFile: join(HERE, "dist", "yacht-winch-rigging.html"),
  meta: {
    title: "Anatomy · Sailing Yacht Winch & Masthead Rigging (Three.js Isometric)",
    ariaLabel: "Interactive 2-speed self-tailing planetary yacht winch and masthead rigging figure",
    figLabel: "Fig 08 · Yacht Winch",
    initialPhase: "WINCH 3.5:1 · TRIM 58%",
    initialReadout: "3.5:1 PLANETARY · 18.0 kn · SHROUD 6.2 kN · SHEET 2.5 kN",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">2-SPD · 3.5:1</div>`,
      `<div class="engraved-tag" id="tag-winch">SELF-TAILER</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>Two-speed mechanical advantage.</strong> Crank clockwise for <strong>1:1 direct speed</strong>, or reverse counter-clockwise to drive a <strong>12:15:42 planetary reduction (3.5:1)</strong> while ratchet pawls keep the drum winding clockwise under mainsheet &amp; shroud loads.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Winch Drum &amp; Sun</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-brass"></span>3× Planets &amp; Pawls</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>High Wind Pressure</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Leeward Flow</span>`
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
