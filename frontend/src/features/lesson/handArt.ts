/**
 * Original cartoon drawings of the 24 static ASL letters, built from simple shapes (no third-party artwork).
 * Each hand is drawn in a 200 x 260 box, palm facing the viewer, the signer's right hand (thumb on the right).
 * The handshapes follow the American manual alphabet as shown on the public-domain Gallaudet chart
 * (Wikimedia Commons "Asl alphabet gallaudet"); this is an illustration for learning, not a substitute for a teacher.
 */

export type Pt = readonly [number, number];
export type Layer =
  | { kind: 'palm' }
  | { kind: 'limb'; pts: readonly Pt[]; w?: number }
  | { kind: 'ring'; cx: number; cy: number; rx: number; ry: number; w: number }
  | { kind: 'arc'; d: string; w: number };
/** `rotate` turns the whole hand (degrees); `scale` shrinks a turned hand so its fingers stay inside the box. */
export type Art = { rotate?: number; scale?: number; layers: readonly Layer[] };

const FINGER_W = 20;
const BASE_Y = 132;
const X = { pinky: 68, ring: 88, middle: 108, index: 128 } as const;
const LEN = { pinky: 56, ring: 72, middle: 80, index: 74 } as const;
type Finger = keyof typeof X;

const limb = (pts: readonly Pt[], w = FINGER_W): Layer => ({ kind: 'limb', pts, w });
const up = (f: Finger): Layer => limb([[X[f], BASE_Y], [X[f], BASE_Y - LEN[f]]]);
/** A straight finger leaning `deg` degrees (positive = to the right) from its base. */
const lean = (f: Finger, deg: number): Layer => {
  const a = (deg * Math.PI) / 180;
  return limb([[X[f], BASE_Y], [X[f] + Math.sin(a) * LEN[f], BASE_Y - Math.cos(a) * LEN[f]]]);
};
/** Folded into the palm: only a rounded knuckle shows. */
const curl = (f: Finger, drop = 26): Layer => limb([[X[f], 122], [X[f], 122 + drop]]);
const hook = (f: Finger): Layer => limb([[X[f], BASE_Y], [X[f], BASE_Y - 34], [X[f] + 16, BASE_Y - 50]]);

const fist = (): Layer[] => (['pinky', 'ring', 'middle', 'index'] as const).map((f) => curl(f));
const thumbSide = (): Layer => limb([[148, 190], [156, 150], [152, 104]], 22);
const thumbAcross = (y = 172): Layer => limb([[150, y + 10], [118, y], [84, y]], 21);
const thumbOut = (): Layer => limb([[142, 190], [170, 176], [190, 172]], 22);

/** The sleeve under every hand. */
export const CUFF = { pts: [[100, 214], [100, 250]] as readonly Pt[], w: 56 };

export const HAND_ART: Record<string, Art> = {
  A: { layers: [{ kind: 'palm' }, ...fist(), thumbSide()] },
  B: { layers: [{ kind: 'palm' }, up('pinky'), up('ring'), up('middle'), up('index'), thumbAcross()] },
  C: { layers: [{ kind: 'arc', d: 'M158 82 C70 54 34 130 62 178 C80 206 120 208 158 192', w: 46 }] },
  D: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring', 30), curl('middle', 34), up('index'), limb([[146, 196], [128, 166], [112, 150]], 21)] },
  E: { layers: [{ kind: 'palm' }, ...fist().map((l, i) => (l.kind === 'limb' ? limb([[68 + i * 20, 124], [68 + i * 20, 146]]) : l)), limb([[142, 190], [110, 160], [72, 158]], 20)] },
  F: { layers: [{ kind: 'palm' }, curl('pinky'), up('ring'), up('middle'), { kind: 'ring', cx: 130, cy: 104, rx: 15, ry: 17, w: 14 }, limb([[148, 192], [138, 150], [132, 120]], 20)] },
  G: { scale: 0.78, rotate: -90, layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), curl('middle'), up('index'), limb([[148, 186], [152, 140], [150, 96]], 21)] },
  H: { scale: 0.78, rotate: -90, layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), up('middle'), up('index'), limb([[132, 200], [118, 176], [104, 170]], 19)] },
  I: { layers: [{ kind: 'palm' }, curl('ring'), curl('middle'), curl('index'), up('pinky'), thumbAcross(168)] },
  K: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), lean('middle', -14), lean('index', 16), limb([[130, 196], [112, 160], [106, 128]], 20)] },
  L: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), curl('middle'), up('index'), thumbOut()] },
  M: { layers: [{ kind: 'palm' }, curl('pinky', 24), limb([[88, 120], [88, 166]]), limb([[108, 120], [108, 168]]), limb([[128, 120], [128, 166]]), limb([[78, 176], [82, 160]], 16)] },
  N: { layers: [{ kind: 'palm' }, curl('pinky', 24), curl('ring', 24), limb([[108, 120], [108, 166]]), limb([[128, 120], [128, 164]]), limb([[96, 176], [100, 160]], 16)] },
  O: { layers: [{ kind: 'ring', cx: 100, cy: 128, rx: 50, ry: 46, w: 36 }] },
  P: { scale: 0.78, rotate: -100, layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), lean('middle', -12), lean('index', 14), limb([[130, 196], [112, 160], [106, 128]], 20)] },
  Q: { scale: 0.85, rotate: 180, layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), curl('middle'), up('index'), limb([[148, 186], [152, 140], [150, 96]], 21)] },
  R: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), limb([[108, 132], [122, 56]]), limb([[128, 132], [114, 60]]), thumbAcross(176)] },
  S: { layers: [{ kind: 'palm' }, ...fist(), limb([[142, 178], [108, 150], [74, 150]], 22)] },
  T: { layers: [{ kind: 'palm' }, ...fist(), limb([[142, 190], [124, 158], [116, 126]], 19)] },
  U: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), up('middle'), up('index'), thumbAcross(176)] },
  V: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), lean('middle', -12), lean('index', 12), thumbAcross(176)] },
  W: { layers: [{ kind: 'palm' }, curl('pinky'), lean('ring', -14), up('middle'), lean('index', 14), limb([[148, 192], [108, 180], [74, 160]], 20)] },
  X: { layers: [{ kind: 'palm' }, curl('pinky'), curl('ring'), curl('middle'), hook('index'), thumbAcross(176)] },
  Y: { layers: [{ kind: 'palm' }, curl('ring'), curl('middle'), curl('index'), limb([[68, 132], [58, 92], [50, 62]]), thumbOut()] },
};

export const HAND_LETTERS = Object.keys(HAND_ART);
