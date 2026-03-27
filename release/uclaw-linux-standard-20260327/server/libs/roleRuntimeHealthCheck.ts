import fs from 'fs';
import path from 'path';
import { AGENT_ROLE_ORDER, type AgentRoleKey } from '../../src/shared/agentRoleConfig';
import { getRoleCapabilitySnapshotPath, getRoleNotesPath, getRolePitfallsPath } from './roleRuntimeViews';
import { getRoleRoot, getRoleSkillsIndexPath } from './roleSkillFiles';

type RuntimeTrackedFileKey =
  | 'roleSettings'
  | 'skillsIndex'
  | 'capabilitySnapshot'
  | 'roleNotes'
  | 'pitfalls';

export type RoleRuntimeFileCheck = {
  key: RuntimeTrackedFileKey;
  label: string;
  filename: string;
  expectedPath: string;
  exists: boolean;
  uniqueInRuntime: boolean;
  filenameExpectedCount: number;
  filenameActualCount: number;
  activePaths: string[];
  unexpectedActiveCopies: string[];
};

export type RoleRuntimeFileHealth = {
  roleKey: AgentRoleKey;
  status: 'ok' | 'warning';
  warnings: string[];
  checks: RoleRuntimeFileCheck[];
};

export type RuntimeTrackedFilenameSummary = {
  filename: string;
  expectedCount: number;
  actualCount: number;
  status: 'ok' | 'warning';
  activePaths: string[];
  unexpectedPaths: string[];
};

export type RoleRuntimeHealthCheckResult = {
  runtimeRoot: string;
  generatedAt: number;
  status: 'ok' | 'warning';
  warnings: string[];
  roles: Record<AgentRoleKey, RoleRuntimeFileHealth>;
  filenameSummaries: RuntimeTrackedFilenameSummary[];
};

type RuntimeTrackedFileSpec = {
  key: RuntimeTrackedFileKey;
  label: string;
  filename: string;
  getExpectedPath: (userDataPath: string, roleKey: AgentRoleKey) => string;
};

const TRACKED_FILE_SPECS: RuntimeTrackedFileSpec[] = [
  {
    key: 'roleSettings',
    label: '角色设定视图',
    filename: 'role-settings.json',
    getExpectedPath: (userDataPath, roleKey) => path.join(getRoleRoot(userDataPath, roleKey), 'role-settings.json'),
  },
  {
    key: 'skillsIndex',
    label: '角色技能索引',
    filename: 'skills.json',
    getExpectedPath: getRoleSkillsIndexPath,
  },
  {
    key: 'capabilitySnapshot',
    label: '角色能力快照',
    filename: 'role-capabilities.json',
    getExpectedPath: getRoleCapabilitySnapshotPath,
  },
  {
    key: 'roleNotes',
    label: '角色笔记',
    filename: 'role-notes.md',
    getExpectedPath: getRoleNotesPath,
  },
  {
    key: 'pitfalls',
    label: '踩坑笔记',
    filename: 'pitfalls.md',
    getExpectedPath: getRolePitfallsPath,
  },
];

function normalizePathForCompare(targetPath: string): string {
  return path.normalize(path.resolve(targetPath)).toLowerCase();
}

function collectTrackedFiles(rootDir: string, trackedNames: Set<string>): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const filename of trackedNames) {
    found.set(filename, []);
  }

  const walk = (currentDir: string): void => {
    if (!fs.existsSync(currentDir) || !fs.statSync(currentDir).isDirectory()) {
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !trackedNames.has(entry.name)) {
        continue;
      }
      found.get(entry.name)?.push(path.resolve(fullPath));
    }
  };

  walk(rootDir);
  return found;
}

function buildAllowedPathMap(userDataPath: string): Map<string, string[]> {
  const allowedPathMap = new Map<string, string[]>();
  for (const spec of TRACKED_FILE_SPECS) {
    allowedPathMap.set(
      spec.filename,
      AGENT_ROLE_ORDER.map((roleKey) => path.resolve(spec.getExpectedPath(userDataPath, roleKey))),
    );
  }
  return allowedPathMap;
}

export function runRoleRuntimeHealthCheck(userDataPath: string): RoleRuntimeHealthCheckResult {
  const runtimeRoot = path.resolve(userDataPath);
  const allowedPathMap = buildAllowedPathMap(runtimeRoot);
  const trackedNames = new Set(TRACKED_FILE_SPECS.map((spec) => spec.filename));
  const activeFilesByName = collectTrackedFiles(runtimeRoot, trackedNames);

  const filenameSummaries: RuntimeTrackedFilenameSummary[] = TRACKED_FILE_SPECS.map((spec) => {
    const activePaths = activeFilesByName.get(spec.filename) ?? [];
    const allowedPaths = allowedPathMap.get(spec.filename) ?? [];
    const allowedPathKeys = new Set(allowedPaths.map(normalizePathForCompare));
    const unexpectedPaths = activePaths.filter((filePath) => !allowedPathKeys.has(normalizePathForCompare(filePath)));
    const actualCount = activePaths.length;
    const expectedCount = AGENT_ROLE_ORDER.length;
    return {
      filename: spec.filename,
      expectedCount,
      actualCount,
      status: actualCount === expectedCount && unexpectedPaths.length === 0 ? 'ok' : 'warning',
      activePaths,
      unexpectedPaths,
    };
  });

  const globalWarnings: string[] = [];
  for (const summary of filenameSummaries) {
    if (summary.actualCount !== summary.expectedCount) {
      globalWarnings.push(
        `运行时文件计数异常：${summary.filename} 期望 ${summary.expectedCount} 份，实际 ${summary.actualCount} 份。`
      );
    }
    for (const unexpectedPath of summary.unexpectedPaths) {
      globalWarnings.push(`运行时发现多余活文件：${unexpectedPath}`);
    }
  }

  const roles = {} as Record<AgentRoleKey, RoleRuntimeFileHealth>;
  for (const roleKey of AGENT_ROLE_ORDER) {
    const checks: RoleRuntimeFileCheck[] = TRACKED_FILE_SPECS.map((spec) => {
      const expectedPath = path.resolve(spec.getExpectedPath(runtimeRoot, roleKey));
      const expectedPathKey = normalizePathForCompare(expectedPath);
      const activePaths = activeFilesByName.get(spec.filename) ?? [];
      const allowedPaths = allowedPathMap.get(spec.filename) ?? [];
      const allowedPathKeys = new Set(allowedPaths.map(normalizePathForCompare));
      const unexpectedActiveCopies = activePaths.filter((filePath) => !allowedPathKeys.has(normalizePathForCompare(filePath)));
      const exists = activePaths.some((filePath) => normalizePathForCompare(filePath) === expectedPathKey);
      const filenameExpectedCount = AGENT_ROLE_ORDER.length;
      const filenameActualCount = activePaths.length;
      const uniqueInRuntime = exists && filenameActualCount === filenameExpectedCount && unexpectedActiveCopies.length === 0;

      return {
        key: spec.key,
        label: spec.label,
        filename: spec.filename,
        expectedPath,
        exists,
        uniqueInRuntime,
        filenameExpectedCount,
        filenameActualCount,
        activePaths,
        unexpectedActiveCopies,
      };
    });

    const warnings: string[] = [];
    for (const check of checks) {
      if (!check.exists) {
        warnings.push(`缺少 ${check.label}：${check.expectedPath}`);
      }
      if (!check.uniqueInRuntime) {
        warnings.push(
          `${check.label} 的活链唯一性异常：${check.filename} 期望 ${check.filenameExpectedCount} 份，实际 ${check.filenameActualCount} 份。`
        );
      }
      for (const unexpectedPath of check.unexpectedActiveCopies) {
        warnings.push(`${check.label} 存在额外活文件：${unexpectedPath}`);
      }
    }

    roles[roleKey] = {
      roleKey,
      status: warnings.length > 0 ? 'warning' : 'ok',
      warnings: Array.from(new Set(warnings)),
      checks,
    };
  }

  return {
    runtimeRoot,
    generatedAt: Date.now(),
    status: globalWarnings.length > 0 ? 'warning' : 'ok',
    warnings: Array.from(new Set(globalWarnings)),
    roles,
    filenameSummaries,
  };
}

export function getRoleRuntimeFileHealth(
  result: RoleRuntimeHealthCheckResult,
  roleKey: AgentRoleKey,
): RoleRuntimeFileHealth {
  return result.roles[roleKey];
}
