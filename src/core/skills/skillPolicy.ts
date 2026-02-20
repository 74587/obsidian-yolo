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
}: {
  assistant: Assistant | null | undefined
  skillId: string
}): ResolvedAssistantSkillPolicy {
  const preference = assistant?.skillPreferences?.[skillId]
  void skillId
  const enabled = preference?.enabled ?? true
  const loadMode: AssistantSkillLoadMode =
    preference?.loadMode === 'always' ? 'always' : 'lazy'

  return {
    enabled,
    loadMode,
  }
}

export function isSkillEnabledForAssistant({
  assistant,
  skillId,
  disabledSkillIds,
}: {
  assistant: Assistant | null | undefined
  skillId: string
  disabledSkillIds?: string[]
}): boolean {
  const disabledSet = getDisabledSkillIdSet(disabledSkillIds)
  if (disabledSet.has(skillId)) {
    return false
  }

  return resolveAssistantSkillPolicy({
    assistant,
    skillId,
  }).enabled
}
