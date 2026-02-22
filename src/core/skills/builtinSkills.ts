import {
  YOLO_OBSIDIAN_OUTPUT_FORMAT_TEMPLATE,
  YOLO_SKILL_CREATOR_TEMPLATE,
} from './templates'

type BuiltinLiteSkill = {
  id: string
  name: string
  description: string
  mode: 'always' | 'lazy'
  path: string
  content: string
}

const BUILTIN_SKILLS: BuiltinLiteSkill[] = [
  {
    id: 'obsidian-output-format',
    name: 'Obsidian Output Format',
    description:
      'Enforce Obsidian markdown output contract with <smtcmp_block> tags. Use whenever returning markdown content, proposing markdown edits, or referencing markdown snippets.',
    mode: 'always',
    path: 'builtin://skills/obsidian-output-format.md',
    content: YOLO_OBSIDIAN_OUTPUT_FORMAT_TEMPLATE,
  },
  {
    id: 'skill-creator',
    name: 'Skill Creator',
    description:
      'Guide for creating effective YOLO skills. Use when users want to create a new skill, update an existing skill, or improve skill quality within their Obsidian vault. Covers skill design principles, anatomy, and the full creation workflow.',
    mode: 'lazy',
    path: 'builtin://skills/skill-creator.md',
    content: YOLO_SKILL_CREATOR_TEMPLATE,
  },
]

const normalize = (value?: string): string => value?.trim().toLowerCase() ?? ''

export const listBuiltinLiteSkills = (): BuiltinLiteSkill[] => {
  return BUILTIN_SKILLS.map((skill) => ({ ...skill }))
}

export const getBuiltinLiteSkillByIdOrName = ({
  id,
  name,
}: {
  id?: string
  name?: string
}): BuiltinLiteSkill | null => {
  const normalizedId = normalize(id)
  const normalizedName = normalize(name)
  if (!normalizedId && !normalizedName) {
    return null
  }

  const matched = BUILTIN_SKILLS.find((skill) => {
    if (normalizedId && normalize(skill.id) === normalizedId) {
      return true
    }
    if (normalizedName && normalize(skill.name) === normalizedName) {
      return true
    }
    return false
  })

  return matched ? { ...matched } : null
}
