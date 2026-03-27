import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { SkillManager } from '../../src/main/skillManager';
import { AGENT_ROLE_ORDER, type AgentRoleKey } from '../../src/shared/agentRoleConfig';
import type { RoleSkillIndexFile } from './roleSkillFiles';

type SkillBindingScope = AgentRoleKey | 'all';

type StoredSkillBindingRow = {
  id: string;
  roleKey: string;
  skillId: string;
  skillName: string;
  enabled: boolean;
};

type RecoverableBinding = {
  roleKey: SkillBindingScope;
  skillId: string;
  skillName: string;
  installedAt: number;
  updatedAt: number;
};

type RecoveryCandidate = {
  root: string;
  bindings: RecoverableBinding[];
  updatedAt: number;
};

type InstalledSkill = {
  id: string;
  name: string;
};

type DatabaseLike = {
  exec: (sql: string, params?: Array<string | number>) => any[];
  run: (sql: string, params?: Array<string | number>) => void;
};

type StoreLike = {
  getDatabase(): DatabaseLike;
  getSaveFunction(): () => void;
};

function readRows(result: any[]): Array<any[]> {
  return result?.[0]?.values ?? [];
}

function readExistingBindings(store: StoreLike): StoredSkillBindingRow[] {
  const result = store.getDatabase().exec(
    `SELECT id, role_key, skill_id, skill_name, enabled
     FROM skill_role_configs
     ORDER BY role_key, installed_at ASC`
  );

  return readRows(result).map((row) => ({
    id: String(row[0] ?? ''),
    roleKey: String(row[1] ?? ''),
    skillId: String(row[2] ?? ''),
    skillName: String(row[3] ?? ''),
    enabled: Number(row[4] ?? 0) === 1,
  }));
}

function buildInstalledSkillMap(skillManager: Pick<SkillManager, 'listSkills'>): Map<string, InstalledSkill> {
  return new Map(
    skillManager.listSkills().map((skill) => [
      skill.id,
      {
        id: skill.id,
        name: skill.name,
      },
    ])
  );
}

function parseRoleSkillIndex(filePath: string): RoleSkillIndexFile | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as RoleSkillIndexFile;
  } catch {
    return null;
  }
}

function normalizeScope(roleKey: AgentRoleKey, scope: string): SkillBindingScope | null {
  if (scope === 'all') {
    return 'all';
  }
  return scope === roleKey ? roleKey : null;
}

function loadBindingsFromRoleIndexes(root: string, installedSkills: Map<string, InstalledSkill>): RecoveryCandidate | null {
  const deduped = new Map<string, RecoverableBinding>();
  let updatedAt = 0;

  for (const roleKey of AGENT_ROLE_ORDER) {
    const indexPath = path.join(root, 'roles', roleKey, 'skills.json');
    const index = parseRoleSkillIndex(indexPath);
    if (!index || !Array.isArray(index.skills)) {
      continue;
    }

    try {
      updatedAt = Math.max(updatedAt, fs.statSync(indexPath).mtimeMs);
    } catch {
      // Ignore broken stat calls; payload timestamp is enough as fallback.
    }
    updatedAt = Math.max(updatedAt, Number(index.generatedAt ?? 0));

    for (const skill of index.skills) {
      const normalizedScope = normalizeScope(roleKey, String(skill.scope ?? ''));
      if (!normalizedScope) {
        continue;
      }

      const skillId = String(skill.id ?? '').trim();
      if (!skillId) {
        continue;
      }

      const installed = installedSkills.get(skillId);
      if (!installed) {
        continue;
      }

      const key = `${normalizedScope}:${skillId}`;
      const candidate: RecoverableBinding = {
        roleKey: normalizedScope,
        skillId,
        skillName: String(skill.name ?? '').trim() || installed.name || skillId,
        installedAt: Number(skill.installedAt ?? 0) || Date.now(),
        updatedAt: Number(skill.updatedAt ?? 0) || Date.now(),
      };

      const existing = deduped.get(key);
      if (!existing || candidate.updatedAt >= existing.updatedAt) {
        deduped.set(key, candidate);
      }
    }
  }

  const bindings = Array.from(deduped.values()).sort((a, b) => {
    if (a.roleKey !== b.roleKey) {
      return a.roleKey.localeCompare(b.roleKey);
    }
    return a.skillId.localeCompare(b.skillId);
  });

  if (bindings.length === 0) {
    return null;
  }

  return {
    root,
    bindings,
    updatedAt,
  };
}

function enumerateRecoveryRoots(userDataPath: string, projectRoot: string): string[] {
  const roots = new Set<string>();
  roots.add(path.resolve(userDataPath));

  return Array.from(roots);
}

function pickBestRecoveryCandidate(
  userDataPath: string,
  projectRoot: string,
  installedSkills: Map<string, InstalledSkill>,
): RecoveryCandidate | null {
  const candidates = enumerateRecoveryRoots(userDataPath, projectRoot)
    .map((root) => loadBindingsFromRoleIndexes(root, installedSkills))
    .filter((candidate): candidate is RecoveryCandidate => Boolean(candidate));

  if (candidates.length === 0) {
    return null;
  }

  const activeRuntimeCandidate = candidates.find((candidate) => (
    path.resolve(candidate.root) === path.resolve(userDataPath)
  ));
  if (activeRuntimeCandidate && activeRuntimeCandidate.bindings.length > 0) {
    return activeRuntimeCandidate;
  }

  candidates.sort((a, b) => {
    if (b.bindings.length !== a.bindings.length) {
      return b.bindings.length - a.bindings.length;
    }
    return b.updatedAt - a.updatedAt;
  });

  return candidates[0] ?? null;
}

function clearSkillBindings(store: StoreLike): void {
  store.getDatabase().run('DELETE FROM skill_role_configs');
}

function insertRecoveredBindings(store: StoreLike, bindings: RecoverableBinding[]): void {
  const db = store.getDatabase();
  for (const binding of bindings) {
    db.run(
      `INSERT INTO skill_role_configs
        (id, role_key, skill_id, skill_name, prefix, enabled, config_json, installed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        randomUUID(),
        binding.roleKey,
        binding.skillId,
        binding.skillName,
        binding.roleKey === 'all' ? 'public_' : `${binding.roleKey}_`,
        '{}',
        binding.installedAt,
        binding.updatedAt,
      ]
    );
  }
}

function cleanupUnboundRoleSkillArtifacts(userDataPath: string, bindings: RecoverableBinding[]): Array<string> {
  const visibleByRole = new Map<AgentRoleKey, Set<string>>();
  for (const roleKey of AGENT_ROLE_ORDER) {
    visibleByRole.set(roleKey, new Set());
  }

  for (const binding of bindings) {
    if (binding.roleKey === 'all') {
      for (const roleKey of AGENT_ROLE_ORDER) {
        visibleByRole.get(roleKey)?.add(binding.skillId);
      }
      continue;
    }
    visibleByRole.get(binding.roleKey)?.add(binding.skillId);
  }

  const deletedPaths: string[] = [];
  for (const roleKey of AGENT_ROLE_ORDER) {
    const allowed = visibleByRole.get(roleKey) ?? new Set<string>();
    for (const subdir of ['skill-configs', 'skill-secrets']) {
      const root = path.join(path.resolve(userDataPath), 'roles', roleKey, subdir);
      if (!fs.existsSync(root)) {
        continue;
      }

      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) {
          continue;
        }

        const skillId = entry.name.slice(0, -'.json'.length);
        if (allowed.has(skillId)) {
          continue;
        }

        const targetPath = path.join(root, entry.name);
        fs.rmSync(targetPath, { force: true });
        deletedPaths.push(targetPath);
      }
    }
  }

  return deletedPaths;
}

function copyIfMissing(sourcePath: string, targetPath: string): boolean {
  if (!fs.existsSync(sourcePath) || fs.existsSync(targetPath)) {
    return false;
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function restoreBoundRoleSkillArtifacts(
  userDataPath: string,
  snapshotRoot: string,
  bindings: RecoverableBinding[],
): Array<string> {
  const restoredPaths: string[] = [];
  const visibleByRole = new Map<AgentRoleKey, Set<string>>();
  for (const roleKey of AGENT_ROLE_ORDER) {
    visibleByRole.set(roleKey, new Set());
  }

  for (const binding of bindings) {
    if (binding.roleKey === 'all') {
      for (const roleKey of AGENT_ROLE_ORDER) {
        visibleByRole.get(roleKey)?.add(binding.skillId);
      }
      continue;
    }
    visibleByRole.get(binding.roleKey)?.add(binding.skillId);
  }

  for (const roleKey of AGENT_ROLE_ORDER) {
    const visibleSkillIds = visibleByRole.get(roleKey) ?? new Set<string>();
    for (const skillId of visibleSkillIds) {
      for (const subdir of ['skill-configs', 'skill-secrets']) {
        const sourcePath = path.join(snapshotRoot, 'roles', roleKey, subdir, `${skillId}.json`);
        const targetPath = path.join(path.resolve(userDataPath), 'roles', roleKey, subdir, `${skillId}.json`);
        if (copyIfMissing(sourcePath, targetPath)) {
          restoredPaths.push(targetPath);
        }
      }
    }
  }

  return restoredPaths;
}

export function recoverSkillBindingsFromRuntimeTruth(
  userDataPath: string,
  projectRoot: string,
  store: StoreLike,
  skillManager: Pick<SkillManager, 'listSkills'>,
): {
  recovered: boolean;
  reason: string;
  sourceRoot?: string;
  bindingsWritten: number;
  deletedArtifacts: string[];
  restoredArtifacts: string[];
} {
  const installedSkills = buildInstalledSkillMap(skillManager);
  const existingBindings = readExistingBindings(store);
  const validExistingBindings = existingBindings.filter((binding) => (
    binding.enabled && installedSkills.has(binding.skillId)
  ));

  if (validExistingBindings.length > 0) {
    return {
      recovered: false,
      reason: 'existing-valid-bindings',
      bindingsWritten: 0,
      deletedArtifacts: [],
      restoredArtifacts: [],
    };
  }

  const candidate = pickBestRecoveryCandidate(userDataPath, projectRoot, installedSkills);
  if (!candidate) {
    return {
      recovered: false,
      reason: 'no-recoverable-snapshot',
      bindingsWritten: 0,
      deletedArtifacts: [],
      restoredArtifacts: [],
    };
  }

  clearSkillBindings(store);
  insertRecoveredBindings(store, candidate.bindings);
  const restoredArtifacts = restoreBoundRoleSkillArtifacts(userDataPath, candidate.root, candidate.bindings);
  const deletedArtifacts = cleanupUnboundRoleSkillArtifacts(userDataPath, candidate.bindings);
  store.getSaveFunction()();

  return {
    recovered: true,
    reason: 'recovered-from-role-index-snapshot',
    sourceRoot: candidate.root,
    bindingsWritten: candidate.bindings.length,
    deletedArtifacts,
    restoredArtifacts,
  };
}
