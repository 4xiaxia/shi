/**
 * Fix ESM imports in compiled TypeScript output.
 * Adds `.js` extensions to relative imports/exports after `tsc`.
 */
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('server/dist');

function fixRelativeSpecifiers(content) {
  let fixed = content.replace(
    /(from\s+['"])(\.\.?\/[^'"]*?)(?<!\.js)(['"])/g,
    (match, prefix, importPath, suffix) => {
      if (importPath.endsWith('.js')) return match;
      return `${prefix}${importPath}.js${suffix}`;
    },
  );

  fixed = fixed.replace(
    /(import\s*\(\s*['"])(\.\.?\/[^'"]*?)(?<!\.js)(['"]\s*\))/g,
    (match, prefix, importPath, suffix) => {
      if (importPath.endsWith('.js')) return match;
      return `${prefix}${importPath}.js${suffix}`;
    },
  );

  return fixed;
}

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const fixed = fixRelativeSpecifiers(original);
  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, 'utf8');
  }
}

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.name.endsWith('.js')) {
      fixFile(fullPath);
    }
  }
}

walk(distDir);
console.log('[fix-imports] Done.');
