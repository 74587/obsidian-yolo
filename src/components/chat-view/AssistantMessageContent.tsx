import React, { useCallback, useMemo } from 'react'

import { ChatAssistantMessage, ChatMessage } from '../../types/chat'
import {
  ParsedTagContent,
  parseTagContents,
} from '../../utils/chat/parse-tag-content'

import AssistantMessageReasoning from './AssistantMessageReasoning'
import MarkdownCodeComponent from './MarkdownCodeComponent'
import MarkdownReferenceBlock from './MarkdownReferenceBlock'
import { ObsidianMarkdown } from './ObsidianMarkdown'

export default function AssistantMessageContent({
  content,
  contextMessages,
  handleApply,
  isApplying,
  activeApplyRequestKey,
  generationState,
}: {
  content: ChatAssistantMessage['content']
  contextMessages: ChatMessage[]
  handleApply: (
    blockToApply: string,
    chatMessages: ChatMessage[],
    mode: 'quick' | 'precise',
    applyRequestKey: string,
  ) => void
  isApplying: boolean
  activeApplyRequestKey: string | null
  generationState?: 'streaming' | 'completed' | 'aborted'
}) {
  const onApply = useCallback(
    (
      blockToApply: string,
      mode: 'quick' | 'precise',
      applyRequestKey: string,
    ) => {
      handleApply(blockToApply, contextMessages, mode, applyRequestKey)
    },
    [handleApply, contextMessages],
  )

  return (
    <AssistantTextRenderer
      onApply={onApply}
      isApplying={isApplying}
      activeApplyRequestKey={activeApplyRequestKey}
      generationState={generationState}
    >
      {content}
    </AssistantTextRenderer>
  )
}

const AssistantTextRenderer = React.memo(function AssistantTextRenderer({
  onApply,
  isApplying,
  activeApplyRequestKey,
  generationState,
  children,
}: {
  onApply: (
    blockToApply: string,
    mode: 'quick' | 'precise',
    applyRequestKey: string,
  ) => void
  children: string
  isApplying: boolean
  activeApplyRequestKey: string | null
  generationState?: 'streaming' | 'completed' | 'aborted'
}) {
  const blocks: ParsedTagContent[] = useMemo(
    () => parseTagContents(children),
    [children],
  )

  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'string' ? (
          <div key={index}>
            <ObsidianMarkdown content={block.content} scale="sm" />
          </div>
        ) : block.type === 'think' ? (
          <AssistantMessageReasoning
            key={index}
            reasoning={block.content}
            content={children}
            generationState={generationState}
          />
        ) : block.startLine && block.endLine && block.filename ? (
          <MarkdownReferenceBlock
            key={index}
            filename={block.filename}
            startLine={block.startLine}
            endLine={block.endLine}
          />
        ) : (
          <MarkdownCodeComponent
            key={index}
            onApply={onApply}
            isApplying={isApplying}
            activeApplyRequestKey={activeApplyRequestKey}
            language={block.language}
            filename={block.filename}
          >
            {block.content}
          </MarkdownCodeComponent>
        ),
      )}
    </>
  )
})
