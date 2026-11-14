export const SPEC = {
  archetype: "cabinet",
  simulationMode: "sequence",
  toneMode: "single-lit",
  features: {
    explode: false,
    cutaway: false,
    shader: false,
    crank: false,
    slow: false,
    rpm: false,
    section: false,
    timeline: false
  },
  interactionHint: "Use TYPE / SPACE / RETURN, or drag the carriage to inspect its travel",
  controls: [
    {
      id: "column",
      label: "FEED",
      min: 0,
      max: 12,
      step: 1,
      initial: 0,
      title: "Carriage position in character spaces"
    }
  ],
  triggers: [
    {
      id: "strike",
      label: "TYPE",
      title: "Strike the typebar and advance the escapement one character",
      rise: 0.045,
      fall: 0.62,
      onTrigger: ({ state, setParam }) => {
        const column = Math.round(state.params?.column ?? 0);
        setParam("column", Math.min(12, column + 1));
      }
    },
    {
      id: "space",
      label: "SPACE",
      title: "Advance the carriage one space without striking a typebar",
      rise: 0.05,
      fall: 0.46,
      onTrigger: ({ state, setParam }) => {
        const column = Math.round(state.params?.column ?? 0);
        setParam("column", Math.min(12, column + 1));
      }
    },
    {
      id: "return",
      label: "RETURN",
      title: "Release the carriage and return it to the left margin",
      rise: 0.04,
      fall: 0.72,
      onTrigger: ({ setParam }) => setParam("column", 0)
    }
  ],
  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.96, pan: [0, -0.45] },
    { id: "keys", label: "KEYS", elev: 53, azim: -18, zoom: 1.10, pan: [0, 0.20] },
    { id: "mechanism", label: "TYPEBAR", elev: 25, azim: -8, zoom: 1.16, pan: [0, 0.25] },
    { id: "side", label: "CARRIAGE", elev: 20, azim: -82, zoom: 1.05, pan: [0, 0.20] }
  ],
  auditPoses: [
    { name: "home", theta: 0, explode: 0, params: { column: 0 } },
    { name: "strike", theta: 0, explode: 0, params: { column: 3 }, triggers: { strike: 1 } },
    { name: "carriage-mid", theta: 0, explode: 0, params: { column: 6 } },
    { name: "carriage-end", theta: 0, explode: 0, params: { column: 12 } },
    { name: "return", theta: 0, explode: 0, params: { column: 0 }, triggers: { return: 1 } }
  ],
  drivePoses: [
    { label: "HOME · REST", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 0 } } },
    { label: "TYPE · IMPACT", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 3 }, trigger: "strike" } },
    { label: "ESCAPEMENT · FEED", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 6 }, trigger: "space" } },
    { label: "CARRIAGE · END", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 12 } } },
    { label: "RETURN · HOME", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 0 }, trigger: "return" } },
    { label: "PAPER · THEME", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "paper", params: { column: 7 } } },
    { label: "DARK · IMPACT", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "dark", params: { column: 4 }, trigger: "strike" } },
    { label: "BLUEPRINT · FEED", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "blueprint", params: { column: 9 }, trigger: "space" } }
  ],
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.96,
  initialPanY: -0.45,
  minVertSpan: 7.0,
  minHorizSpan: 7.2,
  BASE_W: 4.8,
  BASE_D: 3.55,
  BASE_H: 0.25,
  BASE_Y: -0.275,
  topSurfaceY: -0.275 + 0.25 + 0.025,
  CASE_W: 4.45,
  CASE_D: 2.78,
  CASE_H: 0.84,
  caseFloorY: -0.275 + 0.25 + 0.025 + 0.025,
  caseTopY: -0.275 + 0.25 + 0.025 + 0.025 + 0.84,
  keyboardY: -0.275 + 0.25 + 0.025 + 0.025 + 0.84 + 0.18,
  platenY: 2.10,
  platenZ: -0.62,
  carriageStartX: -0.58,
  carriagePitch: 0.095,
  maxColumn: 12
};

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  caseFloor: [0, SPEC.caseFloorY, 0],
  keyboardCenter: [0, SPEC.keyboardY, 0.82],
  typebasketCenter: [0, 1.28, -0.22],
  platenCenter: [0, SPEC.platenY, SPEC.platenZ],
  carriageLeft: [-1.65, SPEC.platenY, SPEC.platenZ],
  carriageRight: [1.65, SPEC.platenY, SPEC.platenZ],
  returnMount: [SPEC.carriageStartX + 1.50, 1.70, -0.32],
  plaqueCenter: [-1.28, 0.20, 1.46]
};

export function getTypewriterState(params = {}, triggers = {}) {
  const column = Math.max(0, Math.min(SPEC.maxColumn, Number(params.column ?? 0)));
  const action = (triggers.strike ?? 0) > 0.08
    ? "TYPEBAR IMPACT"
    : (triggers.return ?? 0) > 0.08
      ? "CARRIAGE RETURN"
      : (triggers.space ?? 0) > 0.08
        ? "ESCAPEMENT FEED"
        : "READY · TYPEBARS AT REST";
  return { column, action, carriageX: SPEC.carriageStartX + column * SPEC.carriagePitch };
}

export function formatReadout({ params = {}, triggers = {} } = {}) {
  const st = getTypewriterState(params, triggers);
  return {
    readout: `COLUMN ${String(Math.round(st.column)).padStart(2, "0")}/${SPEC.maxColumn} · ${st.column === 0 ? "LEFT MARGIN" : "ESCAPEMENT ARMED"}`,
    phase: st.action
  };
}
