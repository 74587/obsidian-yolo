import { Assistant, AssistantSkillLoadMode } from '../../types/assistant.types'

export type ResolvedAssistantSkillPolicy = {
  enabled: boolean
  loadMode: AssistantSkillLoadMode
}

export function getDisabledSkillIdSet(
  disabledSkillIds?: string[],
): Set<string> {
  return new Set((disabledSkillIds ?? []).map((id) => id.trim()))
}

export function resolveAssistantSkillPolicy({
  assistant,
  skillId,
  defaultLoadMode,
}: {
  assistant: Assistant | null | undefined
  skillId: string
  defaultLoadMode?: AssistantSkillLoadMode
}): ResolvedAssistantSkillPolicy {
  const preference = assistant?.skillPreferences?.[skillId]
  void skillId
  const enabled = preference?.enabled ?? true
  const loadMode: AssistantSkillLoadMode =
    preference?.loadMode === 'always'
      ? 'always'
      : preference?.loadMode === 'lazy'
        ? 'lazy'
        : (defaultLoadMode ?? 'lazy')

  return {
    enabled,
    loadMode,
  }
}

export function isSkillEnabledForAssistant({
  assistant,
  skillId,
  disabledSkillIds,
  defaultLoadMode,
}: {
  assistant: Assistant | null | undefined
  skillId: string
  disabledSkillIds?: string[]
  defaultLoadMode?: AssistantSkillLoadMode
}): boolean {
  const disabledSet = getDisabledSkillIdSet(disabledSkillIds)
  if (disabledSet.has(skillId)) {
    return false
  }

  return resolveAssistantSkillPolicy({
    assistant,
    skillId,
    defaultLoadMode,
  }).enabled
}
