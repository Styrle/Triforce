/**
 * SVG Path Transformation Utilities
 * Used by the dev muscle editor to parse, transform, and serialize SVG paths.
 */

export interface PathCommand {
  type: string;
  coords: number[];
}

export interface PathBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
}

export interface MuscleTransform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  rotate: number;
  labelDx: number;
  labelDy: number;
}

export const DEFAULT_TRANSFORM: MuscleTransform = {
  tx: 0,
  ty: 0,
  sx: 1,
  sy: 1,
  rotate: 0,
  labelDx: 0,
  labelDy: 0,
};

const PARAM_COUNTS: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1,
  C: 6, S: 4, Q: 4, T: 2,
  A: 7, Z: 0,
};

export function parsePath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const normalized = d.replace(/,/g, ' ').trim();

  const tokenRegex = /([a-zA-Z])|(-?\d+\.?\d*(?:e[+-]?\d+)?)/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(normalized)) !== null) {
    tokens.push(m[0]);
  }

  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (/[a-zA-Z]/.test(token)) {
      const type = token;
      i++;

      if (type.toUpperCase() === 'Z') {
        commands.push({ type, coords: [] });
        continue;
      }

      const paramCount = PARAM_COUNTS[type.toUpperCase()] || 0;
      if (paramCount === 0) continue;

      // Read first command's coordinates
      const coords: number[] = [];
      for (let j = 0; j < paramCount && i < tokens.length && !/[a-zA-Z]/.test(tokens[i]); j++) {
        coords.push(parseFloat(tokens[i]));
        i++;
      }
      if (coords.length === paramCount) {
        commands.push({ type, coords });
      }

      // Handle implicit repeated commands (M becomes L after first)
      const implicitType = type === 'M' ? 'L' : type === 'm' ? 'l' : type;
      const implicitCount = PARAM_COUNTS[implicitType.toUpperCase()] || 0;
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const implicitCoords: number[] = [];
        for (let j = 0; j < implicitCount && i < tokens.length && !/[a-zA-Z]/.test(tokens[i]); j++) {
          implicitCoords.push(parseFloat(tokens[i]));
          i++;
        }
        if (implicitCoords.length === implicitCount) {
          commands.push({ type: implicitType, coords: implicitCoords });
        }
      }
    } else {
      i++;
    }
  }

  return commands;
}

export function getPathBounds(d: string): PathBounds {
  const commands = parsePath(d);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const cmd of commands) {
    const upper = cmd.type.toUpperCase();
    if (upper === 'Z') continue;

    if (upper === 'H') {
      for (const x of cmd.coords) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    } else if (upper === 'V') {
      for (const y of cmd.coords) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    } else if (upper === 'A' && cmd.coords.length >= 7) {
      minX = Math.min(minX, cmd.coords[5]); maxX = Math.max(maxX, cmd.coords[5]);
      minY = Math.min(minY, cmd.coords[6]); maxY = Math.max(maxY, cmd.coords[6]);
    } else {
      for (let j = 0; j < cmd.coords.length; j += 2) {
        minX = Math.min(minX, cmd.coords[j]);
        maxX = Math.max(maxX, cmd.coords[j]);
        if (j + 1 < cmd.coords.length) {
          minY = Math.min(minY, cmd.coords[j + 1]);
          maxY = Math.max(maxY, cmd.coords[j + 1]);
        }
      }
    }
  }

  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, cx: 0, cy: 0 };
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function transformPoint(
  x: number,
  y: number,
  transform: MuscleTransform,
  center: { x: number; y: number },
): { x: number; y: number } {
  const { tx, ty, sx, sy, rotate } = transform;
  const rad = (rotate * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  let px = x - center.x;
  let py = y - center.y;
  px *= sx;
  py *= sy;
  const rx = px * cosR - py * sinR;
  const ry = px * sinR + py * cosR;

  return {
    x: Math.round((rx + center.x + tx) * 10) / 10,
    y: Math.round((ry + center.y + ty) * 10) / 10,
  };
}

export function applyTransformToPath(
  d: string,
  transform: MuscleTransform,
  center: { x: number; y: number },
): string {
  const commands = parsePath(d);
  if (commands.length === 0) return d;

  const transformed = commands.map((cmd) => {
    if (cmd.type.toUpperCase() === 'Z') return { ...cmd };

    const newCoords: number[] = [];
    for (let j = 0; j < cmd.coords.length; j += 2) {
      if (j + 1 < cmd.coords.length) {
        const pt = transformPoint(cmd.coords[j], cmd.coords[j + 1], transform, center);
        newCoords.push(pt.x, pt.y);
      } else {
        newCoords.push(cmd.coords[j]);
      }
    }
    return { type: cmd.type, coords: newCoords };
  });

  return serializePath(transformed, true);
}

export function serializePath(commands: PathCommand[], multiline = true): string {
  const parts = commands.map((cmd) => {
    const upper = cmd.type.toUpperCase();
    if (upper === 'Z') return cmd.type;

    if (upper === 'C') {
      const c = cmd.coords;
      return `${cmd.type} ${c[0]} ${c[1]}, ${c[2]} ${c[3]}, ${c[4]} ${c[5]}`;
    }
    if (upper === 'Q' || upper === 'S') {
      const c = cmd.coords;
      return `${cmd.type} ${c[0]} ${c[1]}, ${c[2]} ${c[3]}`;
    }
    return `${cmd.type} ${cmd.coords.join(' ')}`;
  });

  if (multiline) {
    return '\n      ' + parts.join('\n      ') + '\n    ';
  }
  return parts.join(' ');
}

export function getSvgTransformString(
  transform: MuscleTransform,
  center: { x: number; y: number },
): string {
  const { tx, ty, sx, sy, rotate } = transform;
  const isDefault = tx === 0 && ty === 0 && sx === 1 && sy === 1 && rotate === 0;
  if (isDefault) return '';

  const parts: string[] = [];
  if (tx !== 0 || ty !== 0) parts.push(`translate(${tx} ${ty})`);
  if (rotate !== 0 || sx !== 1 || sy !== 1) {
    parts.push(`translate(${center.x} ${center.y})`);
    if (rotate !== 0) parts.push(`rotate(${rotate})`);
    if (sx !== 1 || sy !== 1) parts.push(`scale(${sx} ${sy})`);
    parts.push(`translate(${-center.x} ${-center.y})`);
  }
  return parts.join(' ');
}
