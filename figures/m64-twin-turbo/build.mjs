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
  outFile: join(HERE, "dist", "m64-twin-turbo.html"),
  meta: {
    title: "Anatomy · Porsche Type M64/60 Twin-Turbo Flat-Six Boxer Engine (Three.js Isometric)",
    ariaLabel: "Interactive Porsche Type M64/60 twin-turbo air-cooled flat-six Boxer engine cutaway figure",
    figLabel: "Fig 10 · Porsche M64/60 Twin-Turbo Boxer",
    initialPhase: "CYL 1 FIRING · 1-6-2-4-3-5",
    initialReadout: "θ 683° · 2400 rpm · +0.34 bar · 92 PS / 269 Nm · ADV 22°",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">PORSCHE M64/60 · 3.6L TWIN-TURBO · 408 PS</div>`,
      `<div class="engraved-tag" id="tag-boxer">180° BOXER · 1-6-2-4-3-5</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>The object is the explanation.</strong> Six horizontally opposed pistons on a 6-throw crankshaft move outward to TDC and inward to BDC in opposing pairs (1–4, 2–5, 3–6), while twin under-bank KKK K16 turbochargers feed a top-mounted air-to-air intercooler and a belt-driven 11-blade axial fan cools the finned cylinders.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Lit Crank, Pistons &amp; 11-Blade Fan</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>K16 Compressors &amp; Spider Intake</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>K16 Turbines &amp; Ignition</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-exh"></span>3-into-1 Exhaust Headers</span>`
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
