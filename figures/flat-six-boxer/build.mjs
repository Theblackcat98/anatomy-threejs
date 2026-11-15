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
  outFile: join(HERE, "dist", "flat-six-boxer.html"),
  meta: {
    title: "Anatomy · Twin-Turbo Flat-Six Boxer Engine (Three.js Isometric)",
    ariaLabel: "Interactive twin-turbo flat-six boxer engine dynamometer test rig",
    figLabel: "Fig 06 · Twin-Turbo Flat-Six Boxer",
    initialPhase: "CYL 1 · POWER · 105 HP",
    initialReadout: "θ 032° · 1800 rpm · 0.82 bar · 548°C",
    engravedTagsHtml: [
      `<div class="engraved-tag" id="tag-plate">3.8L F6 TT</div>`,
      `<div class="engraved-tag" id="tag-boost">BAR</div>`
    ].join("\n        "),
    captionHtml:
      `<strong>Opposed balance &amp; twin-scroll boost.</strong> Six horizontally-opposed pistons fire every 120° (<strong>1-6-2-4-3-5</strong>) on a counterweighted crank, driving 0.5× DOHC camshafts, 12 poppet valves, and 3-into-1 Inconel headers into twin swept-blade turbochargers.`,
    legendHtml: [
      `<span class="legend-item"><span class="legend-swatch" id="leg-lit"></span>Opposed Pistons</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-intake"></span>Boost Charge Air</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-comb"></span>Combustion</span>`,
      `<span class="legend-item"><span class="legend-swatch" id="leg-exh"></span>Hot Exhaust Headers</span>`
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
