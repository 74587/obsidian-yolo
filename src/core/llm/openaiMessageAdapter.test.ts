import { RequestMessage } from '../../types/llm/request'

import { OpenAIMessageAdapter } from './openaiMessageAdapter'

class TestableOpenAIMessageAdapter extends OpenAIMessageAdapter {
  public parseRequestMessageForTest(message: RequestMessage) {
    return this.parseRequestMessage(message)
  }
}

describe('OpenAIMessageAdapter', () => {
  it('normalizes malformed assistant tool arguments to an empty object', () => {
    const adapter = new TestableOpenAIMessageAdapter()
    const message: RequestMessage = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'toolu_123',
          name: 'yolo_local__fs_edit',
          arguments: '{"path":"note.md","newText":"He said "ok""}',
        },
      ],
    }

    const parsed = adapter.parseRequestMessageForTest(message)
    expect(parsed.role).toBe('assistant')
    if (!('tool_calls' in parsed) || !parsed.tool_calls?.length) {
      throw new Error('Expected assistant tool calls in parsed message')
    }

    expect(parsed.tool_calls[0].function.arguments).toBe('{}')
  })

  it('keeps valid assistant tool arguments as JSON object text', () => {
    const adapter = new TestableOpenAIMessageAdapter()
    const message: RequestMessage = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'toolu_456',
          name: 'yolo_local__fs_edit',
          arguments: '{"path":"note.md","oldText":"foo","newText":"bar"}',
        },
      ],
    }

    const parsed = adapter.parseRequestMessageForTest(message)
    expect(parsed.role).toBe('assistant')
    if (!('tool_calls' in parsed) || !parsed.tool_calls?.length) {
      throw new Error('Expected assistant tool calls in parsed message')
    }

    expect(JSON.parse(parsed.tool_calls[0].function.arguments)).toEqual({
      path: 'note.md',
      oldText: 'foo',
      newText: 'bar',
    })
  })
})
