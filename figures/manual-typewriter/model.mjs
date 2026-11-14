const NUMBER_KEYS = [
  ["1", "!"], ["2", "@"], ["3", "#"], ["4", "$"], ["5", "%"], ["6", "^"],
  ["7", "&"], ["8", "*"], ["9", "("], ["0", ")"], ["-", "_"], ["=", "+"]
];
const KEY_PITCH = 0.215;
const positionedRow = (keys, row, z, offset = 0) => keys.map((key, index) => ({
  ...key,
  row,
  x: offset + (index - (keys.length - 1) * 0.5) * KEY_PITCH,
  z,
  kind: "type"
}));

export const KEY_ROWS = [
  positionedRow(NUMBER_KEYS.map(([label, shifted], i) => ({ id: `num-${i}`, label, shifted })), 0, -0.39),
  positionedRow([ ..."QWERTYUIOP" ].map((label) => ({ id: label.toLowerCase(), label, shifted: label })).concat([
    { id: "bracket-left", label: "[", shifted: "{" },
    { id: "bracket-right", label: "]", shifted: "}" }
  ]), 1, -0.13),
  positionedRow([ ..."ASDFGHJKL" ].map((label) => ({ id: label.toLowerCase(), label, shifted: label })).concat([
    { id: "semicolon", label: ";", shifted: ":" },
    { id: "apostrophe", label: "'", shifted: "\"" }
  ]), 2, 0.13, 0.09),
  positionedRow([ ..."ZXCVBNM" ].map((label) => ({ id: label.toLowerCase(), label, shifted: label })).concat([
    { id: "comma", label: ",", shifted: "<" },
    { id: "period", label: ".", shifted: ">" },
    { id: "slash", label: "/", shifted: "?" }
  ]), 3, 0.39, 0.18)
];

export const ACTIVE_KEYS = KEY_ROWS.flat();
export const TYPEBAR_COUNT = ACTIVE_KEYS.length;
export const TYPEBAR_SLOTS = ACTIVE_KEYS
  .map((key, keyIndex) => ({ ...key, keyIndex }))
  .sort((a, b) => a.x - b.x || a.row - b.row || a.keyIndex - b.keyIndex)
  .map((slot, slotIndex, slots) => ({
    ...slot,
    slotIndex,
    barX: -1.34 + slotIndex * (2.68 / Math.max(1, slots.length - 1))
  }));

let selectedKeyIndex = ACTIVE_KEYS.findIndex((key) => key.label === "K");
let shiftUppercase = false;
let returnFromColumn = 0;
let typedText = "";
let lineCount = 0;

export function selectTypeKey(index) {
  if (Number.isInteger(index) && index >= 0 && index < ACTIVE_KEYS.length) selectedKeyIndex = index;
}

export function getSelectedTypeKey() {
  return ACTIVE_KEYS[selectedKeyIndex] || ACTIVE_KEYS[0];
}

export function isShifted() {
  return shiftUppercase;
}

export function getTypedText() {
  return typedText;
}

export function getLineCount() {
  return lineCount;
}

export function getReturnStartColumn() {
  return returnFromColumn;
}

function appendTypedCharacter(character) {
  if (character === "BACKSPACE") {
    typedText = typedText.slice(0, -1);
    return;
  }
  if (character === "LINEFEED") {
    lineCount += 1;
    typedText += "\n";
    return;
  }
  typedText = (typedText + character).slice(-56);
}

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
  interactionHint: "Press or drag a key to drive its typebar; use SPACE, SHIFT, LINE FEED, and RETURN",
  controls: [
    {
      id: "column",
      label: "CARRIAGE",
      min: 0,
      max: 32,
      step: 1,
      initial: 0,
      title: "Carriage position in character spaces"
    }
  ],
  triggers: [
    {
      id: "strike",
      label: "TYPE",
      title: "Press a key: its typebar strikes the ribbon and paper, then the escapement advances",
      rise: 0.035,
      fall: 0.32,
      onTrigger: ({ state, setParam }) => {
        const key = ACTIVE_KEYS[selectedKeyIndex] || ACTIVE_KEYS[0];
        const character = shiftUppercase ? key.shifted : key.label;
        appendTypedCharacter(character);
        shiftUppercase = false;
        setParam("column", Math.min(SPEC.maxColumn, Math.round(state.params?.column ?? 0) + 1));
      }
    },
    {
      id: "space",
      label: "SPACE",
      title: "Advance the carriage one character without a typebar strike",
      rise: 0.035,
      fall: 0.24,
      onTrigger: ({ state, setParam }) => {
        appendTypedCharacter(" ");
        setParam("column", Math.min(SPEC.maxColumn, Math.round(state.params?.column ?? 0) + 1));
      }
    },
    {
      id: "shift",
      label: "SHIFT",
      title: "Shift the platen carriage to the upper-case character row",
      rise: 0.04,
      fall: 0.24,
      onTrigger: () => {
        shiftUppercase = true;
      }
    },
    {
      id: "backspace",
      label: "BACKSPACE",
      title: "Release one carriage detent and erase the last demonstration character",
      rise: 0.035,
      fall: 0.24,
      onTrigger: ({ state, setParam }) => {
        appendTypedCharacter("BACKSPACE");
        setParam("column", Math.max(0, Math.round(state.params?.column ?? 0) - 1));
      }
    },
    {
      id: "linefeed",
      label: "LINE FEED",
      title: "Rotate the platen one line and advance the paper",
      rise: 0.04,
      fall: 0.36,
      onTrigger: () => appendTypedCharacter("LINEFEED")
    },
    {
      id: "return",
      label: "RETURN",
      title: "Release the escapement, return the carriage, and feed one line",
      rise: 0.04,
      fall: 0.62,
      onTrigger: ({ state, setParam, fireTrigger }) => {
        returnFromColumn = Math.max(0, Math.min(SPEC.maxColumn, Math.round(state.params?.column ?? 0)));
        setParam("column", 0);
        fireTrigger("linefeed");
      }
    }
  ],
  cameraViews: [
    { id: "iso", label: "ISO", elev: 30, azim: -36, zoom: 0.86, pan: [0, -0.32] },
    { id: "keys", label: "KEYBOARD", elev: 58, azim: -18, zoom: 1.06, pan: [0, 0.02] },
    { id: "typebars", label: "TYPEBARS", elev: 24, azim: -8, zoom: 1.12, pan: [0, 0.10] },
    { id: "side", label: "CARRIAGE", elev: 18, azim: -82, zoom: 1.02, pan: [0, 0.02] }
  ],
  auditPoses: [
    { name: "home", theta: 0, explode: 0, params: { column: 0 } },
    { name: "strike-left", theta: 0, explode: 0, params: { column: 2 }, triggers: { strike: 1 } },
    { name: "strike-center", theta: 0, explode: 0, params: { column: 6 }, triggers: { strike: 1 } },
    { name: "carriage-end", theta: 0, explode: 0, params: { column: 12 } },
    { name: "return", theta: 0, explode: 0, params: { column: 0 }, triggers: { return: 1 } }
  ],
  drivePoses: [
    { label: "HOME · FOUR-ROW KEYBOARD", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 0 } } },
    { label: "TYPE · TYPEBAR IMPACT", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 2 }, trigger: "strike" } },
    { label: "ESCAPEMENT · FEED", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 5 }, trigger: "space" } },
    { label: "SHIFT · UPPER CASE", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "paper", params: { column: 3 }, trigger: "shift" } },
    { label: "CARRIAGE · RIGHT MARGIN", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "light", params: { column: 12 } } },
    { label: "LINE FEED · PLATEN", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "sepia", params: { column: 4 }, trigger: "linefeed" } },
    { label: "RETURN · CARRIAGE", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "dark", params: { column: 8 }, trigger: "return" } },
    { label: "TYPE · UPPER ROW", pose: { theta: 0, explode: 0, cutaway: false, hud: true, theme: "blueprint", params: { column: 7 }, trigger: "strike" } }
  ],
  isoElevDeg: 30,
  isoAzimDeg: -36,
  initialZoom: 0.86,
  initialPanY: -0.32,
  minVertSpan: 5.7,
  minHorizSpan: 6.1,
  BASE_W: 5.00,
  BASE_D: 3.55,
  BASE_H: 0.16,
  BASE_Y: -0.16,
  topSurfaceY: -0.16 + 0.16 + 0.025,
  CASE_W: 4.72,
  CASE_D: 2.75,
  CASE_H: 0.34,
  caseFloorY: -0.16 + 0.16 + 0.025 + 0.005,
  caseTopY: -0.16 + 0.16 + 0.025 + 0.005 + 0.34,
  keyboardY: 0.57,
  keyboardZ: 0.78,
  basketY: 1.08,
  basketZ: -0.15,
  platenY: 1.79,
  platenZ: -0.79,
  platenRadius: 0.205,
  paperFrontZ: -0.79 + 0.205 + 0.012,
  ribbonZ: -0.79 + 0.205 + 0.035,
  strikeZ: -0.79 + 0.205 + 0.012,
    carriageStartX: -0.45,
    carriagePitch: 0.028,
    maxColumn: 32,
  shiftDistance: 0.04,
  keyPitch: KEY_PITCH,
  typebarCount: TYPEBAR_COUNT
};

export const ANCHORS = {
  baseTop: [0, SPEC.topSurfaceY, 0],
  caseFloor: [0, SPEC.caseFloorY, 0],
  keyboardCenter: [0, SPEC.keyboardY, SPEC.keyboardZ],
  typebasketCenter: [0, SPEC.basketY, SPEC.basketZ],
  printPoint: [0, SPEC.platenY, SPEC.strikeZ],
  platenCenter: [0, SPEC.platenY, SPEC.platenZ],
  carriageLeft: [-1.62, SPEC.platenY, SPEC.platenZ],
  carriageRight: [1.62, SPEC.platenY, SPEC.platenZ],
  returnMount: [SPEC.carriageStartX - 1.48, 1.62, -0.35]
};

export function getTypewriterState(params = {}, triggers = {}) {
  const column = Math.max(0, Math.min(SPEC.maxColumn, Number(params.column ?? 0)));
  const action = (triggers.strike ?? 0) > 0.08
    ? "TYPEBAR IMPACT"
    : (triggers.return ?? 0) > 0.08
      ? "CARRIAGE RETURN"
      : (triggers.linefeed ?? 0) > 0.08
        ? "PAPER LINE FEED"
        : (triggers.shift ?? 0) > 0.08
          ? "SHIFT CARRIAGE"
          : (triggers.space ?? 0) > 0.08
            ? "ESCAPEMENT FEED"
            : "READY · TYPEBARS AT REST";
  return { column, action, carriageX: SPEC.carriageStartX + column * SPEC.carriagePitch };
}

export function formatReadout({ params = {}, triggers = {} } = {}) {
  const state = getTypewriterState(params, triggers);
  return {
    readout: `COLUMN ${String(Math.round(state.column)).padStart(2, "0")}/${SPEC.maxColumn} · ${state.column === 0 ? "LEFT MARGIN" : "ESCAPEMENT DETENT"}`,
    phase: state.action
  };
}
