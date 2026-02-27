/**
 * Edit block parser and applier for edit mode.
 *
 * Supports three formats:
 *
 * 1. CONTINUE - Append to end of document:
 * <<<<<<< CONTINUE
 * =======
 * [content to append]
 * >>>>>>> CONTINUE
 *
 * 2. REPLACE - Replace existing text:
 * <<<<<<< SEARCH
 * [exact text to find]
 * =======
 * [replacement text]
 * >>>>>>> REPLACE
 *
 * 3. INSERT AFTER - Insert after specific text:
 * <<<<<<< INSERT AFTER
 * [exact text to find]
 * =======
 * [content to insert]
 * >>>>>>> INSERT
 */

export type EditBlockType = 'continue' | 'replace' | 'insert'

export type SearchReplaceBlock = {
  type: EditBlockType
  search: string // empty for 'continue'
  replace: string
}

export type ApplyResult = {
  newContent: string
  errors: string[]
  appliedCount: number
}

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const toLooseCharPattern = (char: string): string => {
  if (char === '"' || char === '“' || char === '”') {
    return '["“”]'
  }
  if (char === "'" || char === '‘' || char === '’') {
    return "['‘’]"
  }
  if (char === '-' || char === '–' || char === '—') {
    return '[-–—]'
  }
  return escapeRegExp(char)
}

const createLooseSearchRegex = (searchText: string): RegExp => {
  const lines = searchText.split(/\r?\n/)
  const pattern = lines
    .map((line, index) => {
      const normalizedLine = line.replace(/[ \t]+$/g, '')
      const charPattern = Array.from(normalizedLine)
        .map((char) => toLooseCharPattern(char))
        .join('')
      const lineEndPattern = '[ \\t]*'
      if (index === lines.length - 1) {
        return `${charPattern}${lineEndPattern}`
      }
      return `${charPattern}${lineEndPattern}\\r?\\n`
    })
    .join('')
  return new RegExp(pattern, 'g')
}

const findSingleLooseMatch = (
  content: string,
  searchText: string,
): { start: number; end: number } | 'multiple' | null => {
  const regex = createLooseSearchRegex(searchText)
  const first = regex.exec(content)
  if (!first || first.index < 0) {
    return null
  }

  const second = regex.exec(content)
  if (second) {
    return 'multiple'
  }

  return {
    start: first.index,
    end: first.index + first[0].length,
  }
}

const STRUCTURED_EDIT_BLOCK_PATTERN =
  /<<<<<<<\s*(?:CONTINUE|SEARCH|INSERT AFTER)\s*\n[\s\S]*?\n=======\s*\n[\s\S]*?\n>>>>>>>\s*(?:CONTINUE|REPLACE|INSERT)\s*(?=\n|$)/gi

/**
 * Parse edit blocks from model output.
 *
 * Supports CONTINUE, REPLACE (SEARCH), and INSERT AFTER formats.
 *
 * @param content - The raw model output containing edit blocks
 * @returns Array of parsed blocks
 */
export function parseSearchReplaceBlocks(
  content: string,
): SearchReplaceBlock[] {
  const blocks: SearchReplaceBlock[] = []

  const source = content.replace(/\r\n/g, '\n')

  // Match CONTINUE blocks
  // Pattern: <<<<<<< CONTINUE\n=======\n...\n>>>>>>> CONTINUE
  const continuePattern =
    /^<<<<<<<\s*CONTINUE\s*\n=======\s*\n([\s\S]*?)\n>>>>>>>\s*CONTINUE\s*$/gim
  let match = continuePattern.exec(source)
  while (match !== null) {
    blocks.push({
      type: 'continue',
      search: '',
      replace: match[1],
    })
    match = continuePattern.exec(source)
  }

  // Match INSERT AFTER blocks
  // Pattern: <<<<<<< INSERT AFTER\n...\n=======\n...\n>>>>>>> INSERT
  const insertPattern =
    /^<<<<<<<\s*INSERT AFTER\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>>\s*INSERT\s*$/gim
  match = insertPattern.exec(source)
  while (match !== null) {
    blocks.push({
      type: 'insert',
      search: match[1],
      replace: match[2],
    })
    match = insertPattern.exec(source)
  }

  // Match SEARCH/REPLACE blocks
  // Pattern: <<<<<<< SEARCH\n...\n=======\n...\n>>>>>>> REPLACE
  const replacePattern =
    /^<<<<<<<\s*SEARCH\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>>\s*REPLACE\s*$/gim
  match = replacePattern.exec(source)
  while (match !== null) {
    blocks.push({
      type: 'replace',
      search: match[1],
      replace: match[2],
    })
    match = replacePattern.exec(source)
  }

  return blocks
}

/**
 * Apply edit blocks to original content.
 *
 * Blocks are applied sequentially. Each subsequent block operates on
 * the result of the previous operation.
 *
 * Supports three types:
 * - 'continue': Append content to the end
 * - 'insert': Insert content after specified text
 * - 'replace': Replace specified text
 *
 * @param originalContent - The original document content
 * @param blocks - Array of edit blocks to apply
 * @returns Object containing new content, errors, and count of applied blocks
 */
export function applySearchReplaceBlocks(
  originalContent: string,
  blocks: SearchReplaceBlock[],
): ApplyResult {
  let content = originalContent
  const errors: string[] = []
  let appliedCount = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Handle CONTINUE: append to end of document
    if (block.type === 'continue') {
      // Add newlines if content doesn't end with one
      const separator = content.endsWith('\n') ? '\n' : '\n\n'
      content = content + separator + block.replace
      appliedCount++
      continue
    }

    const searchText = block.search

    // Handle INSERT: insert after specified text
    if (block.type === 'insert') {
      if (content.includes(searchText)) {
        // Insert after the found text
        content = content.replace(
          searchText,
          searchText + '\n\n' + block.replace,
        )
        appliedCount++
      } else {
        const looseMatch = findSingleLooseMatch(content, searchText)
        if (looseMatch && looseMatch !== 'multiple') {
          content =
            content.slice(0, looseMatch.end) +
            '\n\n' +
            block.replace +
            content.slice(looseMatch.end)
          appliedCount++
        } else {
          const preview =
            searchText.length > 50
              ? searchText.substring(0, 50) + '...'
              : searchText
          if (looseMatch === 'multiple') {
            errors.push(
              `Block ${i + 1} (INSERT): Found multiple loose matches for: "${preview}"`,
            )
          } else {
            errors.push(
              `Block ${i + 1} (INSERT): Could not find text to insert after: "${preview}"`,
            )
          }
        }
      }
      continue
    }

    // Handle REPLACE: replace existing text
    if (block.type === 'replace') {
      if (content.includes(searchText)) {
        // Replace only the first occurrence
        content = content.replace(searchText, block.replace)
        appliedCount++
      } else {
        const looseMatch = findSingleLooseMatch(content, searchText)
        if (looseMatch && looseMatch !== 'multiple') {
          content =
            content.slice(0, looseMatch.start) +
            block.replace +
            content.slice(looseMatch.end)
          appliedCount++
        } else {
          // Record error with preview of search text
          const preview =
            searchText.length > 50
              ? searchText.substring(0, 50) + '...'
              : searchText
          if (looseMatch === 'multiple') {
            errors.push(
              `Block ${i + 1} (REPLACE): Found multiple loose matches for: "${preview}"`,
            )
          } else {
            errors.push(
              `Block ${i + 1} (REPLACE): Could not find text to replace: "${preview}"`,
            )
          }
        }
      }
    }
  }

  return {
    newContent: content,
    errors,
    appliedCount,
  }
}

/**
 * Validate that the model output contains valid edit blocks.
 *
 * @param content - The raw model output
 * @returns true if at least one valid block is found
 */
export function hasValidSearchReplaceBlocks(content: string): boolean {
  return parseSearchReplaceBlocks(content).length > 0
}

export function isPureSearchReplaceScript(content: string): boolean {
  const normalized = content.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return false
  }

  const withoutBlocks = normalized
    .replace(STRUCTURED_EDIT_BLOCK_PATTERN, '')
    .trim()

  return withoutBlocks.length === 0
}
