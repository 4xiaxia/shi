import fs from 'fs';
import path from 'path';

export type JsonRecord = Record<string, unknown>;

export function asJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

export function readJsonRecordIfExists(filePath: string): JsonRecord | null {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
      return null;
    }
    return asJsonRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getSharedSkillSecretsRoot(userDataPath: string): string {
  return path.join(path.resolve(userDataPath), 'shared-skill-secrets');
}

export function getSharedSkillSecretPath(userDataPath: string, skillId: string): string {
  return path.join(getSharedSkillSecretsRoot(userDataPath), `${skillId}.json`);
}

export function getRoleSkillSecretsRootFromRuntime(userDataPath: string, roleKey: string): string {
  return path.join(path.resolve(userDataPath), 'roles', roleKey, 'skill-secrets');
}

export function getRoleSkillSecretPathFromRuntime(userDataPath: string, roleKey: string, skillId: string): string {
  return path.join(getRoleSkillSecretsRootFromRuntime(userDataPath, roleKey), `${skillId}.json`);
}
