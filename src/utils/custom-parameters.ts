import {
  CustomParameter,
  CustomParameterType,
} from '../types/custom-parameter.types'

export const DEFAULT_CUSTOM_PARAMETER_TYPE: CustomParameterType = 'text'

export function normalizeCustomParameterType(
  value: string | undefined,
): CustomParameterType {
  if (
    value === 'text' ||
    value === 'number' ||
    value === 'boolean' ||
    value === 'json'
  ) {
    return value
  }
  return DEFAULT_CUSTOM_PARAMETER_TYPE
}

export function sanitizeCustomParameters(
  entries: Array<Pick<CustomParameter, 'key' | 'value'> & { type?: string }>,
): CustomParameter[] {
  return entries
    .map((entry) => ({
      key: entry.key.trim(),
      value: entry.value,
      type: normalizeCustomParameterType(entry.type),
    }))
    .filter((entry) => entry.key.length > 0)
}

export function mergeCustomParameters(
  base: CustomParameter[] | undefined,
  override: CustomParameter[] | undefined,
): CustomParameter[] | undefined {
  const merged = new Map<string, CustomParameter>()

  ;(base ?? []).forEach((entry) => {
    const key = entry.key.trim()
    if (!key) return
    merged.set(key, {
      ...entry,
      key,
      type: normalizeCustomParameterType(entry.type),
    })
  })
  ;(override ?? []).forEach((entry) => {
    const key = entry.key.trim()
    if (!key) return
    merged.set(key, {
      ...entry,
      key,
      type: normalizeCustomParameterType(entry.type),
    })
  })

  if (merged.size === 0) {
    return undefined
  }
  return [...merged.values()]
}

export function parseCustomParameterValue(raw: string, type?: string): unknown {
  const normalizedType = normalizeCustomParameterType(type)
  const trimmed = raw.trim()

  if (normalizedType === 'text') {
    return trimmed
  }

  if (trimmed.length === 0) {
    return raw
  }

  if (normalizedType === 'number') {
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : raw
  }

  if (normalizedType === 'boolean') {
    const lower = trimmed.toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false
    return raw
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}
