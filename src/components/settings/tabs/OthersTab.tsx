import { App } from 'obsidian'
import React from 'react'

import { useLanguage } from '../../../contexts/language-context'
import { useSettings } from '../../../contexts/settings-context'
import SmartComposerPlugin from '../../../main'
import { ObsidianButton } from '../../common/ObsidianButton'
import { ObsidianDropdown } from '../../common/ObsidianDropdown'
import { ObsidianSetting } from '../../common/ObsidianSetting'
import { EtcSection } from '../sections/EtcSection'

type OthersTabProps = {
  app: App
  plugin: SmartComposerPlugin
}

export function OthersTab({ app, plugin }: OthersTabProps) {
  const { t } = useLanguage()
  const { settings, setSettings } = useSettings()

  const handleMentionDisplayModeChange = (value: string) => {
    if (value !== 'inline' && value !== 'badge') return
    void (async () => {
      try {
        await setSettings({
          ...settings,
          chatOptions: {
            ...settings.chatOptions,
            mentionDisplayMode: value,
          },
        })
      } catch (error: unknown) {
        console.error('Failed to update mention display mode', error)
      }
    })()
  }

  return (
    <>
      <div className="smtcmp-settings-section">
        <ObsidianSetting
          name={t('settings.supportSmartComposer.name')}
          desc={t('settings.supportSmartComposer.desc')}
          heading
          className="smtcmp-settings-support-smart-composer"
        >
          <ObsidianButton
            text={t('settings.supportSmartComposer.buyMeACoffee')}
            onClick={() =>
              window.open('https://afdian.com/a/lapis0x0', '_blank')
            }
            cta
          />
        </ObsidianSetting>
        <ObsidianSetting
          name={t('settings.etc.mentionDisplayMode', '引用文件显示位置')}
          desc={t(
            'settings.etc.mentionDisplayModeDesc',
            '选择 @ 添加文件后是在输入框内显示，还是在输入框顶部以徽章显示。',
          )}
        >
          <ObsidianDropdown
            value={settings.chatOptions.mentionDisplayMode ?? 'inline'}
            options={{
              inline: t('settings.etc.mentionDisplayModeInline', '输入框内'),
              badge: t('settings.etc.mentionDisplayModeBadge', '顶部徽章'),
            }}
            onChange={handleMentionDisplayModeChange}
          />
        </ObsidianSetting>
      </div>

      <EtcSection app={app} plugin={plugin} />
    </>
  )
}
