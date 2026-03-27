/**
 * Server Bootstrap Script for tsx
 * Sets up module shims and starts the server
 */

import { createRequire } from 'module';
import * as Module from 'module';

const require = createRequire(import.meta.url);
const electronShimPath = require.resolve('./shims/electron.cjs');

// Patch Module._load to intercept electron imports
const originalLoad = (Module as any)._load;
const originalResolveFilename = (Module as any)._resolveFilename;

(Module as any)._resolveFilename = function(request: string, parent: unknown, isMain: boolean, options: unknown) {
  if (request === 'electron') {
    return electronShimPath;
  }
  return originalResolveFilename.apply(this, [request, parent, isMain, options]);
};

(Module as any)._load = function(request: string, parent: any, isMain: boolean) {
  if (request === 'electron') {
    return require(electronShimPath);
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};

// Load the CLI only after the shim is installed so transitive imports from
// src/main can resolve `electron` safely in pure Node/web dev mode.
void import('./src/cli.ts');
