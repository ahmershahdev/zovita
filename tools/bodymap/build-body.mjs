#!/usr/bin/env node
/**
 * Bakes the body-map figure into public/models/body.bin.
 *
 * Usage: node tools/bodymap/build-body.mjs [--step=0.0085]
 *
 * The figure is sculpted as a signed distance field: ellipsoids and tapered capsules for skull,
 * jaw, muscles and limbs, blended with smooth-min so joints flow like a real body (no seams), and
 * a few smooth subtractions (eye sockets). The field is meshed with surface nets, every vertex is
 * projected back onto the exact surface, and normals come from the field gradient, so shading is
 * smooth without any extra subdivision. The figure is symmetric: parts are defined for the
 * figure's left side (+x) and evaluated on |x|.
 *
 * Each vertex carries the id of the body region it belongs to (see REGIONS), which drives picking
 * and the region glow in the shader. Region anchors (where the hotspot pins sit) are baked too.
 *
 * File layout (little endian):
 *   u32 magic 'ZBDY' · u32 vertexCount · u32 indexCount · u32 indexBytes (2|4)
 *   f32[3] bboxMin · f32[3] bboxMax · f32[REGIONS.length * 3] anchors
 *   u16[vertexCount * 3] positions, quantised to the bbox (padded to 4 bytes)
 *   i8[vertexCount * 4]  normal xyz (×127) + region id
 *   u16|u32[indexCount]  triangle indices
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/models/body.bin');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const STEP = Number(args.step ?? 0.0085);

/** Region ids, shared with resources/js/Components/three/BodyScene.jsx. */
export const REGIONS = ['head', 'face', 'chest', 'abdomen', 'pelvis', 'back', 'arms', 'legs'];
const R = Object.fromEntries(REGIONS.map((r, i) => [r, i]));

// ── SDF primitives ────────────────────────────────────────────────────────────
const len = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

function ellipsoid(c, r) {
    return (x, y, z) => {
        const px = x - c[0], py = y - c[1], pz = z - c[2];
        const k0 = len(px / r[0], py / r[1], pz / r[2]);
        const k1 = len(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2]));
        return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
    };
}

/** Capsule from a to b whose radius tapers from ra to rb. */
function taper(a, b, ra, rb = ra) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
    const bb = bx * bx + by * by + bz * bz;
    return (x, y, z) => {
        const px = x - a[0], py = y - a[1], pz = z - a[2];
        const h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / bb));
        return len(px - bx * h, py - by * h, pz - bz * h) - (ra + (rb - ra) * h);
    };
}

const sphere = (c, r) => (x, y, z) => len(x - c[0], y - c[1], z - c[2]) - r;

function smin(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
}

function smax(a, b, k) {
    return -smin(-a, -b, k);
}

// ── The figure (metres, y up, facing +z, feet at y = 0, ~1.78 m tall) ────────
// [region, sdf, blend radius]
const PARTS = [
    // Head
    ['head', ellipsoid([0, 1.676, -0.006], [0.079, 0.103, 0.098]), 0],
    ['face', ellipsoid([0, 1.6, 0.03], [0.058, 0.06, 0.066]), 0.045],
    ['face', ellipsoid([0, 1.567, 0.052], [0.032, 0.026, 0.032]), 0.03], // chin
    ['face', taper([0, 1.656, 0.09], [0, 1.623, 0.11], 0.01, 0.016), 0.016], // nose
    ['face', taper([0.022, 1.69, 0.088], [0.046, 1.688, 0.08], 0.012), 0.02], // brow
    ['face', ellipsoid([0.038, 1.615, 0.06], [0.022, 0.02, 0.02]), 0.03], // cheek
    ['head', ellipsoid([0.08, 1.646, -0.006], [0.013, 0.031, 0.021]), 0.012], // ear
    // Neck & shoulders
    ['face', taper([0, 1.46, -0.012], [0, 1.585, 0.002], 0.056, 0.049), 0.04],
    ['back', taper([0.02, 1.5, -0.035], [0.165, 1.445, -0.028], 0.042, 0.032), 0.06], // trapezius
    ['chest', taper([0.025, 1.452, 0.045], [0.16, 1.452, 0.012], 0.022, 0.02), 0.04], // clavicle
    ['arms', ellipsoid([0.188, 1.412, -0.006], [0.058, 0.066, 0.06]), 0.05], // deltoid
    // Torso
    ['chest', ellipsoid([0, 1.318, 0], [0.146, 0.172, 0.101]), 0.07],
    ['chest', ellipsoid([0.066, 1.356, 0.058], [0.075, 0.056, 0.046]), 0.045], // pectoral
    ['back', ellipsoid([0.085, 1.27, -0.042], [0.078, 0.13, 0.058]), 0.06], // latissimus
    ['abdomen', ellipsoid([0, 1.14, 0.012], [0.133, 0.14, 0.092]), 0.08],
    ['abdomen', ellipsoid([0.1, 1.08, 0.0], [0.05, 0.08, 0.07]), 0.06], // obliques
    ['abdomen', ellipsoid([0, 1.13, 0.06], [0.07, 0.11, 0.045]), 0.05], // rectus
    ['pelvis', ellipsoid([0, 0.982, -0.006], [0.158, 0.104, 0.104]), 0.07],
    ['pelvis', ellipsoid([0.072, 0.925, -0.056], [0.08, 0.086, 0.07]), 0.05], // gluteus
    // Arms (relaxed A-pose so every part is pickable)
    ['arms', taper([0.2, 1.4, -0.01], [0.256, 1.13, -0.026], 0.045, 0.036), 0.04],
    ['arms', ellipsoid([0.226, 1.27, 0.004], [0.039, 0.08, 0.042]), 0.035], // biceps
    ['arms', ellipsoid([0.236, 1.28, -0.034], [0.036, 0.085, 0.036]), 0.035], // triceps
    ['arms', sphere([0.259, 1.12, -0.026], 0.034), 0.03], // elbow
    ['arms', taper([0.259, 1.12, -0.026], [0.296, 0.872, 0.014], 0.036, 0.024), 0.03],
    ['arms', ellipsoid([0.268, 1.035, -0.012], [0.04, 0.075, 0.037]), 0.035], // forearm muscle
    ['arms', ellipsoid([0.305, 0.8, 0.024], [0.021, 0.056, 0.044]), 0.03], // palm
    ['arms', taper([0.307, 0.768, 0.03], [0.311, 0.712, 0.035], 0.019, 0.015), 0.02], // fingers
    ['arms', taper([0.296, 0.83, 0.058], [0.296, 0.778, 0.077], 0.012, 0.01), 0.018], // thumb
    // Legs
    ['legs', taper([0.094, 0.935, 0.0], [0.1, 0.52, 0.016], 0.087, 0.055), 0.06],
    ['legs', ellipsoid([0.105, 0.72, 0.03], [0.06, 0.15, 0.055]), 0.05], // quadriceps
    ['legs', sphere([0.1, 0.505, 0.02], 0.046), 0.045], // knee
    ['legs', taper([0.1, 0.49, 0.006], [0.105, 0.095, -0.016], 0.05, 0.033), 0.035],
    ['legs', ellipsoid([0.105, 0.37, -0.03], [0.047, 0.1, 0.045]), 0.04], // calf
    ['legs', sphere([0.105, 0.078, -0.016], 0.033), 0.04], // ankle
    ['legs', taper([0.105, 0.045, -0.03], [0.118, 0.028, 0.13], 0.04, 0.032), 0.04], // foot
    ['legs', ellipsoid([0.115, 0.026, 0.075], [0.044, 0.026, 0.085]), 0.04], // sole & toes
];

/** Smooth subtractions: eye sockets and the hollow under the cheekbones. */
const CARVES = [
    [sphere([0.033, 1.668, 0.097], 0.016), 0.012],
    [sphere([0.0, 1.592, 0.098], 0.009), 0.01], // mouth line
    [taper([0, 1.43, -0.112], [0, 1.06, -0.104], 0.011), 0.025], // spine groove
];

function field(x, y, z) {
    const ax = Math.abs(x);
    let d = Infinity;
    for (const [, f, k] of PARTS) d = k ? smin(d, f(ax, y, z), k) : Math.min(d, f(ax, y, z));
    for (const [f, k] of CARVES) d = smax(d, -f(ax, y, z), k);
    // Flat soles.
    return smax(d, -y, 0.01);
}

function gradient(x, y, z) {
    const e = STEP * 0.25;
    const gx = field(x + e, y, z) - field(x - e, y, z);
    const gy = field(x, y + e, z) - field(x, y - e, z);
    const gz = field(x, y, z + e) - field(x, y, z - e);
    const l = len(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
}

/** Region for a surface point: nearest part, refined for the torso (front/back) and head (face). */
function regionAt(x, y, z, n) {
    const ax = Math.abs(x);
    let best = Infinity, region = 'chest';
    for (const [r, f] of PARTS) {
        const d = f(ax, y, z);
        if (d < best) { best = d; region = r; }
    }
    const torso = ['chest', 'abdomen', 'pelvis', 'back'].includes(region);
    if (torso) {
        if (y > 1.035 && n[2] < -0.2) return R.back;
        if (y > 1.22) return n[2] < -0.05 ? R.back : R.chest;
        if (y > 1.035) return R.abdomen;
        return R.pelvis;
    }
    if (region === 'head' && n[2] > 0.35 && y < 1.715) return R.face;
    if (region === 'face' && n[2] < -0.1) return y > 1.56 ? R.head : R.back; // back of skull, nape
    return R[region];
}

// ── Surface nets ──────────────────────────────────────────────────────────────
const MIN = [-0.36, -0.02, -0.16];
const MAX = [0.36, 1.81, 0.2];
const nx = Math.ceil((MAX[0] - MIN[0]) / STEP) + 1;
const ny = Math.ceil((MAX[1] - MIN[1]) / STEP) + 1;
const nz = Math.ceil((MAX[2] - MIN[2]) / STEP) + 1;
const at = (i, j, k) => i + nx * (j + ny * k);
const pos = (i, j, k) => [MIN[0] + i * STEP, MIN[1] + j * STEP, MIN[2] + k * STEP];

console.log(`grid ${nx}×${ny}×${nz} (${(nx * ny * nz / 1e6).toFixed(1)}M samples)`);
const values = new Float32Array(nx * ny * nz);
for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) values[at(i, j, k)] = field(...pos(i, j, k));

const CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
const cellVertex = new Int32Array(nx * ny * nz).fill(-1);
const verts = [];

for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = CORNERS.map(([a, b, c]) => values[at(i + a, j + b, k + c)]);
    if (v.every((s) => s < 0) || v.every((s) => s >= 0)) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
        if ((v[a] < 0) === (v[b] < 0)) continue;
        const t = v[a] / (v[a] - v[b]);
        const ca = CORNERS[a], cb = CORNERS[b];
        sx += ca[0] + (cb[0] - ca[0]) * t; sy += ca[1] + (cb[1] - ca[1]) * t; sz += ca[2] + (cb[2] - ca[2]) * t; n++;
    }
    cellVertex[at(i, j, k)] = verts.length;
    verts.push(pos(i + sx / n, j + sy / n, k + sz / n));
}

// Project onto the exact surface (Newton steps along the gradient).
for (const p of verts) {
    for (let s = 0; s < 4; s++) {
        const d = field(...p);
        if (Math.abs(d) < 1e-6) break;
        const g = gradient(...p);
        p[0] -= d * g[0]; p[1] -= d * g[1]; p[2] -= d * g[2];
    }
}
const normals = verts.map((p) => gradient(...p));

const tris = [];
function quad(a, b, c, d, flip) {
    if ([a, b, c, d].some((q) => q < 0)) return;
    if (flip) tris.push(a, c, b, a, d, c); else tris.push(a, b, c, a, c, d);
}
for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = values[at(i, j, k)] < 0;
    if (s0 !== (values[at(i + 1, j, k)] < 0)) quad(cellVertex[at(i, j - 1, k - 1)], cellVertex[at(i, j, k - 1)], cellVertex[at(i, j, k)], cellVertex[at(i, j - 1, k)], s0);
    if (s0 !== (values[at(i, j + 1, k)] < 0)) quad(cellVertex[at(i - 1, j, k - 1)], cellVertex[at(i - 1, j, k)], cellVertex[at(i, j, k)], cellVertex[at(i, j, k - 1)], s0);
    if (s0 !== (values[at(i, j, k + 1)] < 0)) quad(cellVertex[at(i - 1, j - 1, k)], cellVertex[at(i, j - 1, k)], cellVertex[at(i, j, k)], cellVertex[at(i - 1, j, k)], s0);
}

// Make winding agree with the outward normal (one global check is enough: nets are consistent).
let agree = 0;
for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [verts[tris[t]], verts[tris[t + 1]], verts[tris[t + 2]]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const nm = normals[tris[t]];
    agree += cr[0] * nm[0] + cr[1] * nm[1] + cr[2] * nm[2] > 0 ? 1 : -1;
}
if (agree < 0) for (let t = 0; t < tris.length; t += 3) [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]];

const regions = verts.map((p, i) => regionAt(...p, normals[i]));

// Anchors: the most camera-facing point of each region (left side for limbs, back for "back").
const anchors = REGIONS.map((name, id) => {
    const members = verts.map((p, i) => [p, normals[i]]).filter((_, i) => regions[i] === id);
    const cy = members.reduce((s, [p]) => s + p[1], 0) / members.length;
    const lateral = name === 'arms' || name === 'legs';
    const facing = name === 'back' ? -1 : 1;
    let best = null, score = -Infinity;
    for (const [p, n] of members) {
        if (lateral && p[0] < 0) continue;
        // The head pin sits on the crown (well clear of the face pin, so both stay easy to tap).
        const sc = name === 'head'
            ? p[1] * 10 + n[2] - Math.abs(p[0]) * 4
            : n[2] * facing * 2 - Math.abs(p[1] - cy) * 6 - (lateral ? 0 : Math.abs(p[0]) * 4);
        if (sc > score) { score = sc; best = p; }
    }
    return best;
});

// ── Write ─────────────────────────────────────────────────────────────────────
const bmin = [0, 1, 2].map((a) => Math.min(...verts.map((p) => p[a])));
const bmax = [0, 1, 2].map((a) => Math.max(...verts.map((p) => p[a])));
const vc = verts.length, ic = tris.length;
const indexBytes = vc < 65536 ? 2 : 4;
const headerBytes = 16 + 24 + REGIONS.length * 12;
const posBytes = Math.ceil((vc * 6) / 4) * 4;
const buf = Buffer.alloc(headerBytes + posBytes + vc * 4 + ic * indexBytes);
let o = 0;
buf.write('ZBDY', o, 'ascii'); o += 4;
for (const n of [vc, ic, indexBytes]) { buf.writeUInt32LE(n, o); o += 4; }
for (const n of [...bmin, ...bmax, ...anchors.flat()]) { buf.writeFloatLE(n, o); o += 4; }
for (const p of verts) for (let a = 0; a < 3; a++) { buf.writeUInt16LE(Math.round(((p[a] - bmin[a]) / (bmax[a] - bmin[a])) * 65535), o); o += 2; }
o = headerBytes + posBytes;
verts.forEach((_, i) => {
    for (let a = 0; a < 3; a++) buf.writeInt8(Math.round(normals[i][a] * 127), o++);
    buf.writeInt8(regions[i], o++);
});
for (const t of tris) { indexBytes === 2 ? buf.writeUInt16LE(t, o) : buf.writeUInt32LE(t, o); o += indexBytes; }

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, buf);
const counts = REGIONS.map((r, id) => `${r} ${regions.filter((x) => x === id).length}`).join(', ');
console.log(`✓ ${vc} vertices, ${ic / 3} triangles, ${(buf.length / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT)}`);
console.log(`  regions: ${counts}`);

// Pre-compressed variants, served by public/.htaccess (≈4× smaller over the wire).
const zlib = await import('node:zlib');
await fs.writeFile(`${OUT}.br`, zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }));
await fs.writeFile(`${OUT}.gz`, zlib.gzipSync(buf, { level: 9 }));
console.log(`  compressed: br ${((await fs.stat(`${OUT}.br`)).size / 1024).toFixed(0)} KB, gz ${((await fs.stat(`${OUT}.gz`)).size / 1024).toFixed(0)} KB`);
