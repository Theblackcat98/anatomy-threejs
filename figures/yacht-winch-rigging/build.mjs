import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndVerifyFigure } from "../../kit/bundle.mjs";
import * as model from "./model.mjs";
import { buildBase } from "./base.mjs";
import { buildStructure } from "./structure.mjs";
import { buildSubject } from "./subject.mjs";
import { buildMechanism, updateKinematics, tourAt } from "./mechanism.mjs";
import { buildShader } from "./shader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

buildAndVerifyFigure({
  figureDir: HERE,
  outFile: join(HERE, "dist", "yacht-winch-rigging.html"),
  meta: {
    title: "Anatomy · Sailing Yacht 2-Speed Winch & Masthead Rigging (Three.js Isometric)",
    ariaLabel: "Interactive 2-speed self-tailing planetary yacht winch and masthead rigging cutaway figure",
    figLabel: "Fig 10 · Yacht 2-Speed Winch & Masthead Rigging",
    initialPhase: "46ST SELF-TAILING · 1ST GEAR (CW) · 13.5:1 FAST TRIM",
    initialReadout: "GEAR 1 (CW 13.5:1) · SHEET 7.0 kN · V1 SHROUD 11.5 kN · CAMBER 8.7% · WIND 18 kt",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">46ST 2-SPEED · 13.5:1 / 46:1 · MASTHEAD RIG</div>`,
      `<div class="engraved-tag" id="tag-masthead">MASTHEAD RIG · V1/D1 SHROUDS</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Crank the lock-in handle clockwise for 1st-gear fast trim (2.6:1) or reverse counter-clockwise to engage the 2nd-gear compound reduction (9.2:1 / 46:1 mechanical advantage)—opposing ratchets ensure the drum always hauls clockwise through its self-tailing brass jaws, trimming the boom against wind-loaded shrouds and hydraulic backstay mast bend to control sail draft camber.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Loaded Sheet &amp; Sail Foil</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Windward V1 Shroud &amp; High Load</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Leeward Shroud &amp; Suction Slot</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comp"></span>2nd-Gear Compound &amp; Backstay</span>`
    ].join("\n        ")
  },
  model,
  buildBase,
  buildStructure,
  buildSubject,
  buildMechanism,
  buildShader,
  updateKinematics,
  tourAt
});
