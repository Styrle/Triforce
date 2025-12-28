/**
 * SVG Muscle Model Assets - Realistic Anatomical Version
 * Detailed anatomical body and muscle group path data
 * Inspired by Symmetric Strength's anatomical model
 *
 * Features:
 * - Realistic body proportions with arms away from body
 * - Detailed muscle shapes with anatomical accuracy
 * - Muscle fiber/striation patterns for texture
 * - Light gray body base with colored muscle overlays
 */

import { MuscleGroup } from '../types/strength';

// SVG viewBox dimensions - wider to accommodate arms away from body
export const SVG_VIEWBOX = {
  width: 280,
  height: 500,
};

// Realistic body silhouette with arms away from body - FRONT VIEW
export const FRONT_BODY_PATH = `
  M 140 18
  C 158 18, 172 32, 172 52
  C 172 72, 158 86, 140 86
  C 122 86, 108 72, 108 52
  C 108 32, 122 18, 140 18
  Z

  M 140 86 L 140 98

  M 122 100 L 108 100 C 95 102, 78 108, 62 120 C 46 132, 32 150, 22 175 L 12 210 L 8 250 L 12 290 L 18 320
  M 158 100 L 172 100 C 185 102, 202 108, 218 120 C 234 132, 248 150, 258 175 L 268 210 L 272 250 L 268 290 L 262 320

  M 108 100 C 102 105, 98 115, 98 130
  L 95 200 C 92 240, 88 280, 86 320 L 84 360 C 82 400, 84 440, 90 475 L 95 490
  M 172 100 C 178 105, 182 115, 182 130
  L 185 200 C 188 240, 192 280, 194 320 L 196 360 C 198 400, 196 440, 190 475 L 185 490

  M 125 200 C 122 250, 118 300, 115 350 L 108 420 L 105 460 L 108 490
  M 155 200 C 158 250, 162 300, 165 350 L 172 420 L 175 460 L 172 490
`;

// Realistic body silhouette - BACK VIEW
export const BACK_BODY_PATH = FRONT_BODY_PATH;

// Filled body shapes for solid background
export const BODY_FILL_PATHS = {
  front: `
    M 140 18
    C 158 18, 172 32, 172 52
    C 172 72, 158 86, 140 86
    C 122 86, 108 72, 108 52
    C 108 32, 122 18, 140 18
    Z

    M 108 98
    L 95 100 C 78 104, 58 115, 42 135 C 28 155, 18 180, 14 210 L 10 250 L 14 295 L 22 330 L 32 330 L 26 295 L 22 255 L 26 215 C 32 185, 45 160, 62 142 C 75 128, 88 120, 98 115
    L 96 200 C 93 245, 88 290, 85 335 L 82 385 L 80 435 L 85 480 L 92 492 L 108 492 L 115 480 L 118 435 L 122 385 L 128 335 L 132 285 L 135 235 L 137 185 L 140 135
    L 143 185 L 145 235 L 148 285 L 152 335 L 158 385 L 162 435 L 165 480 L 172 492 L 188 492 L 195 480 L 200 435 L 198 385 L 195 335 C 192 290, 187 245, 184 200
    L 182 115 C 192 120, 205 128, 218 142 C 235 160, 248 185, 254 215 L 258 255 L 254 295 L 248 330 L 258 330 L 266 295 L 270 250 L 266 210 C 262 180, 252 155, 238 135 C 222 115, 202 104, 185 100
    L 172 98 L 172 92 C 172 77, 158 86, 140 86 C 122 86, 108 77, 108 92 L 108 98
    Z
  `,
  back: `
    M 140 18
    C 158 18, 172 32, 172 52
    C 172 72, 158 86, 140 86
    C 122 86, 108 72, 108 52
    C 108 32, 122 18, 140 18
    Z

    M 108 98
    L 95 100 C 78 104, 58 115, 42 135 C 28 155, 18 180, 14 210 L 10 250 L 14 295 L 22 330 L 32 330 L 26 295 L 22 255 L 26 215 C 32 185, 45 160, 62 142 C 75 128, 88 120, 98 115
    L 96 200 C 93 245, 88 290, 85 335 L 82 385 L 80 435 L 85 480 L 92 492 L 108 492 L 115 480 L 118 435 L 122 385 L 128 335 L 132 285 L 135 235 L 137 185 L 140 135
    L 143 185 L 145 235 L 148 285 L 152 335 L 158 385 L 162 435 L 165 480 L 172 492 L 188 492 L 195 480 L 200 435 L 198 385 L 195 335 C 192 290, 187 245, 184 200
    L 182 115 C 192 120, 205 128, 218 142 C 235 160, 248 185, 254 215 L 258 255 L 254 295 L 248 330 L 258 330 L 266 295 L 270 250 L 266 210 C 262 180, 252 155, 238 135 C 222 115, 202 104, 185 100
    L 172 98 L 172 92 C 172 77, 158 86, 140 86 C 122 86, 108 77, 108 92 L 108 98
    Z
  `,
};

// Legacy export for backwards compatibility
export const BODY_OUTLINES = { front: FRONT_BODY_PATH, back: BACK_BODY_PATH };
export const BODY_SILHOUETTES = BODY_OUTLINES;

// Muscle group path definitions with detailed anatomical shapes
export interface MusclePathData {
  view: 'front' | 'back';
  path: string;
  fiberPaths?: string[];
  labelPosition: { x: number; y: number };
}

export const MUSCLE_PATHS: Record<MuscleGroup, MusclePathData> = {
  // === FRONT VIEW MUSCLES ===

  // Pectoralis Major - Fan-shaped chest muscles
  CHEST: {
    view: 'front',
    path: `
      M 112 108
      C 108 112, 105 120, 105 132
      C 105 148, 112 162, 125 168
      C 132 172, 138 170, 140 165
      L 140 130 L 140 115
      C 135 110, 125 106, 112 108
      Z
      M 168 108
      C 172 112, 175 120, 175 132
      C 175 148, 168 162, 155 168
      C 148 172, 142 170, 140 165
      L 140 130 L 140 115
      C 145 110, 155 106, 168 108
      Z
    `,
    fiberPaths: [
      'M 110 118 Q 122 130 138 155',
      'M 108 128 Q 120 142 136 162',
      'M 106 140 Q 118 152 135 168',
      'M 170 118 Q 158 130 142 155',
      'M 172 128 Q 160 142 144 162',
      'M 174 140 Q 162 152 145 168',
    ],
    labelPosition: { x: 140, y: 140 },
  },

  // Anterior Deltoids - Front shoulder cap
  ANTERIOR_DELTS: {
    view: 'front',
    path: `
      M 98 105
      C 88 110, 78 125, 72 145
      C 68 160, 72 175, 82 178
      C 92 180, 100 170, 102 155
      C 104 140, 102 120, 98 105
      Z
      M 182 105
      C 192 110, 202 125, 208 145
      C 212 160, 208 175, 198 178
      C 188 180, 180 170, 178 155
      C 176 140, 178 120, 182 105
      Z
    `,
    fiberPaths: [
      'M 90 115 Q 82 135 78 158',
      'M 95 125 Q 85 145 82 168',
      'M 190 115 Q 198 135 202 158',
      'M 185 125 Q 195 145 198 168',
    ],
    labelPosition: { x: 85, y: 145 },
  },

  // Lateral Deltoids - Side shoulder cap
  LATERAL_DELTS: {
    view: 'front',
    path: `
      M 72 142
      C 62 152, 52 170, 48 192
      C 45 212, 52 228, 65 225
      C 75 222, 80 205, 78 185
      C 76 165, 72 150, 72 142
      Z
      M 208 142
      C 218 152, 228 170, 232 192
      C 235 212, 228 228, 215 225
      C 205 222, 200 205, 202 185
      C 204 165, 208 150, 208 142
      Z
    `,
    fiberPaths: [
      'M 62 162 Q 58 182 58 205',
      'M 68 155 Q 62 178 62 200',
      'M 218 162 Q 222 182 222 205',
      'M 212 155 Q 218 178 218 200',
    ],
    labelPosition: { x: 60, y: 188 },
  },

  // Biceps Brachii - Upper arm flexors
  BICEPS: {
    view: 'front',
    path: `
      M 65 180
      C 55 200, 48 230, 45 265
      C 42 295, 48 318, 62 320
      C 74 322, 82 305, 82 275
      C 82 245, 78 210, 72 188
      C 70 182, 68 180, 65 180
      Z
      M 215 180
      C 225 200, 232 230, 235 265
      C 238 295, 232 318, 218 320
      C 206 322, 198 305, 198 275
      C 198 245, 202 210, 208 188
      C 210 182, 212 180, 215 180
      Z
    `,
    fiberPaths: [
      'M 58 200 L 58 295',
      'M 65 195 L 65 305',
      'M 72 200 L 72 295',
      'M 222 200 L 222 295',
      'M 215 195 L 215 305',
      'M 208 200 L 208 295',
    ],
    labelPosition: { x: 62, y: 255 },
  },

  // Triceps - Front view (inner head visible)
  TRICEPS: {
    view: 'front',
    path: `
      M 78 185
      C 85 205, 88 235, 88 270
      C 88 300, 82 320, 74 318
      C 66 316, 62 295, 62 265
      C 62 235, 68 205, 75 185
      L 78 185
      Z
      M 202 185
      C 195 205, 192 235, 192 270
      C 192 300, 198 320, 206 318
      C 214 316, 218 295, 218 265
      C 218 235, 212 205, 205 185
      L 202 185
      Z
    `,
    fiberPaths: [
      'M 80 205 L 76 300',
      'M 75 210 L 70 295',
      'M 200 205 L 204 300',
      'M 205 210 L 210 295',
    ],
    labelPosition: { x: 75, y: 255 },
  },

  // Forearms - Brachioradialis and flexors
  FOREARMS: {
    view: 'front',
    path: `
      M 58 322
      C 48 350, 38 385, 32 420
      C 28 450, 35 475, 50 472
      C 62 470, 68 445, 68 415
      C 68 385, 65 350, 62 325
      L 58 322
      Z
      M 222 322
      C 232 350, 242 385, 248 420
      C 252 450, 245 475, 230 472
      C 218 470, 212 445, 212 415
      C 212 385, 215 350, 218 325
      L 222 322
      Z
    `,
    fiberPaths: [
      'M 50 340 L 42 440',
      'M 58 338 L 52 445',
      'M 230 340 L 238 440',
      'M 222 338 L 228 445',
    ],
    labelPosition: { x: 50, y: 395 },
  },

  // Rectus Abdominis - 6-pack abs
  ABDOMINALS: {
    view: 'front',
    path: `
      M 128 168 L 128 190 L 152 190 L 152 168 L 140 165 Z
      M 127 195 L 126 222 L 140 225 L 154 222 L 153 195 L 140 193 Z
      M 126 228 L 125 258 L 140 262 L 155 258 L 154 228 L 140 226 Z
      M 125 264 L 124 298 L 140 305 L 156 298 L 155 264 L 140 262 Z
    `,
    fiberPaths: [
      'M 140 165 L 140 305',
      'M 128 190 L 152 190',
      'M 127 222 L 153 222',
      'M 126 258 L 154 258',
      'M 125 298 L 155 298',
    ],
    labelPosition: { x: 140, y: 235 },
  },

  // External Obliques - Side abs
  OBLIQUES: {
    view: 'front',
    path: `
      M 105 168
      C 100 190, 98 220, 100 255
      C 102 285, 110 308, 122 305
      C 128 303, 128 280, 126 250
      C 124 220, 122 190, 118 170
      L 105 168
      Z
      M 175 168
      C 180 190, 182 220, 180 255
      C 178 285, 170 308, 158 305
      C 152 303, 152 280, 154 250
      C 156 220, 158 190, 162 170
      L 175 168
      Z
    `,
    fiberPaths: [
      'M 102 185 L 120 215',
      'M 100 220 L 118 250',
      'M 100 255 L 118 285',
      'M 178 185 L 160 215',
      'M 180 220 L 162 250',
      'M 180 255 L 162 285',
    ],
    labelPosition: { x: 112, y: 240 },
  },

  // Hip Flexors
  HIP_FLEXORS: {
    view: 'front',
    path: `
      M 118 302
      C 112 325, 108 352, 115 378
      C 120 395, 132 398, 138 385
      C 144 372, 140 345, 132 322
      C 128 310, 122 305, 118 302
      Z
      M 162 302
      C 168 325, 172 352, 165 378
      C 160 395, 148 398, 142 385
      C 136 372, 140 345, 148 322
      C 152 310, 158 305, 162 302
      Z
    `,
    fiberPaths: [
      'M 115 320 L 128 365',
      'M 120 335 L 132 378',
      'M 165 320 L 152 365',
      'M 160 335 L 148 378',
    ],
    labelPosition: { x: 128, y: 345 },
  },

  // Quadriceps - 4 heads with separation
  QUADS: {
    view: 'front',
    path: `
      M 98 320
      C 88 355, 82 405, 85 455
      C 88 495, 102 525, 120 518
      C 135 512, 140 475, 138 430
      C 136 385, 125 345, 112 325
      C 106 318, 100 318, 98 320
      Z
      M 182 320
      C 192 355, 198 405, 195 455
      C 192 495, 178 525, 160 518
      C 145 512, 140 475, 142 430
      C 144 385, 155 345, 168 325
      C 174 318, 180 318, 182 320
      Z
    `,
    fiberPaths: [
      'M 92 355 L 118 385',
      'M 88 405 L 115 435',
      'M 88 455 L 115 485',
      'M 108 335 L 108 510',
      'M 188 355 L 162 385',
      'M 192 405 L 165 435',
      'M 192 455 L 165 485',
      'M 172 335 L 172 510',
    ],
    labelPosition: { x: 105, y: 420 },
  },

  // Adductors - Inner thigh
  ADDUCTORS: {
    view: 'front',
    path: `
      M 125 350
      C 132 385, 138 430, 138 475
      C 138 510, 130 530, 120 525
      C 110 520, 112 490, 115 455
      C 118 420, 120 380, 125 350
      Z
      M 155 350
      C 148 385, 142 430, 142 475
      C 142 510, 150 530, 160 525
      C 170 520, 168 490, 165 455
      C 162 420, 160 380, 155 350
      Z
    `,
    fiberPaths: [
      'M 128 375 L 122 500',
      'M 132 385 L 125 510',
      'M 152 375 L 158 500',
      'M 148 385 L 155 510',
    ],
    labelPosition: { x: 132, y: 440 },
  },

  // Tibialis Anterior - Front shin
  TIBIALIS: {
    view: 'front',
    path: `
      M 95 525
      C 90 555, 88 590, 92 625
      C 96 655, 108 670, 118 662
      C 125 655, 124 625, 120 592
      C 116 560, 110 535, 102 525
      L 95 525
      Z
      M 185 525
      C 190 555, 192 590, 188 625
      C 184 655, 172 670, 162 662
      C 155 655, 156 625, 160 592
      C 164 560, 170 535, 178 525
      L 185 525
      Z
    `,
    fiberPaths: [
      'M 94 545 L 105 635',
      'M 100 540 L 112 640',
      'M 186 545 L 175 635',
      'M 180 540 L 168 640',
    ],
    labelPosition: { x: 105, y: 590 },
  },

  // === BACK VIEW MUSCLES ===

  // Trapezius - Diamond-shaped upper back
  TRAPS: {
    view: 'back',
    path: `
      M 140 88
      C 125 92, 108 100, 95 115
      C 85 128, 82 145, 92 158
      C 102 168, 120 172, 138 168
      L 140 165
      L 142 168
      C 160 172, 178 168, 188 158
      C 198 145, 195 128, 185 115
      C 172 100, 155 92, 140 88
      Z
    `,
    fiberPaths: [
      'M 140 92 L 140 165',
      'M 115 105 L 135 140',
      'M 165 105 L 145 140',
      'M 100 120 L 125 155',
      'M 180 120 L 155 155',
    ],
    labelPosition: { x: 140, y: 130 },
  },

  // Rear Deltoids - Back shoulder cap
  REAR_DELTS: {
    view: 'back',
    path: `
      M 92 115
      C 78 125, 65 145, 60 170
      C 56 192, 68 210, 85 205
      C 100 200, 108 180, 105 158
      C 102 138, 98 122, 92 115
      Z
      M 188 115
      C 202 125, 215 145, 220 170
      C 224 192, 212 210, 195 205
      C 180 200, 172 180, 175 158
      C 178 138, 182 122, 188 115
      Z
    `,
    fiberPaths: [
      'M 78 140 L 92 178',
      'M 72 160 L 88 195',
      'M 202 140 L 188 178',
      'M 208 160 L 192 195',
    ],
    labelPosition: { x: 78, y: 165 },
  },

  // Rhomboids - Between spine and scapula
  RHOMBOIDS: {
    view: 'back',
    path: `
      M 115 130
      C 110 145, 108 165, 115 185
      C 122 202, 135 208, 140 195
      C 145 182, 142 160, 135 142
      C 130 132, 122 128, 115 130
      Z
      M 165 130
      C 170 145, 172 165, 165 185
      C 158 202, 145 208, 140 195
      C 135 182, 138 160, 145 142
      C 150 132, 158 128, 165 130
      Z
    `,
    fiberPaths: [
      'M 112 148 L 132 175',
      'M 110 165 L 130 192',
      'M 168 148 L 148 175',
      'M 170 165 L 150 192',
    ],
    labelPosition: { x: 125, y: 168 },
  },

  // Latissimus Dorsi - Large back muscles (V-taper)
  LATS: {
    view: 'back',
    path: `
      M 95 160
      C 82 185, 78 225, 90 275
      C 100 315, 122 340, 138 328
      C 150 318, 148 285, 140 245
      C 132 205, 115 175, 102 162
      L 95 160
      Z
      M 185 160
      C 198 185, 202 225, 190 275
      C 180 315, 158 340, 142 328
      C 130 318, 132 285, 140 245
      C 148 205, 165 175, 178 162
      L 185 160
      Z
    `,
    fiberPaths: [
      'M 85 195 L 125 235',
      'M 82 235 L 122 275',
      'M 85 275 L 125 310',
      'M 92 305 L 130 330',
      'M 195 195 L 155 235',
      'M 198 235 L 158 275',
      'M 195 275 L 155 310',
      'M 188 305 L 150 330',
    ],
    labelPosition: { x: 108, y: 255 },
  },

  // Erector Spinae - Lower back muscles along spine
  SPINAL_ERECTORS: {
    view: 'back',
    path: `
      M 130 200
      C 135 198, 145 198, 150 200
      L 154 285
      C 155 315, 150 340, 140 350
      C 130 340, 125 315, 126 285
      L 130 200
      Z
    `,
    fiberPaths: [
      'M 132 220 L 148 220',
      'M 130 250 L 150 250',
      'M 128 280 L 152 280',
      'M 128 310 L 152 310',
      'M 140 200 L 140 350',
    ],
    labelPosition: { x: 140, y: 280 },
  },

  // Gluteus Maximus - Buttocks
  GLUTES: {
    view: 'back',
    path: `
      M 105 335
      C 90 358, 85 395, 95 435
      C 105 468, 128 482, 142 468
      C 150 458, 150 430, 140 395
      C 130 362, 118 345, 105 335
      Z
      M 175 335
      C 190 358, 195 395, 185 435
      C 175 468, 152 482, 138 468
      C 130 458, 130 430, 140 395
      C 150 362, 162 345, 175 335
      Z
    `,
    fiberPaths: [
      'M 95 365 L 128 405',
      'M 90 400 L 125 440',
      'M 98 435 L 130 465',
      'M 185 365 L 152 405',
      'M 190 400 L 155 440',
      'M 182 435 L 150 465',
    ],
    labelPosition: { x: 115, y: 405 },
  },

  // Hamstrings - Back of thigh
  HAMSTRINGS: {
    view: 'back',
    path: `
      M 100 445
      C 88 485, 82 540, 90 595
      C 98 640, 118 665, 138 652
      C 152 642, 155 600, 148 548
      C 140 498, 125 462, 112 450
      L 100 445
      Z
      M 180 445
      C 192 485, 198 540, 190 595
      C 182 640, 162 665, 142 652
      C 128 642, 125 600, 132 548
      C 140 498, 155 462, 168 450
      L 180 445
      Z
    `,
    fiberPaths: [
      'M 92 475 L 130 525',
      'M 88 535 L 128 585',
      'M 95 595 L 132 635',
      'M 118 460 L 118 645',
      'M 188 475 L 150 525',
      'M 192 535 L 152 585',
      'M 185 595 L 148 635',
      'M 162 460 L 162 645',
    ],
    labelPosition: { x: 112, y: 545 },
  },

  // Gastrocnemius - Calf muscles
  CALVES: {
    view: 'back',
    path: `
      M 95 655
      C 82 690, 78 735, 92 775
      C 105 810, 128 822, 145 805
      C 158 790, 155 745, 142 700
      C 132 665, 115 655, 100 655
      L 95 655
      Z
      M 185 655
      C 198 690, 202 735, 188 775
      C 175 810, 152 822, 135 805
      C 122 790, 125 745, 138 700
      C 148 665, 165 655, 180 655
      L 185 655
      Z
    `,
    fiberPaths: [
      'M 85 695 L 125 745',
      'M 88 745 L 122 790',
      'M 118 665 L 118 800',
      'M 195 695 L 155 745',
      'M 192 745 L 158 790',
      'M 162 665 L 162 800',
    ],
    labelPosition: { x: 112, y: 730 },
  },
};

// Helper function to get muscles for a specific view
export function getMusclesForView(view: 'front' | 'back'): MuscleGroup[] {
  return (Object.entries(MUSCLE_PATHS) as [MuscleGroup, MusclePathData][])
    .filter(([_, data]) => data.view === view)
    .map(([muscleGroup]) => muscleGroup);
}

// Get front view muscles
export const FRONT_VIEW_MUSCLES = getMusclesForView('front');

// Get back view muscles
export const BACK_VIEW_MUSCLES = getMusclesForView('back');

// Colors for base body and muscles - lighter skin tone like SS
export const BODY_COLORS = {
  baseFill: '#9CA3AF',       // Light gray for base body (like SS)
  baseStroke: '#6B7280',     // Medium gray for outline
  skinHighlight: '#D1D5DB',  // Lighter highlight
  skinShadow: '#6B7280',     // Darker shadow
  muscleStroke: 'rgba(255,255,255,0.5)',  // White for muscle outlines
  fiberStroke: 'rgba(0,0,0,0.12)',        // Subtle fiber lines
  unscoredFill: '#6B7280',   // Gray for unscored muscles
};
