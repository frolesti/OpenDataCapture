#!/usr/bin/env tsx

import path from 'path';

import { prismaPlugin } from '@douglasneuroinformatics/esbuild-plugin-prisma';
import { getReleaseInfo } from '@opendatacapture/release-info';
import esbuild from 'esbuild';

const entryFile = path.resolve(import.meta.dirname, '../src/main.ts');
const outdir = path.resolve(import.meta.dirname, '../dist');
const tsconfig = path.resolve(import.meta.dirname, '../tsconfig.json');

await esbuild.build({
  banner: {
    js: "Object.defineProperties(globalThis, { __dirname: { value: import.meta.dirname, writable: false }, __filename: { value: import.meta.filename, writable: false }, require: { value: (await import('module')).createRequire(import.meta.url), writable: false } });"
  },
  bundle: true,
  define: {
    __RELEASE__: JSON.stringify({
      buildTime: Date.now(),
      type: 'production',
      version: process.env.RELEASE_VERSION || process.env.VERSION || 'latest'
    }),
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true'
  },
  entryPoints: [entryFile],
  external: ['lightningcss'],
  format: 'esm',
  keepNames: true,
  loader: {
    '.node': 'copy'
  },
  outfile: path.resolve(outdir, 'main.js'),
  platform: 'node',
  plugins: [prismaPlugin({ outdir: path.join(outdir, 'prisma/client') })],
  sourcemap: true,
  target: ['node18', 'es2022'],
  tsconfig
});

// eslint-disable-next-line no-console
console.log('Done!');
