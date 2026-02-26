import * as math from 'mathjs';

export type Matrix2x2 = [[number, number], [number, number]];

export interface SVDResult {
  u: Matrix2x2;
  s: [number, number];
  v: Matrix2x2; // This is V, not V^T
  vt: Matrix2x2; // This is V^T
}

export function getAngle(matrix: Matrix2x2): number {
  // Assuming it's a rotation matrix [[cos, -sin], [sin, cos]]
  // angle = atan2(sin, cos) = atan2(m[1][0], m[0][0])
  return Math.atan2(matrix[1][0], matrix[0][0]);
}

export function fromAngle(angle: number): Matrix2x2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [[c, -s], [s, c]];
}

export function computeSVD(matrix: Matrix2x2): SVDResult {
  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1];

  // Compute A^T * A
  const e = a * a + c * c;
  const f = a * b + c * d;
  const g = b * b + d * d;

  // Eigenvalues of A^T * A
  // lambda^2 - (e+g)lambda + (eg - f^2) = 0
  const disc = Math.sqrt((e - g) * (e - g) + 4 * f * f);
  const lambda1 = (e + g + disc) / 2;
  const lambda2 = (e + g - disc) / 2;

  const s1 = Math.sqrt(lambda1);
  const s2 = Math.sqrt(lambda2);

  // Eigenvectors of A^T * A for V
  let v1: [number, number], v2: [number, number];
  if (Math.abs(f) < 1e-10) {
    if (e >= g) {
      v1 = [1, 0];
      v2 = [0, 1];
    } else {
      v1 = [0, 1];
      v2 = [-1, 0];
    }
  } else {
    v1 = [f, lambda1 - e];
    const norm1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    v1 = [v1[0] / norm1, v1[1] / norm1];
    v2 = [-v1[1], v1[0]];
  }

  // U = A * V * S^-1
  let u1: [number, number] = [0, 0];
  let u2: [number, number] = [0, 0];

  if (s1 > 1e-9) {
    u1 = [
      (a * v1[0] + b * v1[1]) / s1,
      (c * v1[0] + d * v1[1]) / s1
    ];
  } else {
    u1 = [1, 0];
  }

  if (s2 > 1e-9) {
    u2 = [
      (a * v2[0] + b * v2[1]) / s2,
      (c * v2[0] + d * v2[1]) / s2
    ];
  } else {
    // u2 must be orthogonal to u1
    u2 = [-u1[1], u1[0]];
  }

  const u: Matrix2x2 = [
    [u1[0], u2[0]],
    [u1[1], u2[1]]
  ];

  const v: Matrix2x2 = [
    [v1[0], v2[0]],
    [v1[1], v2[1]]
  ];

  const vt: Matrix2x2 = [
    [v1[0], v1[1]],
    [v2[0], v2[1]]
  ];

  return { u, s: [s1, s2], v, vt };
}

export function reconstructMatrix(u: Matrix2x2, s: [number, number], vt: Matrix2x2): Matrix2x2 {
  const S: Matrix2x2 = [[s[0], 0], [0, s[1]]];
  const us = math.multiply(u, S);
  const result = math.multiply(us, vt);
  return result as any as Matrix2x2;
}

export function applyTransform(matrix: Matrix2x2, point: [number, number]): [number, number] {
  return [
    matrix[0][0] * point[0] + matrix[0][1] * point[1],
    matrix[1][0] * point[0] + matrix[1][1] * point[1]
  ];
}
