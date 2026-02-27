import { Check, CopyIcon, Loader2, Play } from 'lucide-react'
import { PropsWithChildren, useId, useMemo, useState } from 'react'

import { useApp } from '../../contexts/app-context'
import { useLanguage } from '../../contexts/language-context'
import {
  isPureSearchReplaceScript,
  parseSearchReplaceBlocks,
} from '../../utils/chat/searchReplace'
import { openMarkdownFile } from '../../utils/obsidian'

import { ObsidianMarkdown } from './ObsidianMarkdown'

export default function MarkdownCodeComponent({
  onApply,
  isApplying,
  activeApplyRequestKey,
  language,
  filename,
  children,
}: PropsWithChildren<{
  onApply: (
    blockToApply: string,
    mode: 'quick' | 'precise',
    applyRequestKey: string,
  ) => void
  isApplying: boolean
  activeApplyRequestKey: string | null
  language?: string
  filename?: string
}>) {
  const app = useApp()
  const { t } = useLanguage()
  const applyRequestKeyBase = useId()

  const [copied, setCopied] = useState(false)
  const quickApplyRequestKey = `${applyRequestKeyBase}:quick`
  const preciseApplyRequestKey = `${applyRequestKeyBase}:precise`
  const isQuickApplying =
    isApplying && activeApplyRequestKey === quickApplyRequestKey
  const isPreciseApplying =
    isApplying && activeApplyRequestKey === preciseApplyRequestKey

  const codeContent = useMemo(() => {
    if (typeof children === 'string') {
      return children
    }
    if (typeof children === 'number' || typeof children === 'boolean') {
      return String(children)
    }
    if (Array.isArray(children)) {
      return children
        .map((child) => {
          if (typeof child === 'string') return child
          if (typeof child === 'number' || typeof child === 'boolean') {
            return String(child)
          }
          if (child && typeof child === 'object' && 'props' in child) {
            const nested = (child as { props?: { children?: unknown } }).props
              ?.children
            return typeof nested === 'string' ? nested : ''
          }
          return ''
        })
        .join('')
    }
    if (children && typeof children === 'object' && 'props' in children) {
      const nested = (children as { props?: { children?: unknown } }).props
        ?.children
      if (typeof nested === 'string') {
        return nested
      }
    }
    return ''
  }, [children])

  const previewContent = useMemo(() => {
    if (!filename || !isPureSearchReplaceScript(codeContent)) {
      return codeContent
    }

    const blocks = parseSearchReplaceBlocks(codeContent)
    if (blocks.length === 0) {
      return codeContent
    }

    const rendered = blocks
      .map((block) => block.replace)
      .filter((text) => text.trim().length > 0)
      .join('\n\n')

    return rendered || codeContent
  }, [codeContent, filename])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleOpenFile = () => {
    if (filename) {
      openMarkdownFile(app, filename)
    }
  }

  return (
    <div className="smtcmp-code-block">
      <div className="smtcmp-code-block-header">
        {filename && (
          <div
            className="smtcmp-code-block-header-filename"
            onClick={handleOpenFile}
          >
            {filename}
          </div>
        )}
        <div className="smtcmp-code-block-header-button-container">
          <button
            type="button"
            className="clickable-icon smtcmp-code-block-header-button"
            onClick={() => {
              void handleCopy()
            }}
          >
            {copied ? (
              <>
                <Check size={10} />
                <span>{t('chat.codeBlock.textCopied', 'Text copied')}</span>
              </>
            ) : (
              <>
                <CopyIcon size={10} />
                <span>{t('chat.codeBlock.copyText', 'Copy text')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="clickable-icon smtcmp-code-block-header-button"
            onClick={
              isApplying && !isQuickApplying
                ? undefined
                : () => {
                    onApply(codeContent, 'quick', quickApplyRequestKey)
                  }
            }
            aria-disabled={isApplying && !isQuickApplying}
          >
            {isQuickApplying ? (
              <>
                <Loader2 className="smtcmp-spinner" size={14} />
                <span>{t('chat.codeBlock.stopApplying', 'Stop apply')}</span>
              </>
            ) : (
              <>
                <Play size={10} />
                <span>{t('chat.codeBlock.applyQuick', 'Apply (fast)')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="clickable-icon smtcmp-code-block-header-button"
            onClick={
              isApplying && !isPreciseApplying
                ? undefined
                : () => {
                    onApply(codeContent, 'precise', preciseApplyRequestKey)
                  }
            }
            aria-disabled={isApplying && !isPreciseApplying}
          >
            {isPreciseApplying ? (
              <>
                <Loader2 className="smtcmp-spinner" size={14} />
                <span>{t('chat.codeBlock.stopApplying', 'Stop apply')}</span>
              </>
            ) : (
              <>
                <Play size={10} />
                <span>
                  {t('chat.codeBlock.applyPrecise', 'Apply (precise)')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="smtcmp-code-block-obsidian-markdown">
        <ObsidianMarkdown content={previewContent} scale="sm" />
      </div>
    </div>
  )
}
