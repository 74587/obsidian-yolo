import { UseMutationResult, useMutation } from '@tanstack/react-query'
import { Notice, TFile } from 'obsidian'
import { useCallback, useRef } from 'react'

import { useApp } from '../../contexts/app-context'
import { useMcp } from '../../contexts/mcp-context'
import { usePlugin } from '../../contexts/plugin-context'
import { useSettings } from '../../contexts/settings-context'
import {
  LLMAPIKeyInvalidException,
  LLMAPIKeyNotSetException,
  LLMBaseUrlNotSetException,
  LLMModelNotFoundException,
} from '../../core/llm/exception'
import { getChatModelClient } from '../../core/llm/manager'
import { ChatMessage } from '../../types/chat'
import { ConversationOverrideSettings } from '../../types/conversation-settings.types'
import { PromptGenerator } from '../../utils/chat/promptGenerator'
import { ResponseGenerator } from '../../utils/chat/responseGenerator'
import { ErrorModal } from '../modals/ErrorModal'

import { ChatMode } from './chat-input/ChatModeSelect'
import { ReasoningLevel } from './chat-input/ReasoningSelect'

type UseChatStreamManagerParams = {
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  autoScrollToBottom: () => void
  promptGenerator: PromptGenerator
  conversationOverrides?: ConversationOverrideSettings
  modelId: string
  chatMode: ChatMode
  currentFileOverride?: TFile | null
}

export type UseChatStreamManager = {
  abortActiveStreams: () => void
  submitChatMutation: UseMutationResult<
    void,
    Error,
    {
      chatMessages: ChatMessage[]
      conversationId: string
      reasoningLevel?: ReasoningLevel
    }
  >
}

export function useChatStreamManager({
  setChatMessages,
  autoScrollToBottom,
  promptGenerator,
  conversationOverrides,
  modelId,
  chatMode,
  currentFileOverride,
}: UseChatStreamManagerParams): UseChatStreamManager {
  const app = useApp()
  const plugin = usePlugin()
  const { settings } = useSettings()
  const { getMcpManager } = useMcp()

  const activeStreamAbortControllersRef = useRef<AbortController[]>([])

  const abortActiveStreams = useCallback(() => {
    for (const abortController of activeStreamAbortControllersRef.current) {
      abortController.abort()
    }
    activeStreamAbortControllersRef.current = []
  }, [])

  const submitChatMutation = useMutation({
    mutationFn: async ({
      chatMessages,
      conversationId,
      reasoningLevel,
    }: {
      chatMessages: ChatMessage[]
      conversationId: string
      reasoningLevel?: ReasoningLevel
    }) => {
      const lastMessage = chatMessages.at(-1)
      if (!lastMessage) {
        // chatMessages is empty
        return
      }

      abortActiveStreams()
      const abortController = new AbortController()
      activeStreamAbortControllersRef.current.push(abortController)

      let unsubscribeRunner: (() => void) | undefined

      try {
        const selectedAssistant = settings.currentAssistantId
          ? (settings.assistants || []).find(
              (assistant) => assistant.id === settings.currentAssistantId,
            ) || null
          : null

        const requestedModelId =
          chatMode === 'agent' && selectedAssistant?.modelId
            ? selectedAssistant.modelId
            : modelId

        let resolvedClient: ReturnType<typeof getChatModelClient>
        try {
          resolvedClient = getChatModelClient({
            settings,
            modelId: requestedModelId,
          })
        } catch (error) {
          if (
            error instanceof LLMModelNotFoundException &&
            settings.chatModels.length > 0
          ) {
            resolvedClient = getChatModelClient({
              settings,
              modelId: settings.chatModels[0].id,
            })
          } else {
            throw error
          }
        }

        const assistantTemperature =
          chatMode === 'agent' ? selectedAssistant?.temperature : undefined
        const assistantTopP =
          chatMode === 'agent' ? selectedAssistant?.topP : undefined
        const assistantMaxTokens =
          chatMode === 'agent' ? selectedAssistant?.maxOutputTokens : undefined

        const mcpManager = await getMcpManager()
        const onRunnerMessages = (responseMessages: ChatMessage[]) => {
          setChatMessages((prevChatMessages) => {
            const lastMessageIndex = prevChatMessages.findIndex(
              (message) => message.id === lastMessage.id,
            )
            if (lastMessageIndex === -1) {
              // The last message no longer exists in the chat history.
              // This likely means a new message was submitted while this stream was running.
              // Abort this stream and keep the current chat history.
              abortController.abort()
              return prevChatMessages
            }
            return [
              ...prevChatMessages.slice(0, lastMessageIndex + 1),
              ...responseMessages,
            ]
          })
          autoScrollToBottom()
        }

        if (chatMode === 'agent') {
          const agentService = plugin.getAgentService()
          unsubscribeRunner = agentService.subscribe(
            conversationId,
            (state) => {
              onRunnerMessages(state.messages)
            },
            { emitCurrent: false },
          )
          await agentService.run({
            conversationId,
            loopConfig: {
              enableTools: selectedAssistant?.enableTools ?? true,
              maxAutoIterations: Math.max(
                8,
                settings.chatOptions.maxAutoIterations,
              ),
              includeBuiltinTools:
                selectedAssistant?.includeBuiltinTools ?? true,
            },
            input: {
              providerClient: resolvedClient.providerClient,
              model: resolvedClient.model,
              messages: chatMessages,
              conversationId,
              promptGenerator,
              mcpManager,
              abortSignal: abortController.signal,
              reasoningLevel,
              allowedToolNames: selectedAssistant?.enabledToolNames,
              requestParams: {
                stream: conversationOverrides?.stream ?? true,
                temperature:
                  conversationOverrides?.temperature ?? assistantTemperature,
                top_p: conversationOverrides?.top_p ?? assistantTopP,
                max_tokens: assistantMaxTokens,
              },
              maxContextOverride:
                conversationOverrides?.maxContextMessages ?? undefined,
              currentFileContextMode: 'summary',
              currentFileOverride,
              geminiTools: {
                useWebSearch: conversationOverrides?.useWebSearch ?? false,
                useUrlContext: conversationOverrides?.useUrlContext ?? false,
              },
            },
          })
        } else {
          const responseGenerator = new ResponseGenerator({
            providerClient: resolvedClient.providerClient,
            model: resolvedClient.model,
            messages: chatMessages,
            conversationId,
            enableTools: settings.chatOptions.enableTools,
            maxAutoIterations: settings.chatOptions.maxAutoIterations,
            includeBuiltinTools: false,
            promptGenerator,
            mcpManager,
            abortSignal: abortController.signal,
            reasoningLevel,
            requestParams: {
              stream: conversationOverrides?.stream ?? true,
              temperature: conversationOverrides?.temperature ?? undefined,
              top_p: conversationOverrides?.top_p ?? undefined,
            },
            maxContextOverride:
              conversationOverrides?.maxContextMessages ?? undefined,
            currentFileContextMode: 'full',
            currentFileOverride,
            geminiTools: {
              useWebSearch: conversationOverrides?.useWebSearch ?? false,
              useUrlContext: conversationOverrides?.useUrlContext ?? false,
            },
          })

          unsubscribeRunner = responseGenerator.subscribe(onRunnerMessages)
          await responseGenerator.run()
        }
      } catch (error) {
        // Ignore AbortError
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        throw error
      } finally {
        if (unsubscribeRunner) {
          unsubscribeRunner()
        }
        activeStreamAbortControllersRef.current =
          activeStreamAbortControllersRef.current.filter(
            (controller) => controller !== abortController,
          )
      }
    },
    onError: (error) => {
      if (
        error instanceof LLMAPIKeyNotSetException ||
        error instanceof LLMAPIKeyInvalidException ||
        error instanceof LLMBaseUrlNotSetException
      ) {
        new ErrorModal(app, 'Error', error.message, error.rawError?.message, {
          showSettingsButton: true,
        }).open()
      } else {
        new Notice(error.message)
        console.error('Failed to generate response', error)
      }
    },
  })

  return {
    abortActiveStreams,
    submitChatMutation,
  }
}
