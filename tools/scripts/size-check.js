#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function printUsage() {
  console.error(
    'Usage: node tools/scripts/size-check.js <packageName> <limitKb>',
  );
  console.error('Example: node tools/scripts/size-check.js core 15');
}

const [packageName, limitArg] = process.argv.slice(2);

if (!packageName || !limitArg) {
  printUsage();
  process.exit(1);
}

const limitKb = Number.parseFloat(limitArg);

if (!Number.isFinite(limitKb) || limitKb <= 0) {
  console.error(`Invalid limitKb value: "${limitArg}"`);
  printUsage();
  process.exit(1);
}

const bundlePath = path.resolve(
  process.cwd(),
  'packages',
  packageName,
  'dist',
  'index.iife.js',
);

if (!fs.existsSync(bundlePath)) {
  console.error(`Bundle not found: ${bundlePath}`);
  console.error('Build the package first so dist/index.iife.js exists.');
  process.exit(1);
}

const bundleBuffer = fs.readFileSync(bundlePath);
const gzippedBuffer = zlib.gzipSync(bundleBuffer);
const gzipBytes = gzippedBuffer.byteLength;
const gzipKb = gzipBytes / 1024;

console.log(`Bundle: ${bundlePath}`);
console.log(`Gzipped size: ${gzipKb.toFixed(2)} KB`);
console.log(`Limit: ${limitKb.toFixed(2)} KB`);

if (gzipKb > limitKb) {
  const overByKb = gzipKb - limitKb;
  console.error(`FAIL: Bundle is over budget by ${overByKb.toFixed(2)} KB`);
  process.exit(1);
}

const underByKb = limitKb - gzipKb;
console.log(`PASS: Bundle is within budget by ${underByKb.toFixed(2)} KB`);
