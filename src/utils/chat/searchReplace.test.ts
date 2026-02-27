import {
  applySearchReplaceBlocks,
  isPureSearchReplaceScript,
  parseSearchReplaceBlocks,
} from './searchReplace'

describe('parseSearchReplaceBlocks', () => {
  it('parses SEARCH/REPLACE blocks with CRLF line endings', () => {
    const input = [
      '<<<<<<< SEARCH\r\n',
      'old text\r\n',
      '=======\r\n',
      'new text\r\n',
      '>>>>>>> REPLACE\r\n',
    ].join('')

    const blocks = parseSearchReplaceBlocks(input)
    expect(blocks).toEqual([
      {
        type: 'replace',
        search: 'old text',
        replace: 'new text',
      },
    ])
  })

  it('parses lowercase markers with extra spacing', () => {
    const input = `<<<<<<<   search
target
=======
replacement
>>>>>>>   replace`

    const blocks = parseSearchReplaceBlocks(input)
    expect(blocks).toEqual([
      {
        type: 'replace',
        search: 'target',
        replace: 'replacement',
      },
    ])
  })

  it('recognizes pure structured edit scripts', () => {
    const input = `<<<<<<< SEARCH
foo
=======
bar
>>>>>>> REPLACE`

    expect(isPureSearchReplaceScript(input)).toBe(true)
  })

  it('rejects mixed content around structured edit scripts', () => {
    const input = `Here is an example:
<<<<<<< SEARCH
foo
=======
bar
>>>>>>> REPLACE`

    expect(isPureSearchReplaceScript(input)).toBe(false)
  })
})

describe('applySearchReplaceBlocks', () => {
  it('supports loose matching for quote variants', () => {
    const original = '程序如“逻辑理论家”和“通用问题解决器”证明了机器能力。'
    const blocks = [
      {
        type: 'replace' as const,
        search: '程序如"逻辑理论家"和"通用问题解决器"证明了机器能力。',
        replace:
          'Programs like "Logic Theorist" and "General Problem Solver" proved machine capability.',
      },
    ]

    const result = applySearchReplaceBlocks(original, blocks)
    expect(result.appliedCount).toBe(1)
    expect(result.errors).toEqual([])
    expect(result.newContent).toContain('Logic Theorist')
  })

  it('fails when loose matching finds multiple candidates', () => {
    const original = 'foo “bar” baz\nfoo ”bar“ baz'
    const blocks = [
      {
        type: 'replace' as const,
        search: 'foo "bar" baz',
        replace: 'changed',
      },
    ]

    const result = applySearchReplaceBlocks(original, blocks)
    expect(result.appliedCount).toBe(0)
    expect(result.errors[0]).toContain('multiple loose matches')
  })
})
