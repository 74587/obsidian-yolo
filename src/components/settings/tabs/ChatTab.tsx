import { App } from 'obsidian'
import React from 'react'

import SmartComposerPlugin from '../../../main'
import { ChatPreferencesSection } from '../sections/ChatPreferencesSection'

type ChatTabProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function ChatTab(_props: ChatTabProps) {
  return (
    <>
      <ChatPreferencesSection />
    </>
  )
}
