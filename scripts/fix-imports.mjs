/**
 * Fix ESM imports in compiled TypeScript output.
 * Adds `.js` extensions to relative imports/exports after `tsc`.
 */
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('server/dist');

function resolveImportTarget(filePath, importPath) {
  const absoluteTarget = path.resolve(path.dirname(filePath), importPath);
  const explicitJsFile = `${absoluteTarget}.js`;
  const directoryIndexFile = path.join(absoluteTarget, 'index.js');

  if (fs.existsSync(explicitJsFile)) {
    return `${importPath}.js`;
  }

  if (fs.existsSync(directoryIndexFile)) {
    const normalizedPath = importPath.replace(/\/$/, '');
    return `${normalizedPath}/index.js`;
  }

  return `${importPath}.js`;
}

function normalizeDirectoryJsSpecifier(filePath, importPath) {
  if (!importPath.endsWith('.js')) {
    return importPath;
  }

  const importWithoutJs = importPath.slice(0, -3);
  const absoluteTarget = path.resolve(path.dirname(filePath), importWithoutJs);
  const explicitJsFile = `${absoluteTarget}.js`;
  const directoryIndexFile = path.join(absoluteTarget, 'index.js');

  if (!fs.existsSync(explicitJsFile) && fs.existsSync(directoryIndexFile)) {
    const normalizedPath = importWithoutJs.replace(/\/$/, '');
    return `${normalizedPath}/index.js`;
  }

  return importPath;
}

function fixRelativeSpecifiers(filePath, content) {
  let fixed = content.replace(
    /(from\s+['"])(\.\.?\/[^'"]*?\.js)(['"])/g,
    (match, prefix, importPath, suffix) => `${prefix}${normalizeDirectoryJsSpecifier(filePath, importPath)}${suffix}`,
  );

  fixed = fixed.replace(
    /(import\s*\(\s*['"])(\.\.?\/[^'"]*?\.js)(['"]\s*\))/g,
    (match, prefix, importPath, suffix) => `${prefix}${normalizeDirectoryJsSpecifier(filePath, importPath)}${suffix}`,
  );

  fixed = fixed.replace(
    /(from\s+['"])(\.\.?\/[^'"]*?)(?<!\.js)(['"])/g,
    (match, prefix, importPath, suffix) => {
      if (importPath.endsWith('.js')) return match;
      return `${prefix}${resolveImportTarget(filePath, importPath)}${suffix}`;
    },
  );

  fixed = fixed.replace(
    /(import\s*\(\s*['"])(\.\.?\/[^'"]*?)(?<!\.js)(['"]\s*\))/g,
    (match, prefix, importPath, suffix) => {
      if (importPath.endsWith('.js')) return match;
      return `${prefix}${resolveImportTarget(filePath, importPath)}${suffix}`;
    },
  );

  return fixed;
}

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const fixed = fixRelativeSpecifiers(filePath, original);
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
