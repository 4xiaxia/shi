import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const bundleRoot = path.join(projectRoot, 'release', `uclaw-linux-standard-${stamp}`);

const rootFiles = [
  '.env.example',
  '.eslintrc.cjs',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  'LICENSE',
  'README.md',
  'package.json',
  'package-lock.json',
  'postcss.config.js',
  'tailwind.config.js',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.web.ts',
  'index.html',
];

const rootDirs = [
  'clean-room/spine/modules',
  'deploy',
  'docs',
  'patches',
  'public',
  'server',
  'SKILLs',
  'src',
];

function normalize(relativePath) {
  return relativePath.replaceAll('\\', '/');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyFileRelative(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const targetPath = path.join(bundleRoot, relativePath);
  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function copyDirRelative(relativePath) {
  const sourcePath = path.join(projectRoot, relativePath);
  const targetPath = path.join(bundleRoot, relativePath);
  await fs.cp(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (source) => {
      const relative = normalize(path.relative(projectRoot, source));
      if (!relative) return true;
      if (relative.startsWith('.git/')) return false;
      if (relative === 'node_modules' || relative.startsWith('node_modules/')) return false;
      if (relative.includes('/node_modules/')) return false;
      if (relative.endsWith('/node_modules')) return false;
      if (relative.startsWith('.uclaw/')) return false;
      if (relative.startsWith('release/')) return false;
      if (relative.startsWith('server/dist/')) return false;
      if (relative.startsWith('server/public/')) return false;
      if (relative.endsWith('.sqlite')) return false;
      if (relative.endsWith('.db')) return false;
      return true;
    },
  });
}

async function writeManifest() {
  const manifest = `# Delivery Manifest

- Bundle: \`${path.basename(bundleRoot)}\`
- Standard: \`npm + systemd + env\`
- Install: \`npm ci\`
- Build: \`npm run build\`
- Preflight: \`npm run deploy:check\`
- Start: \`npm start\`
- Linux guide: \`docs/DEPLOYMENT_STANDARD_LINUX.md\`
- Env template: \`deploy/linux/uclaw.env.example\`
- Systemd unit: \`deploy/linux/uclaw.service\`
`;
  await fs.writeFile(path.join(bundleRoot, 'DELIVERY_MANIFEST.md'), manifest, 'utf8');
}

async function main() {
  await fs.rm(bundleRoot, { recursive: true, force: true });
  await ensureDir(bundleRoot);

  for (const file of rootFiles) {
    await copyFileRelative(file);
  }

  await ensureDir(path.join(bundleRoot, 'scripts'));
  const scripts = await fs.readdir(path.join(projectRoot, 'scripts'));
  for (const file of scripts) {
    await copyFileRelative(path.join('scripts', file));
  }

  for (const dir of rootDirs) {
    await copyDirRelative(dir);
  }

  await writeManifest();

  console.log(`[delivery-bundle] ready: ${bundleRoot}`);
}

main().catch((error) => {
  console.error('[delivery-bundle] failed:', error);
  process.exitCode = 1;
});
