/**
 * Server Bootstrap Script
 * Sets up module shims and starts the server
 */

import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Register electron shim before any other imports
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string, ...args: unknown[]) {
  if (id === 'electron') {
    // Return electron shim
    return require('./shims/electron.cjs');
  }
  return originalRequire.apply(this, [id, ...args]);
};

// Now import the main server
import './index.js';
