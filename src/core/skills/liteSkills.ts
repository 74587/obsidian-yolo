import { App, TFile } from 'obsidian'

import {
  getBuiltinLiteSkillByIdOrName,
  listBuiltinLiteSkills,
} from './builtinSkills'

export type LiteSkillMode = 'lazy' | 'always'

export type LiteSkillEntry = {
  id: string
  name: string
  description: string
  mode: LiteSkillMode
  path: string
}

export type LiteSkillDocument = {
  entry: LiteSkillEntry
  content: string
}

const SKILL_DIR_PREFIX = 'YOLO/skills/'
const SKILL_INDEX_FILE_NAME = 'Skills.md'

const normalizeSkillMode = (value: unknown): LiteSkillMode => {
  if (typeof value !== 'string') {
    return 'lazy'
  }
  return value.trim().toLowerCase() === 'always' ? 'always' : 'lazy'
}

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const getFallbackSkillId = (file: TFile): string => {
  const basename = file.basename
  if (basename.endsWith('.skill')) {
    return basename.slice(0, -'.skill'.length)
  }
  return basename
}

const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

const parseFrontmatterFromContent = (
  content: string,
): Record<string, string> | null => {
  if (!content.startsWith('---\n')) {
    return null
  }

  const closingIndex = content.indexOf('\n---\n', 4)
  if (closingIndex === -1) {
    return null
  }

  const frontmatterText = content.slice(4, closingIndex)
  const lines = frontmatterText.split('\n')
  const frontmatter: Record<string, string> = {}

  for (const line of lines) {
    const matched = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.+)$/)
    if (!matched) {
      continue
    }
    const key = matched[1]
    const value = stripWrappingQuotes(matched[2])
    frontmatter[key] = value
  }

  return frontmatter
}

const toLiteSkillEntry = ({
  file,
  frontmatter,
}: {
  file: TFile
  frontmatter?: Record<string, unknown> | null
}): LiteSkillEntry => {
  const fallbackId = getFallbackSkillId(file)
  const id = asTrimmedString(frontmatter?.id) ?? fallbackId
  const name = asTrimmedString(frontmatter?.name) ?? id
  const description =
    asTrimmedString(frontmatter?.description) ?? 'No description provided.'
  const mode = normalizeSkillMode(frontmatter?.mode)

  return {
    id,
    name,
    description,
    mode,
    path: file.path,
  }
}

const isLiteSkillFile = (file: TFile): boolean => {
  return (
    file.path.startsWith(SKILL_DIR_PREFIX) &&
    file.extension === 'md' &&
    file.name !== SKILL_INDEX_FILE_NAME
  )
}

export function listLiteSkillEntries(app: App): LiteSkillEntry[] {
  const files = app.vault
    .getMarkdownFiles()
    .filter((file) => isLiteSkillFile(file))
    .sort((a, b) => a.path.localeCompare(b.path))

  const mergedById = new Map<string, LiteSkillEntry>()

  listBuiltinLiteSkills().forEach((skill) => {
    mergedById.set(skill.id, {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      mode: skill.mode,
      path: skill.path,
    })
  })

  files.forEach((file) => {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter
    const entry = toLiteSkillEntry({
      file,
      frontmatter: frontmatter ?? null,
    })
    // Vault skill with the same id overrides builtin skill.
    mergedById.set(entry.id, entry)
  })

  return [...mergedById.values()].sort((a, b) => a.path.localeCompare(b.path))
}

const findLiteSkillFile = ({
  app,
  id,
  name,
}: {
  app: App
  id?: string
  name?: string
}): TFile | null => {
  const normalizedId = id?.trim().toLowerCase()
  const normalizedName = name?.trim().toLowerCase()
  if (!normalizedId && !normalizedName) {
    return null
  }

  const files = app.vault
    .getMarkdownFiles()
    .filter((file) => isLiteSkillFile(file))
    .sort((a, b) => a.path.localeCompare(b.path))

  for (const file of files) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter
    const entry = toLiteSkillEntry({
      file,
      frontmatter: frontmatter ?? null,
    })
    if (normalizedId && entry.id.toLowerCase() === normalizedId) {
      return file
    }
    if (normalizedName && entry.name.toLowerCase() === normalizedName) {
      return file
    }
  }

  return null
}

export async function getLiteSkillDocument({
  app,
  id,
  name,
}: {
  app: App
  id?: string
  name?: string
}): Promise<LiteSkillDocument | null> {
  const file = findLiteSkillFile({ app, id, name })
  if (file) {
    const content = await app.vault.cachedRead(file)
    const parsedFrontmatter = parseFrontmatterFromContent(content)
    const entry = toLiteSkillEntry({
      file,
      frontmatter: parsedFrontmatter,
    })

    return {
      entry,
      content,
    }
  }

  const builtin = getBuiltinLiteSkillByIdOrName({
    id,
    name,
  })
  if (!builtin) {
    return null
  }

  return {
    entry: {
      id: builtin.id,
      name: builtin.name,
      description: builtin.description,
      mode: builtin.mode,
      path: builtin.path,
    },
    content: builtin.content,
  }
}
