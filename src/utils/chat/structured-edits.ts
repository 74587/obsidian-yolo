import {
  applySearchReplaceBlocks,
  isPureSearchReplaceScript,
  parseSearchReplaceBlocks,
  SearchReplaceBlock,
} from './searchReplace'

export type StructuredEditApplyResult = {
  blocks: SearchReplaceBlock[]
  newContent: string
  errors: string[]
  appliedCount: number
  isPureStructuredScript: boolean
}

export const tryApplyStructuredEdits = ({
  rawEdits,
  originalContent,
}: {
  rawEdits: string
  originalContent: string
}): StructuredEditApplyResult | null => {
  const blocks = parseSearchReplaceBlocks(rawEdits)
  const isPureStructuredScript = isPureSearchReplaceScript(rawEdits)
  if (blocks.length === 0) {
    return null
  }

  const { newContent, errors, appliedCount } = applySearchReplaceBlocks(
    originalContent,
    blocks,
  )

  return {
    blocks,
    newContent,
    errors,
    appliedCount,
    isPureStructuredScript,
  }
}
