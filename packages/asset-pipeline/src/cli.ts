/**
 * Usage:
 *   npm run assets -- <input.glb|gltf> <output.glb> [--width 200 --depth 90 --height 85] [--rotate-y 90]
 *
 * Prints the QA report as JSON and writes it next to the output (<output>.report.json).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { processModel, type Dimensions } from './index';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: 'string' },
    depth: { type: 'string' },
    height: { type: 'string' },
    'max-triangles': { type: 'string' },
    'rotate-y': { type: 'string' },
  },
});

const [input, output] = positionals.map((p) => path.resolve(process.env.INIT_CWD ?? process.cwd(), p));
if (!input || !output) {
  console.error('Usage: npm run assets -- <input> <output.glb> [--width cm --depth cm --height cm]');
  process.exit(1);
}

let dimensions: Dimensions | undefined;
if (values.width || values.depth || values.height) {
  if (!(values.width && values.depth && values.height)) {
    console.error('Give all three of --width, --depth and --height (in cm), or none.');
    process.exit(1);
  }
  dimensions = { width: Number(values.width), depth: Number(values.depth), height: Number(values.height) };
}

const report = await processModel({
  input,
  output,
  dimensions,
  maxTriangles: values['max-triangles'] ? Number(values['max-triangles']) : undefined,
  rotateY: values['rotate-y'] ? Number(values['rotate-y']) : undefined,
});
await writeFile(`${output}.report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.publishable) process.exitCode = 2;
