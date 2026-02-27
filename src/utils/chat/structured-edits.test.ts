import { tryApplyStructuredEdits } from './structured-edits'

describe('tryApplyStructuredEdits', () => {
  it('applies SEARCH/REPLACE blocks and marks pure structured script', () => {
    const result = tryApplyStructuredEdits({
      rawEdits: `<<<<<<< SEARCH
line1
=======
line1-updated
>>>>>>> REPLACE`,
      originalContent: 'line1\nline2',
    })

    expect(result).not.toBeNull()
    expect(result?.appliedCount).toBe(1)
    expect(result?.newContent).toBe('line1-updated\nline2')
    expect(result?.isPureStructuredScript).toBe(true)
  })

  it('returns non-pure when structured edits are mixed with prose', () => {
    const result = tryApplyStructuredEdits({
      rawEdits: `Here is the patch:
<<<<<<< SEARCH
body
=======
new body
>>>>>>> REPLACE`,
      originalContent: 'body',
    })

    expect(result?.isPureStructuredScript).toBe(false)
    expect(result?.newContent).toBe('new body')
  })
})
