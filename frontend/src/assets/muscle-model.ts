/**
 * SVG Muscle Model Assets - Realistic Anatomical Version v4
 *
 * Uses realistic anatomical images as backgrounds with precise SVG overlay paths.
 * IMPORTANT: Front and back views have DIFFERENT viewBoxes to match image aspect ratios.
 *
 * Front image: 4431x7350 pixels → viewBox: 443x735 (scaled by 0.1)
 * Back image: 3466x6000 pixels → viewBox: 347x600 (scaled by 0.1)
 */

import { MuscleGroup } from '../types/strength';

// SVG viewBox dimensions - DIFFERENT for each view to match image aspect ratios
export const SVG_VIEWBOX = {
  front: { width: 443, height: 735 },
  back: { width: 347, height: 600 },
};

// Legacy export for backwards compatibility (uses front dimensions)
export const SVG_VIEWBOX_LEGACY = {
  width: 443,
  height: 735,
};

// Image configuration
export const ANATOMICAL_IMAGES = {
  front: '/src/assets/muscle-model-front.jpg',
  back: '/src/assets/muscle-model-back.jpg',
};

// =============================================================================
// MUSCLE PATH DEFINITIONS
// Coordinates traced from actual anatomical images
// =============================================================================

export interface MusclePathData {
  view: 'front' | 'back';
  path: string;
  fiberPaths?: string[];
  labelPosition: { x: number; y: number };
}

export const MUSCLE_PATHS: Record<MuscleGroup, MusclePathData> = {
  // ==========================================================================
  // FRONT VIEW MUSCLES (viewBox: 0 0 443 735)
  // Center X = 221.5
  // ==========================================================================

  // Pectoralis Major - Chest muscles
  CHEST: {
    view: 'front',
    path: `
      M 164.7 147.9
      C 165.6 148.6, 162.7 161.8, 165.3 160.9
      C 162.4 172.8, 165 176.1, 171.5 187.7
      C 177.6 195.5, 186 198.7, 213.6 186.4
      L 218.1 164.1
      C 204.8 146.6, 214.8 133.7, 208.3 131.5
      L 176.3 139.9
      Z
      M 263.4 139.5
      C 269.5 147, 276.9 141.2, 275.7 152.5
      C 278.9 167.3, 271.4 179, 267.2 185.1
      C 264.3 187.4, 253 201, 224.3 185.8
      L 222.3 166.4
      C 222.6 150.2, 227.7 134.7, 229.6 134.7
      L 249.5 134.7
      Z
    `,
    fiberPaths: [
      'M 164.1 141.8 Q 184.1 166.8, 209.1 186.8',
      'M 277.1 141.8 Q 257.1 166.8, 232.1 186.8',
    ],
    labelPosition: { x: 220, y: 166 },
  },

  // Anterior Deltoids - Front shoulder
  ANTERIOR_DELTS: {
    view: 'front',
    path: `
      M 141.2 140.7
      C 138.8 145.6, 134.5 150.9, 135.5 156.6
      C 131.8 159.8, 135.1 160.8, 143.4 157.9
      C 150.4 164.5, 153.1 145.2, 190.6 135
      C 183.8 131.3, 161.3 127, 158.7 130
      L 149.7 133.7
      Z
      M 295.5 139
      C 297.5 135, 308.4 163.8, 303.5 157.9
      C 296.5 153.5, 294.5 161.8, 283.2 152.2
      C 266.3 139.3, 245.5 136, 244.8 134.3
      C 243.5 130.7, 264.4 133.3, 269 129
      L 286.2 132.3
      Z
    `,
    fiberPaths: [
      'M 132.3 126.6 L 115.3 168.6',
      'M 305.3 126.6 L 322.3 168.6',
    ],
    labelPosition: { x: 221, y: 146 },
  },

  // Lateral Deltoids - Side shoulder
  LATERAL_DELTS: {
    view: 'front',
    path: `
      M 135.8 160.5
      C 133.5 160.8, 131.5 169.8, 132.2 169.1
      C 131.5 172.1, 134.5 176.4, 134.5 175.4
      C 133.1 177.4, 137.8 178.1, 133.4 175.4
      C 145.1 171.8, 148.4 160.8, 150 161.2
      L 145.1 158.8
      Z
      M 303 156.6
      C 307.4 155.7, 311.3 172.4, 308.8 176.8
      C 310.2 174, 309.6 177.1, 302.2 171.5
      C 301.6 170.1, 289.7 162.9, 289.4 162.4
      C 292.5 156.3, 287.5 156.3, 295 155.5
      L 295.5 156
      Z
    `,
    fiberPaths: [
      'M 97.5 178.2 L 87.5 233.2',
      'M 350.5 178.2 L 360.5 233.2',
    ],
    labelPosition: { x: 221, y: 167 },
  },

  // Biceps - Front of upper arm
  BICEPS: {
    view: 'front',
    path: `
      M 134.1 176.6
      C 125.4 199, 118.4 213, 121 228.7
      C 127.1 226.7, 127.7 231.9, 134.4 229.9
      C 135.9 236.6, 146.4 234, 158.3 211
      C 170.3 166.1, 155.4 167.8, 159.8 159.1
      L 143.4 167.2
      Z
      M 301.8 166.9
      C 315.5 197.1, 327.4 210.7, 327.1 215.9
      C 330 217.7, 319.4 227.1, 302 232.2
      C 306.4 236.9, 288.9 212.4, 289.2 211.3
      C 272 191.4, 276.6 173.1, 275.8 171.3
      L 277.8 158.8
      Z
    `,
    fiberPaths: [
      'M 114 187.6 L 104 262.6',
      'M 381 187.6 L 391 262.6',
    ],
    labelPosition: { x: 224, y: 198 },
  },

  // Triceps - Back of upper arm
  TRICEPS: {
    view: 'back',
    path: `
      M 112.7 126.2
      C 111.6 126.8, 98 135.9, 95.5 175.1
      C 91.9 181.7, 108.4 188.8, 106.5 189.2
      C 107.5 189, 119.9 169.4, 119.7 168.5
      C 126 164.1, 131 135.9, 130.3 135
      L 122.3 120.5
      Z
      M 254.1 133.4
      C 253 133.4, 261.8 174.9, 262 174.9
      C 262.3 174.7, 257 187.9, 256.1 187.7
      C 257.4 187.5, 246.6 191.4, 247 191.6
      C 247.3 193, 230.7 154.4, 228.3 153.7
      L 237.6 122.9
      Z
    `,
    fiberPaths: [
      'M 88.8 157 L 78.8 237',
      'M 291.8 157 L 301.8 237',
    ],
    labelPosition: { x: 177, y: 156 },
  },

  // Forearms - Lower arm
  FOREARMS: {
    view: 'front',
    path: `
      M 118.6 216.5
      C 119.9 217.8, 67.3 284.6, 72.7 289.6
      C 73.1 292.9, 87.3 298.4, 85.7 297.5
      C 86.5 298.8, 114.9 276.2, 122.8 264.5
      C 124.1 262.9, 149.9 232, 141.6 235.3
      L 122.4 231.2
      Z
      M 328.2 219
      C 338.2 224.1, 394.8 302.2, 378.7 281.7
      C 373.7 287.9, 364.1 291.7, 363.7 291.7
      C 362.4 292.5, 331.1 268.3, 330.3 264.1
      C 319 259.1, 307.3 242.8, 301.9 232
      L 318.2 224.9
      Z
    `,
    fiberPaths: [
      'M 49.8 267.2 L 46.8 347.2',
      'M 376.8 267.2 L 379.8 347.2',
    ],
    labelPosition: { x: 231, y: 257 },
  },

  // Abdominals - 6-pack
  ABDOMINALS: {
    view: 'front',
    path: `
      M 195.5 190
      L 190.3 218.4
      L 249.1 220.4
      L 244.3 190
      Z
      M 190.9 219.7
      L 191.3 235.7
      L 248.5 235.7
      L 247.8 220
      Z
      M 191.6 238.5
      L 193.5 258.8
      L 245.5 259.8
      L 248.8 237.5
      Z
      M 193.8 260.8
      L 214.2 337.7
      L 227.1 335.1
      L 246.2 261.7
      Z
    `,
    fiberPaths: [
      'M 219.4 191.7 L 219.4 293.4',
    ],
    labelPosition: { x: 220, y: 264 },
  },

  // Obliques - Side of torso
  OBLIQUES: {
    view: 'front',
    path: `
      M 167.7 191.9
      C 174.9 253.7, 174.5 242.8, 170.9 285.7
      C 170.2 286, 180.4 294.2, 184.4 296.3
      C 191.5 311, 194.9 303.1, 190.7 289.9
      C 188.8 245.8, 184.2 210.4, 189.6 195.8
      L 178.6 193.2
      Z
      M 273.7 189.6
      C 258.6 245.4, 268.4 280.5, 268 266.2
      C 264.3 263.9, 270.3 285.4, 258.2 292.9
      C 250.3 297.5, 245.8 302.4, 251.4 251.1
      C 253.7 252.2, 248.4 215.6, 250.7 194.5
      L 262 190.4
      Z
    `,
    fiberPaths: [
      'M 162.2 250.4 L 179.2 360.4',
      'M 289.2 250.4 L 272.2 360.4',
    ],
    labelPosition: { x: 221, y: 251 },
  },

  // Hip Flexors
  HIP_FLEXORS: {
    view: 'front',
    path: `
      M 177.8 294.1
      C 177.7 321.4, 193.3 345.5, 197.4 381.9
      C 199.7 381.7, 196.4 380.2, 208.4 385.6
      C 214.5 389.8, 221.8 369.1, 218.5 385.6
      C 219.2 339.6, 211.2 343.3, 196.3 310.4
      L 178 289.6
      Z
      M 267.4 282.3
      C 256.4 309.7, 252.1 352.7, 241.5 386.7
      C 238.9 388.2, 230.9 387.9, 231.6 387.9
      C 222.2 386.6, 219 382.4, 221.4 358.6
      C 223.3 345.1, 226.9 336.7, 237.5 322.5
      L 249.1 301.3
      Z
    `,
    fiberPaths: [
      'M 174.8 334.1 L 184.8 389.1',
      'M 267.8 334.1 L 257.8 389.1',
    ],
    labelPosition: { x: 223, y: 336 },
  },

  // Quadriceps - Front thigh
  QUADS: {
    view: 'front',
    path: `
      M 163.1 318.8
      C 150.6 356.8, 164.4 385.6, 161 411.5
      C 176.9 434.5, 159.3 445.7, 184.4 436.6
      C 184.4 437.8, 196.1 414.4, 194 378.5
      C 194.4 366.4, 173.5 302.1, 176.9 287.9
      L 171.4 281.7
      Z
      M 279 372.2
      C 278.7 373.1, 271.7 428, 270.4 424.8
      C 273.6 435, 260.1 446.3, 253.7 439.2
      C 245.7 442.7, 248.2 434.5, 243.7 389.8
      C 242.4 376.4, 255.9 282.3, 268.1 286.8
      L 276.5 335.6
      Z
    `,
    fiberPaths: [
      'M 160.1 353.9 L 180.1 463.9',
      'M 293.1 353.9 L 273.1 463.9',
    ],
    labelPosition: { x: 215, y: 364 },
  },

  // Adductors - Inner thigh
  ADDUCTORS: {
    view: 'front',
    path: `
      M 218.5 385.5
      C 216 385.5, 211.5 438.6, 216.2 432
      C 206.8 454.2, 200.2 456.1, 199.9 456.9
      C 195.5 449.2, 193 448.3, 194.4 447.2
      C 189.1 427.6, 191 397.6, 193.5 397.4
      L 197.7 383
      Z
      M 221.7 388.9
      C 225.7 451.1, 227.3 453.9, 227.3 453.6
      C 234.2 454.4, 237.6 457.2, 239.5 455
      C 243.9 458.6, 247 445.8, 246.4 444.7
      C 250 426.7, 244 397.6, 240.1 390.7
      L 230.9 389.8
      Z
    `,
    fiberPaths: [
      'M 194 427.6 L 178 537.6',
      'M 241 427.6 L 257 537.6',
    ],
    labelPosition: { x: 220, y: 421 },
  },

  // Tibialis - Front of shin
  TIBIALIS: {
    view: 'front',
    path: `
      M 180.9 478.3
      C 178.8 482.7, 168.2 509.2, 189 583.6
      C 189.9 584.2, 199.4 582.8, 210.6 584.7
      C 208.1 568.9, 220 522.8, 212 497.8
      C 213.2 506, 212 480.2, 210.9 479.6
      L 189.6 479
      Z
      M 259.7 542
      C 258.6 542, 254.3 570.1, 252.7 575.5
      C 253.2 577.1, 230.6 580.9, 229.5 578.2
      C 225.2 548, 223 522.8, 226.3 490.8
      C 226.3 473, 254.9 476.7, 262.4 477.3
      L 263.5 510.7
      Z
    `,
    fiberPaths: [
      'M 162 492.8 L 180 537.8',
      'M 281 492.8 L 263 537.8',
    ],
    labelPosition: { x: 217, y: 531 },
  },

  // ==========================================================================
  // BACK VIEW MUSCLES (viewBox: 0 0 347 600)
  // Center X = 173.5
  // ==========================================================================

  // Trapezius - Upper back
  TRAPS: {
    view: 'back',
    path: `
      M 174.2 59.2
      C 173.5 59.2, 173.5 79.1, 153.6 88.4
      C 138.2 87.7, 120 92.1, 149.2 104.5
      C 156.8 138.5, 156.7 149.4, 180.7 188.2
      C 200.3 148.4, 209.2 143.6, 212.7 104.5
      C 250.4 93.9, 215.4 91.5, 207.5 88.4
      C 204.1 82.2, 189.7 86.7, 188.6 58.5
      Z
    `,
    fiberPaths: [
      'M 177.8 5.5 L 177.8 128.5',
      'M 134.8 38.5 L 159.8 108.5',
      'M 220.8 38.5 L 195.8 108.5',
    ],
    labelPosition: { x: 182, y: 124 },
  },

  // Rear Deltoids
  REAR_DELTS: {
    view: 'back',
    path: `
      M 114.5 103.4
      C 101.4 116.9, 108.7 130.6, 106.1 128
      C 108.3 128.4, 125.5 111.2, 128.1 108.6
      C 129.5 109.5, 148.9 103.8, 148.9 104.2
      C 150.6 104.6, 134.7 97.6, 134.3 97.1
      L 126.8 93.5
      Z
      M 226 108.2
      C 226 107.3, 230.4 109.5, 241.4 115.7
      C 240.5 116.5, 231.3 108.6, 232.1 109.9
      C 196.4 104.6, 231.3 97.1, 230.4 97.1
      C 229.5 89.2, 245.8 99.8, 245.8 101.1
      L 253.7 127.1
      Z
    `,
    fiberPaths: [
      'M -7.4 72.3 L 15.6 127.3',
      'M 154.6 72.3 L 131.6 127.3',
    ],
    labelPosition: { x: 178, y: 110 },
  },

  // Rhomboids
  RHOMBOIDS: {
    view: 'back',
    path: `
      M 128.6 129.1
      C 129.6 126.7, 132 144.6, 131.3 143.5
      C 122.4 147, 166.7 146.6, 181.1 145.9
      C 184.8 147.6, 231.5 143.9, 231.2 147
      C 233.6 143.9, 226.9 117.6, 242.8 119.9
      C 235.3 97.6, 195.1 110.6, 181.4 108.5
      C 175.9 97.2, 125.5 112, 124.8 110.6
      Z
    `,
    fiberPaths: [
      'M 153.9 122.6 L 173.9 164.6',
      'M 209.9 122.6 L 189.9 164.6',
    ],
    labelPosition: { x: 183, y: 129 },
  },

  // Latissimus Dorsi
  LATS: {
    view: 'back',
    path: `
      M 139.6 217.9
      C 140.5 217, 154.6 229.3, 153.7 227.1
      C 152.8 228, 170.4 235.5, 170 236
      C 165.6 168.5, 165.6 209.5, 177.5 179.1
      C 175.7 184.8, 157.7 145.2, 158.5 145.2
      L 131.2 143.9
      Z
      M 219.3 184.5
      C 219.7 184.9, 216 199.3, 217.4 224.8
      C 216.5 223, 189.6 237.8, 190.5 237.4
      C 189.1 239.2, 188.2 179.8, 187.7 178.4
      C 188.6 178.4, 204.4 146.4, 205.3 145.5
      L 229.9 147.4
      Z
    `,
    fiberPaths: [
      'M 117.6 283.6 L 157.6 398.6',
      'M 233.6 283.6 L 193.6 398.6',
    ],
    labelPosition: { x: 181, y: 191 },
  },

  // Spinal Erectors - Lower Back
  SPINAL_ERECTORS: {
    view: 'back',
    path: `
      M 179.7 187.1
      C 180.8 185.4, 187.3 183.4, 187.3 190.9
      L 191.6 198.2
      C 194.6 228.2, 186.6 251.2, 179.6 258.2
      C 172.6 251.2, 164.6 228.2, 167.6 198.2
      L 172.9 192
      Z
    `,
    fiberPaths: [
      'M 179.6 108.2 L 179.6 253.2',
    ],
    labelPosition: { x: 179, y: 221 },
  },

  // Gluteus Maximus
  GLUTES: {
    view: 'back',
    path: `
      M 144 227.2
      C 136.6 236, 140.7 255.5, 131 272.8
      C 137.5 285.9, 160.2 291.6, 176.4 287
      C 187.7 283.1, 184.5 267.1, 179.6 250
      C 176.4 235.7, 161.4 233.2, 152.1 227.2
      L 144 227.2
      Z
      M 216.9 227.2
      C 221.1 230.4, 227.8 274.6, 229.8 272.8
      C 213 283.3, 200.7 291.6, 184.5 287
      C 173.1 283.1, 176.4 267.1, 181.2 250
      C 184.5 235.7, 197.4 234.5, 208.8 227.2
      L 216.9 227.2
      Z
    `,
    fiberPaths: [
      'M 141.5 247.1 L 165.8 281.3',
      'M 219.3 247.1 L 195 281.3',
    ],
    labelPosition: { x: 181, y: 260 },
  },

  // Hamstrings
  HAMSTRINGS: {
    view: 'back',
    path: `
      M 130 278.5
      C 137 298.3, 132.5 333.3, 144.2 369.2
      C 142.2 371.5, 151.8 364.8, 172.4 381.6
      C 172.4 382.2, 177 333.5, 174.5 328.5
      C 183.7 294.2, 169 278.3, 177.2 287.2
      L 152.9 290.9
      Z
      M 227.5 277.7
      C 226.7 277.7, 228.5 333.3, 213.9 359.7
      C 218.1 395.2, 206.6 357, 186.9 378.9
      C 189.8 388, 185.5 347.9, 184.7 341.3
      C 182 341.8, 180.4 287, 179.4 286.7
      L 210.6 287.3
      Z
    `,
    fiberPaths: [
      'M 143.4 318.3 L 165.8 388.3',
      'M 217.6 318.3 L 195.2 388.3',
    ],
    labelPosition: { x: 179, y: 337 },
  },

  // Calves
  CALVES: {
    view: 'back',
    path: `
      M 143.9 402.6
      C 141.7 404.3, 147.5 442, 147.2 440.9
      C 166.4 430.9, 173.3 442, 174.7 440.4
      C 176.7 443.4, 175.8 399.8, 174.4 399
      C 172.5 373.7, 156.1 377.5, 171.9 379
      L 146.7 374
      Z
      M 216.9 409.3
      C 218.3 409, 213.3 435.4, 212.5 435.1
      C 212.8 434.8, 206.4 447.3, 197.5 429
      C 182.5 458.7, 177.1 427.5, 186.9 384
      C 192.1 382.5, 197.2 373.4, 198.1 374
      L 214.4 374.3
      Z
    `,
    fiberPaths: [
      'M 126.1 412.5 L 161.1 452.5',
      'M 242.1 412.5 L 207.1 452.5',
    ],
    labelPosition: { x: 181, y: 411 },
  },
};

// =============================================================================
// BODY SILHOUETTES
// =============================================================================

export const BODY_FILL_PATHS = {
  front: `
    M 221 22
    C 248 22, 268 45, 268 75
    C 268 105, 248 125, 221 125
    C 194 125, 174 105, 174 75
    C 174 45, 194 22, 221 22
    Z
  `,
  back: `
    M 173 18
    C 195 18, 212 38, 212 62
    C 212 86, 195 105, 173 105
    C 151 105, 134 86, 134 62
    C 134 38, 151 18, 173 18
    Z
  `,
};

export const FRONT_BODY_PATH = BODY_FILL_PATHS.front;
export const BACK_BODY_PATH = BODY_FILL_PATHS.back;
export const BODY_OUTLINES = { front: FRONT_BODY_PATH, back: BACK_BODY_PATH };
export const BODY_SILHOUETTES = BODY_OUTLINES;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getMusclesForView(view: 'front' | 'back'): MuscleGroup[] {
  return (Object.entries(MUSCLE_PATHS) as [MuscleGroup, MusclePathData][])
    .filter(([_, data]) => data.view === view)
    .map(([muscleGroup]) => muscleGroup);
}

export const FRONT_VIEW_MUSCLES = getMusclesForView('front');
export const BACK_VIEW_MUSCLES = getMusclesForView('back');

// Body colors
export const BODY_COLORS = {
  baseFill: '#B8C0CC',
  baseStroke: '#8892A0',
  skinHighlight: '#D1D5DB',
  skinShadow: '#6B7280',
  muscleStroke: 'rgba(255,255,255,0.5)',
  fiberStroke: 'rgba(0,0,0,0.12)',
  unscoredFill: '#8892A0',
};

// =============================================================================
// COLOR UTILITY FUNCTIONS
// =============================================================================

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lightenColor(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  const newL = Math.min(100, hsl.l + percent);
  return hslToHex(hsl.h, hsl.s, newL);
}

export function darkenColor(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  const newL = Math.max(0, hsl.l - percent);
  return hslToHex(hsl.h, hsl.s, newL);
}

export function adjustSaturation(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  const newS = Math.max(0, Math.min(100, hsl.s + percent));
  return hslToHex(hsl.h, newS, hsl.l);
}

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

export function generateMuscleGradientColors(baseColor: string): {
  highlight: string;
  base: string;
  shadow: string;
  highlightAlpha: string;
  shadowAlpha: string;
} {
  return {
    highlight: lightenColor(baseColor, 18),
    base: baseColor,
    shadow: darkenColor(baseColor, 15),
    highlightAlpha: hexToRgba(baseColor, 0.85),
    shadowAlpha: hexToRgba(darkenColor(baseColor, 25), 0.95),
  };
}
