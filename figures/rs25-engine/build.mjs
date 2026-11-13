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
  outFile: join(HERE, "dist", "rs25-engine.html"),
  meta: {
    title: "Anatomy · Shuttle RS-25 Main Engine (Three.js Isometric)",
    ariaLabel: "Interactive Space Shuttle RS-25 main engine cutaway test stand",
    figLabel: "Fig 06 · RS-25 SSME",
    initialPhase: "SSME · RATED POWER (100% RPL)",
    initialReadout: "THR 100% · Pc 20.6 MPa · TVC +0.0°/+0.0° · HPFTP 35,130 rpm",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">RS-25D · 77.5:1</div>`,
      `<div class="engraved-tag" id="tag-gauge">Pc MPa</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Drag the bell nozzle, throttle quadrant, or TVC stick directly: cryogenic LH₂ and LOX drive dual fuel-rich preburners and high-pressure turbopumps into a 20.6 MPa NARloy-Z combustion chamber and 77.5:1 regeneratively cooled bell on a ±10.5° two-axis gimbal.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Turbopumps &amp; Injector</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>NARloy-Z Throat &amp; Plume</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Mach Shock Diamonds</span>`
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
