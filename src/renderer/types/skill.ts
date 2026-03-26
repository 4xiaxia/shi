// Skill type definition
export interface Skill {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  enabled: boolean;       // Whether visible in popover
  isOfficial: boolean;    // "官方" badge
  isBuiltIn: boolean;     // Bundled with app, cannot be deleted
  updatedAt: number;      // Timestamp
  prompt: string;         // System prompt content
  skillPath: string;      // Absolute path to SKILL.md
  version?: string;       // Skill version from SKILL.md frontmatter
  sourceType?: 'user' | 'claude' | 'bundled';
  sourceRoot?: string;
  category?: string;
  tags?: string[];
}

export type LocalizedText = { en: string; zh: string };

export interface MarketTag {
  id: string;
  en: string;
  zh: string;
}

export interface LocalSkillInfo {
  id: string;
  name: string;
  description: string | LocalizedText;
  version: string;
}

export interface MarketplaceSkill {
  id: string;
  name: string;
  description: string | LocalizedText;
  tags?: string[];
  url: string;              // Download URL (zip or raw SKILL.md)
  version: string;
  source: {
    from: string;           // e.g. "Github"
    url: string;            // Source repo URL
    author?: string;        // Author name
  };
  stars?: number;           // GitHub stars
  repo?: string;            // GitHub owner/repo
  category?: string;        // Primary category
  featured?: boolean;       // Featured in registry
}

export interface UploadedSkillFileEntry {
  relativePath: string;
  dataUrl: string;
}

export type UploadedSkillPayload =
  | {
      kind: 'zip';
      fileName: string;
      dataUrl: string;
      displayName?: string;
    }
  | {
      kind: 'file';
      fileName: string;
      dataUrl: string;
      displayName?: string;
    }
  | {
      kind: 'folder';
      folderName: string;
      files: UploadedSkillFileEntry[];
      displayName?: string;
    };

export function getSkillDisplayName(skill: Pick<Skill, 'name' | 'displayName'>): string {
  return skill.displayName?.trim() || skill.name;
}

export function getSkillFilterLabels(skill: Pick<Skill, 'category' | 'tags'>): string[] {
  const labels = new Set<string>();
  if (skill.category?.trim()) {
    labels.add(skill.category.trim());
  }
  for (const tag of skill.tags ?? []) {
    const normalized = tag.trim();
    if (normalized) {
      labels.add(normalized);
    }
  }
  if (labels.size === 0) {
    labels.add('未分类');
  }
  return Array.from(labels);
}
