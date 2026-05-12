import { Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { invoke } from '@tauri-apps/api/core'
import { GatewayCodeCard, GatewaySectionHeader, GatewayStatCard, GatewaySubCard, GatewaySurfaceCard } from './GatewayShared'

interface GatewayIntegrationProps {
  colors: any;
  integrationGuidance: any[];
  integrationSummary: any;
  effectiveConnectHost: string;
  clientSamples: any;
  copyText: (text: string, msg: string) => Promise<void>;
  copySuccess: string;
  effectiveConfig: any;
  status: any;
}

function GatewayIntegration({
  colors,
  integrationGuidance,
  integrationSummary,
  effectiveConnectHost,
  clientSamples,
  copyText,
  copySuccess,
  effectiveConfig,
  status}: GatewayIntegrationProps) {
  const { t } = useTranslation()

  // 构建完整的 baseUrl
  const port = (status?.running ? status?.port : null) || effectiveConfig?.port || status?.port || 8765
  const needsBrackets = effectiveConnectHost.includes(':') && !effectiveConnectHost.startsWith('[')
  const normalizedHost = needsBrackets ? `[${effectiveConnectHost}]` : effectiveConnectHost
  const fullBaseUrl = `http://${normalizedHost}:${port}`

  // 获取完整的 API Key（用于复制，不遮挡）
  const fullApiKey = effectiveConfig?.clientApiKeysText || effectiveConfig?.apiKey || ''
  const firstApiKey = fullApiKey.split('\n')[0]?.trim() || ''
  return (
    <div className="grid grid-cols-1 gap-4">
      <GatewaySurfaceCard colors={colors}>
        <div className="flex flex-col gap-3">
          <GatewaySectionHeader
            colors={colors}
            title={t('gateway.integrationGuide')}
            badge={<Badge variant="secondary" className="">{t('gateway.clientIntegration')}</Badge>}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {integrationGuidance.map((item) => (
              <GatewayStatCard
                key={item.label}
                colors={colors}
                label={item.label}
                value={item.value}
                detail={item.detail}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GatewayStatCard
              colors={colors}
              label={t('gateway.integrationAddress')}
              value={integrationSummary.endpointLabel}
              detail={`${t('gateway.clientShouldConnect')} ${effectiveConnectHost}`}
            />
            <GatewayStatCard colors={colors} label={t('gateway.authHeader')} value={integrationSummary.authLabel} />
          </div>

          <GatewaySubCard>
            <div className="flex flex-col gap-3">
              <GatewaySectionHeader
                colors={colors}
                title={t('gateway.compatibilityMatrix')}
                badge={<Badge variant="secondary" className="">Protocol Surface</Badge>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <GatewayStatCard colors={colors} label="Anthropic" value={t('gateway.anthropicCompatibility')} detail={t('gateway.anthropicCompatibilityDesc')} />
                <GatewayStatCard colors={colors} label="OpenAI" value={t('gateway.openaiCompatibility')} detail={t('gateway.openaiCompatibilityDesc')} />
                <GatewayStatCard colors={colors} label={t('gateway.proxyBoundary')} value={t('gateway.proxyBoundaryValue')} detail={t('gateway.proxyBoundaryDesc')} />
                <GatewayStatCard colors={colors} label={t('gateway.troubleshootingSupport')} value={t('gateway.troubleshootingSupportValue')} detail={t('gateway.troubleshootingSupportDesc')} />
              </div>
            </div>
          </GatewaySubCard>

          <GatewayCodeCard
            title="Claude / Anthropic"
            code={clientSamples.anthropic.env}
            actions={(
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyText(`${fullBaseUrl}\n${firstApiKey}`, t('gateway.claudeConfigCopied'))}
                className="gap-1"
              >
                <Copy size={14} />
                {t('gateway.copyClaudeConfig')}
              </Button>
            )}
          />

          <GatewayCodeCard
            title={t('gateway.openaiCompatibility')}
            code={clientSamples.openai.env}
            actions={(
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(`${fullBaseUrl}\n${firstApiKey}`, t('gateway.openAIConfigCopied'))}
                  className="gap-1"
                >
                  <Copy size={14} />
                  {t('gateway.copyOpenAIConfig')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(clientSamples.openai.curl, t('gateway.responsesCurlCopied'))}
                  className="gap-1"
                >
                  <Copy size={14} />
                  {t('gateway.copyResponsesCurl')}
                </Button>
                {copySuccess ? (
                  <Badge variant="default" className="gap-1">
                    <Check size={12} />
                    {copySuccess}
                  </Badge>
                ) : null}
              </>
            )}
          >
            <p className={`text-xs mt-2 text-muted-foreground`}>
              {t('gateway.openaiCompatibilityNote')}
            </p>
            <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs font-mono mt-2">
              <code>{clientSamples.openai.curl}</code>
            </pre>
          </GatewayCodeCard>

          <GatewayCodeCard
            title="OpenAI Chat Completions"
            code={clientSamples.openaiChat.env}
            actions={(
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(`${fullBaseUrl}\n${firstApiKey}`, t('gateway.chatCompletionsConfigCopied'))}
                  className="gap-1"
                >
                  <Copy size={14} />
                  {t('gateway.copyChatCompletionsConfig')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(clientSamples.openaiChat.curl, t('gateway.chatCompletionsCurlCopied'))}
                  className="gap-1"
                >
                  <Copy size={14} />
                  {t('gateway.copyChatCompletionsCurl')}
                </Button>
                {copySuccess ? (
                  <Badge variant="default" className="gap-1">
                    <Check size={12} />
                    {copySuccess}
                  </Badge>
                ) : null}
              </>
            )}
          >
            <p className={`text-xs mt-2 text-muted-foreground`}>
              {t('gateway.traditionalOpenAINote')}
            </p>
            <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs font-mono mt-2">
              <code>{clientSamples.openaiChat.curl}</code>
            </pre>
          </GatewayCodeCard>

          <GatewayCodeCard
            title="Claude Code CLI"
            code={clientSamples.claudeCode.config}
            actions={(
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(`${fullBaseUrl}\n${firstApiKey}`, t('gateway.configCopied'))}
                  className="gap-1"
                >
                  <Copy size={14} />
                  {t('gateway.copyConfig')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      // 检测是否安装
                      const installed = await invoke('check_claude_code_installed')
                      if (!installed) {
                        await copyText(t('gateway.claudeCodeNotInstalled'), t('gateway.claudeCodeNotInstalledMsg'))
                        return
                      }

                      const result = await invoke('write_claude_code_config', {
                        baseUrl: fullBaseUrl,
                        apiKey: firstApiKey
                      })
                      await copyText(result as string, t('gateway.configSuccess'))
                    } catch (e) {
                      await copyText(String(e), t('gateway.configFailed'))
                    }
                  }}
                  className="gap-1"
                >
                  {t('gateway.directConfig')}
                </Button>
              </>
            )}
          >
            <p className={`text-xs mt-2 text-muted-foreground`}>
              {t('gateway.claudeCodeToolNote')}
            </p>
          </GatewayCodeCard>

          <GatewayCodeCard
            title="Codex CLI"
            code={clientSamples.codex.config}
            actions={(
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(`${fullBaseUrl}\n${firstApiKey}`, t('gateway.configCopied'))}
                  className="gap-1"
                >
                  <Copy size={14} />
                  {t('gateway.copyConfig')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      // 检测是否安装
                      const installed = await invoke('check_codex_cli_installed')
                      if (!installed) {
                        await copyText(t('gateway.codexNotInstalled'), t('gateway.codexNotInstalledMsg'))
                        return
                      }

                      const result = await invoke('write_codex_cli_config', {
                        baseUrl: fullBaseUrl,
                        apiKey: firstApiKey,
                        model: 'claude-sonnet-4-5-20250929'
                      })
                      await copyText(result as string, t('gateway.configSuccess'))
                    } catch (e) {
                      await copyText(String(e), t('gateway.configFailed'))
                    }
                  }}
                  className="gap-1"
                >
                  {t('gateway.directConfig')}
                </Button>
              </>
            )}
          >
            <p className={`text-xs mt-2 text-muted-foreground`}>
              {t('gateway.codexToolNote')}
            </p>
          </GatewayCodeCard>

          <GatewayCodeCard title={t('gateway.credentials')}>
            <div className="flex flex-col gap-1.5 mt-2">
              <p className={`text-xs text-muted-foreground`}>{t('gateway.clientToProxy')}</p>
              <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs font-mono">
                <code>{integrationSummary.authLabel}</code>
              </pre>
              <p className={`text-xs text-muted-foreground`}>{t('gateway.proxyToKiro')}</p>
              <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs font-mono">
                <code>Authorization: Bearer &lt;local kiro access token&gt;</code>
              </pre>
            </div>
          </GatewayCodeCard>
        </div>
      </GatewaySurfaceCard>
    </div>
  )
}

export default GatewayIntegration
