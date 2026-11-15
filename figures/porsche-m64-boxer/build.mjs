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
  outFile: join(HERE, "dist", "porsche-m64-boxer.html"),
  meta: {
    title: "Anatomy · Porsche M64/60 Twin-Turbo Boxer Engine (Three.js Isometric)",
    ariaLabel: "Interactive Porsche M64/60 twin-turbo flat-six boxer dynamometer test rig",
    figLabel: "Fig 11 · Porsche M64/60 Twin-Turbo Boxer",
    initialPhase: "CYL 1 · POWER · 165 PS",
    initialReadout: "θ 032° · 2400 rpm · +0.29 bar · 622°C",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">M64/60 · 3.6L F6 TT</div>`,
      `<div class="engraved-tag" id="tag-boost">BAR</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>Opposed balance &amp; twin KKK K16 boost.</strong> Six horizontally-opposed pistons (100.0 &times; 76.4 mm ratio) fire every 120&deg; (<strong>1-6-2-4-3-5</strong>), driving 0.5&times; camshafts, a 1.62&times; 11-blade cooling fan, and twin spiral-volute K16 turbochargers whose boost &amp; thermal glow respond directly to RPM and throttle.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Pistons, Fan &amp; Impellers</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Boost Charge Air</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Combustion</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-exh"></span>Hot Exhaust &amp; K16 Turbines</span>`
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
