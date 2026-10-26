/// <reference path="./vendor.d.ts" />
/**
 * Turns any source model (CAD export, scan, AI draft, artist file) into a
 * web/AR-ready GLB: real-world scale, standing on the floor, compressed,
 * validated — plus a QA report for a human to approve before publishing.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Document, Logger, NodeIO, type Node, type Scene } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  center,
  dedup,
  draco,
  flatten,
  getBounds,
  getGLPrimitiveCount,
  join,
  prune,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import validator from 'gltf-validator';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

/** Physical size of the real product, in centimetres. */
export interface Dimensions {
  width: number;
  depth: number;
  height: number;
}

export interface ProcessOptions {
  input: string;
  output: string;
  /** Declared product size; the model is scaled to match it. */
  dimensions?: Dimensions;
  /** Above this, geometry is simplified. Mobile AR stays smooth below ~150k. */
  maxTriangles?: number;
  /** Longest texture edge in px. */
  maxTextureSize?: number;
  /** Manual turn around the vertical axis, in degrees; overrides auto-detection. */
  rotateY?: number;
}

export interface AssetReport {
  input: string;
  output: string;
  inputBytes: number;
  outputBytes: number;
  triangles: { before: number; after: number };
  textures: number;
  materials: number;
  /** Final bounding box in cm (X = width, Y = height, Z = depth). */
  dimensions: Dimensions;
  scaleApplied: number;
  rotateYApplied: number;
  validation: { errors: number; warnings: number; messages: string[] };
  warnings: string[];
  /** False when a human must look at the model before it goes live. */
  publishable: boolean;
}

const DEFAULTS = { maxTriangles: 150_000, maxTextureSize: 2048 };

/** Proportions may differ this much from the declared size before we flag it. */
const PROPORTION_TOLERANCE = 0.05;

let io: NodeIO | undefined;

async function getIO(): Promise<NodeIO> {
  io ??= new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
  return io;
}

function countTriangles(doc: Document): number {
  let total = 0;
  for (const scene of doc.getRoot().listScenes()) {
    scene.traverse((node) => {
      for (const prim of node.getMesh()?.listPrimitives() ?? []) {
        if (prim.getMode() === 4 /* TRIANGLES */) total += getGLPrimitiveCount(prim);
      }
    });
  }
  return total;
}

function sizeOf(scene: Scene): [number, number, number] {
  const { min, max } = getBounds(scene);
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

interface Fit {
  scale: number;
  /** Degrees around the vertical axis. */
  rotateY: number;
}

/** Uniform scale matching `size` to `target`, and how far the proportions are off. */
function fitAxes(size: number[], target: number[]): { scale: number; deviation: number } {
  const ratios = size.map((s, i) => target[i] / s);
  const scale = median(ratios);
  return { scale, deviation: Math.max(...ratios.map((r) => Math.abs(r / scale - 1))) };
}

/**
 * glTF units are metres, X = width, Y = height, Z = depth. Picks a uniform
 * scale (and a quarter turn, for models exported facing sideways) that makes
 * the model match the declared size — or, without one, guesses cm/mm exports.
 */
function fitToDimensions(
  [x, y, z]: [number, number, number],
  dims: Dimensions | undefined,
  rotateY: number | undefined,
  warnings: string[],
): Fit {
  if (dims) {
    const target = [dims.width / 100, dims.height / 100, dims.depth / 100];
    const asIs = fitAxes([x, y, z], target);
    const turned = fitAxes([z, y, x], target);

    const quarterTurn =
      rotateY !== undefined
        ? Math.abs(rotateY) % 180 === 90
        : asIs.deviation > PROPORTION_TOLERANCE && turned.deviation <= PROPORTION_TOLERANCE;
    const { scale, deviation } = quarterTurn ? turned : asIs;
    const fit = { scale, rotateY: rotateY ?? (quarterTurn ? 90 : 0) };

    if (rotateY === undefined && quarterTurn) {
      warnings.push('Model was exported facing sideways; turned 90°. Check that the front faces the viewer.');
    }
    if (deviation > PROPORTION_TOLERANCE) {
      warnings.push(
        `Model proportions differ from the declared size by ${(deviation * 100).toFixed(0)}% ` +
          `(check the dimensions, or whether the model is rotated).`,
      );
    }
    return fit;
  }

  const longest = Math.max(x, y, z);
  if (longest > 5000) {
    warnings.push('No dimensions given; model looks like it was exported in millimetres.');
    return { scale: 0.001, rotateY: rotateY ?? 0 };
  }
  if (longest > 50) {
    warnings.push('No dimensions given; model looks like it was exported in centimetres.');
    return { scale: 0.01, rotateY: rotateY ?? 0 };
  }
  warnings.push('No dimensions given; real-world size is unverified.');
  return { scale: 1, rotateY: rotateY ?? 0 };
}

/** Wraps the scene in one node so the fit and floor offset apply to everything. */
function wrapScene(doc: Document, scene: Scene, { scale, rotateY }: Fit): Node {
  const half = (rotateY * Math.PI) / 360;
  const root = doc
    .createNode('FAReality_Root')
    .setScale([scale, scale, scale])
    .setRotation([0, Math.sin(half), 0, Math.cos(half)]);
  for (const child of scene.listChildren()) root.addChild(child);
  scene.addChild(root);
  return root;
}

export async function processModel(opts: ProcessOptions): Promise<AssetReport> {
  const { maxTriangles, maxTextureSize } = { ...DEFAULTS, ...opts };
  const io = await getIO();
  const warnings: string[] = [];

  const doc = (await io.read(opts.input)).setLogger(new Logger(Logger.Verbosity.WARN));
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  if (!scene) throw new Error(`${opts.input}: no scene found`);
  if (doc.getRoot().listAnimations().length > 0) {
    warnings.push('Model has animations; furniture viewers ignore them.');
  }

  const trianglesBefore = countTriangles(doc);
  const fit = fitToDimensions(sizeOf(scene), opts.dimensions, opts.rotateY, warnings);
  wrapScene(doc, scene, fit);

  await doc.transform(
    center({ pivot: 'below' }), // stand on the floor at the origin — AR placement depends on it
    dedup(),
    flatten(),
    join(),
    weld(),
  );

  if (trianglesBefore > maxTriangles) {
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio: maxTriangles / trianglesBefore, error: 0.001 }),
    );
    warnings.push(`Simplified from ${trianglesBefore} triangles; check thin parts (legs, handles).`);
  }

  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTextureSize, maxTextureSize] }),
    prune(),
    draco(),
  );

  if (doc.getRoot().listTextures().length === 0) {
    warnings.push('No textures; materials are flat colours.');
  }

  const glb = await io.writeBinary(doc);
  await mkdir(path.dirname(opts.output), { recursive: true });
  await writeFile(opts.output, glb);

  const validation = await validator.validateBytes(glb, { maxIssues: 20 });
  const [w, h, d] = sizeOf(scene);
  const trianglesAfter = countTriangles(doc);

  return {
    input: opts.input,
    output: opts.output,
    inputBytes: (await readFile(opts.input)).byteLength,
    outputBytes: glb.byteLength,
    triangles: { before: trianglesBefore, after: trianglesAfter },
    textures: doc.getRoot().listTextures().length,
    materials: doc.getRoot().listMaterials().length,
    dimensions: { width: round(w * 100), height: round(h * 100), depth: round(d * 100) },
    scaleApplied: fit.scale,
    rotateYApplied: fit.rotateY,
    validation: {
      errors: validation.issues.numErrors,
      warnings: validation.issues.numWarnings,
      messages: validation.issues.messages
        .filter((m) => m.severity <= 1)
        .map((m) => `${m.code}: ${m.message}`),
    },
    warnings,
    publishable: validation.issues.numErrors === 0 && warnings.length === 0,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
