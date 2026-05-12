import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Play, RotateCcw, Square, Plug, Activity as ActivityIcon, Settings } from 'lucide-react'
import { Alert as AlertPrimitive, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '../../../hooks/useApp'
import { Stack, Group, Badge, Card, Text } from '@/components/shared/layout'
import GatewayConfigComponent from './GatewayConfig'
import GatewayIntegration from './GatewayIntegration'
import GatewayObservability from './GatewayObservability'
import { getThemeAccent } from '../KiroConfig/themeAccent'
import { GatewayConfig, GatewayStatus } from './gatewayPageState'
import {
  GatewayConfigProvider,
  GatewayStatusProvider,
  GatewayDataProvider,
  GatewayObservabilityProvider
} from './contexts'
import { 
  applyGatewayLocalOnlyChange, 
  buildClientSamples, 
  buildGatewayActionSummary, 
  buildGatewayBaseUrl, 
  buildGatewayConnectHost, 
  buildGatewayIntegrationSummary, 
  buildGatewayMetricsSummary, 
  buildGatewayRequestLogSummary, 
  buildGatewayRoutingSummary, 
  buildGatewaySecuritySummary, 
  buildGatewayStatusSummary, 
  createGatewayFieldErrors, 
  filterGatewayRequestLogs, 
  formatGatewayAccountOptionLabel, 
  formatGatewayTimestamp, 
  mergeErrorHistory 
} from './gatewayPageUtils'
import {
  buildGatewayConfigSnapshot,
  buildGatewayRuntimeSnapshot,
  buildGatewayStatusState,
  clearGatewayRequestLogs,
  DEFAULT_GATEWAY_CONFIG,
  DEFAULT_GATEWAY_STATUS,
  fetchGatewayRequestLogs,
  loadGatewayPageData,
  openGatewayLogDir,
  saveGatewayConfig,
  startGateway,
  stopGateway,
  hydrateGatewayConfig
} from './gatewayPageState'
import { useGatewayPolling } from './useGatewayPolling'
import React from 'react'

function Alert(props: any) {
  return <AlertPrimitive {...props} />
}

function ThemedAlert({ title, children, ...props }: any) {
  return (
    <Alert {...props}>
      {title && <AlertTitle className={"text-foreground"}>{title}</AlertTitle>}
      <AlertDescription className={"text-muted-foreground"}>
        {children}
      </AlertDescription>
    </Alert>
  )
}

function GatewayPage() {
  const { t } = useTranslation()
  const { theme } = useApp()
  const accent = useMemo(() => getThemeAccent(theme), [theme])

  // 定义反代页面使用的色彩系统
  const colors = useMemo(() => ({
    inputFocus: 'focus:ring-primary/20 focus:border-primary',
  }), [])

  const [config, setConfig] = useState<GatewayConfig>(DEFAULT_GATEWAY_CONFIG)
  const [status, setStatus] = useState<GatewayStatus>(DEFAULT_GATEWAY_STATUS)
  const [errorHistory, setErrorHistory] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copySuccess, setCopySuccess] = useState('')
  const [logDir, setLogDir] = useState('')
  const [activeTab, setActiveTab] = useState('config')
  const [requestLogs, setRequestLogs] = useState<any[]>([])
  const [requestLogsLoading, setRequestLogsLoading] = useState(false)
  const [requestLogOutcome, setRequestLogOutcome] = useState('all')
  const [requestLogQuery, setRequestLogQuery] = useState('')
  const [lastRequestLogsSyncAt, setLastRequestLogsSyncAt] = useState('-')
  const [savedConfigSnapshot, setSavedConfigSnapshot] = useState(() => buildGatewayConfigSnapshot(DEFAULT_GATEWAY_CONFIG))
  const [appliedRuntimeSnapshot, setAppliedRuntimeSnapshot] = useState<any>(null)
  const [lastStatusSyncAt, setLastStatusSyncAt] = useState('-')

  const accountOptions = useMemo(
    () => accounts.map(account => ({
      value: account.id,
      label: formatGatewayAccountOptionLabel(account)})),
    [accounts]
  )

  const groupOptions = useMemo(
    () => groups.map(group => ({ value: group.id, label: group.name })),
    [groups]
  )

  const fieldErrors = useMemo(() => createGatewayFieldErrors(config), [config])
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const configSnapshot = useMemo(() => buildGatewayConfigSnapshot(config), [config])
  const runtimeSnapshot = useMemo(() => buildGatewayRuntimeSnapshot(config), [config])
  const hasUnsavedChanges = configSnapshot !== savedConfigSnapshot
  const hasRuntimeChanges = !!status.running && !!appliedRuntimeSnapshot && runtimeSnapshot !== appliedRuntimeSnapshot
  
  const effectiveConfig = useMemo(
    () => (status.running && status.runtimeConfig ? status.runtimeConfig : config),
    [status.running, status.runtimeConfig, config]
  )
  const effectiveBaseUrl = useMemo(
    () => buildGatewayBaseUrl(effectiveConfig.host, effectiveConfig.port, effectiveConfig.localOnly),
    [effectiveConfig.host, effectiveConfig.port, effectiveConfig.localOnly]
  )
  const effectiveConnectHost = useMemo(
    () => buildGatewayConnectHost(effectiveConfig.host, effectiveConfig.localOnly),
    [effectiveConfig.host, effectiveConfig.localOnly]
  )
  const clientSamples = useMemo(
    () => buildClientSamples(effectiveBaseUrl, effectiveConfig.clientApiKeysText || effectiveConfig.apiKey),
    [effectiveBaseUrl, effectiveConfig.clientApiKeysText, effectiveConfig.apiKey]
  )
  const statusSummary = useMemo(
    () => buildGatewayStatusSummary({ config: effectiveConfig, status, errorHistory, lastStatusSyncAt }),
    [effectiveConfig, status, errorHistory, lastStatusSyncAt]
  )
  const actionSummary = useMemo(
    () => buildGatewayActionSummary({ running: status.running, isDirty: hasUnsavedChanges, hasUnsavedChanges, hasRuntimeChanges, hasFieldErrors }),
    [status.running, hasUnsavedChanges, hasRuntimeChanges, hasFieldErrors]
  )
  const securitySummary = useMemo(
    () => buildGatewaySecuritySummary({ config }),
    [config]
  )
  const effectiveSecuritySummary = useMemo(
    () => buildGatewaySecuritySummary({ config: effectiveConfig }),
    [effectiveConfig]
  )
  const integrationSummary = useMemo(
    () => buildGatewayIntegrationSummary({
      baseUrl: effectiveBaseUrl,
      apiKey: effectiveConfig.clientApiKeysText || effectiveConfig.apiKey,
      clientApiKeysText: effectiveConfig.clientApiKeysText || effectiveConfig.apiKey,
      logDir,
      errorHistory}),
    [effectiveBaseUrl, effectiveConfig.clientApiKeysText, effectiveConfig.apiKey, logDir, errorHistory]
  )
  const deferredRequestLogQuery = useDeferredValue(requestLogQuery)
  const isObservabilityTab = activeTab === 'observability'
  const requestLogSummary = useMemo(
    () => isObservabilityTab ? buildGatewayRequestLogSummary(requestLogs) : buildGatewayRequestLogSummary([]),
    [isObservabilityTab, requestLogs]
  )
  const filteredRequestLogs = useMemo(
    () => isObservabilityTab
      ? filterGatewayRequestLogs(requestLogs, { outcome: requestLogOutcome, query: deferredRequestLogQuery })
      : [],
    [isObservabilityTab, requestLogs, requestLogOutcome, deferredRequestLogQuery]
  )
  const filteredRequestLogSummary = useMemo(
    () => buildGatewayRequestLogSummary(filteredRequestLogs),
    [filteredRequestLogs]
  )
  const requestMetrics = useMemo(
    () => buildGatewayMetricsSummary(filteredRequestLogs),
    [filteredRequestLogs]
  )
  const routingSummary = useMemo(
    () => buildGatewayRoutingSummary({
      config,
      counts: {
        accounts: accounts.length,
        groups: groups.length},
      selectedLabels: {
        single: accountOptions.find(item => item.value === config.accountId)?.label,
        group: groupOptions.find(item => item.value === config.groupId)?.label}}),
    [config, accounts.length, groups.length, accountOptions, groupOptions]
  )
  const effectiveRoutingSummary = useMemo(() => buildGatewayRoutingSummary({
    config: effectiveConfig,
    counts: {
      accounts: accounts.length,
      groups: groups.length},
    selectedLabels: {
      single: accountOptions.find(item => item.value === effectiveConfig.accountId)?.label,
      group: groupOptions.find(item => item.value === effectiveConfig.groupId)?.label}}), [effectiveConfig, accounts.length, groups.length, accountOptions, groupOptions])

  const latestErrorEntry = useMemo(
    () => errorHistory[0] || null,
    [errorHistory]
  )

  const consoleHighlights = useMemo(() => ([
    {
      label: t('gateway.currentEndpoint'),
      value: effectiveBaseUrl,
      detail: `${effectiveConfig.localOnly ? t('gateway.localOnly') : t('gateway.allowRemote')} · ${status.running ? t('gateway.running') : t('gateway.pendingStart')}`},
    {
      label: t('gateway.clientKey'),
      value: effectiveSecuritySummary.apiKeyState,
      detail: integrationSummary.authLabel},
    {
      label: t('gateway.routingMode'),
      value: effectiveRoutingSummary.modeLabel,
      detail: `${effectiveRoutingSummary.selectionLabel}：${effectiveRoutingSummary.selectionValue}`},
    {
      label: t('gateway.recentRisk'),
      value: latestErrorEntry ? t('gateway.needsInvestigation') : t('gateway.stable'),
      detail: latestErrorEntry?.message || `${t('gateway.lastSync')} ${lastStatusSyncAt}`},
    {
      label: t('gateway.observationSamples'),
      value: `${requestLogSummary.total} ${t('gateway.requestCount')}`,
      detail: `${t('gateway.successRate')} ${requestMetrics.successRateLabel} · ${t('gateway.errorRate')} ${requestMetrics.errorRateLabel}`},
    {
      label: t('gateway.runtimeDifference'),
      value: hasRuntimeChanges ? t('gateway.needsRestart') : t('gateway.runtimeAligned'),
      detail: hasUnsavedChanges ? t('gateway.unsavedChanges') : t('gateway.configSaved')},
  ]), [
    t,
    effectiveBaseUrl,
    effectiveConfig.localOnly,
    status.running,
    effectiveSecuritySummary.apiKeyState,
    integrationSummary.authLabel,
    effectiveRoutingSummary.modeLabel,
    effectiveRoutingSummary.selectionLabel,
    effectiveRoutingSummary.selectionValue,
    latestErrorEntry,
    lastStatusSyncAt,
    requestLogSummary.total,
    requestMetrics.successRateLabel,
    requestMetrics.errorRateLabel,
    hasRuntimeChanges,
    hasUnsavedChanges,
  ])

  const operationsChecklist = useMemo(() => {
    const checks = [
      {
        label: t('gateway.configHealth'),
        status: hasFieldErrors ? t('gateway.needsFix') : t('gateway.normal'),
        tone: hasFieldErrors ? 'red' : 'green',
        detail: hasFieldErrors ? t('gateway.formErrorsBlockSave') : t('gateway.formFieldsValid')},
      {
        label: t('gateway.runtimeStatus'),
        status: status.running ? t('gateway.running') : t('gateway.notStarted'),
        tone: status.running ? 'green' : 'gray',
        detail: status.running
          ? `${t('gateway.currentListen')} ${statusSummary.listen}，${t('gateway.requestCount2')} ${statusSummary.requests}。`
          : t('gateway.proxyNotStarted')},
      {
        label: t('gateway.configSync'),
        status: hasUnsavedChanges ? t('gateway.unsaved') : t('gateway.saved'),
        tone: hasUnsavedChanges ? 'yellow' : 'teal',
        detail: hasUnsavedChanges
          ? t('gateway.pageConfigChanged')
          : t('gateway.pageConfigSynced')},
      {
        label: t('gateway.runtimeDifference'),
        status: hasRuntimeChanges ? t('gateway.needsRestartStatus') : t('gateway.aligned'),
        tone: hasRuntimeChanges ? 'orange' : 'teal',
        detail: hasRuntimeChanges
          ? t('gateway.proxyUsingOldParams')
          : t('gateway.runtimeParamsMatch')},
    ]

    if (latestErrorEntry) {
      checks.push({
        label: t('gateway.recentRisk'),
        status: `${latestErrorEntry.count} ${t('gateway.times')}`,
        tone: 'orange',
        detail: latestErrorEntry.message})
    }

    return checks
  }, [t, hasFieldErrors, status.running, statusSummary.listen, statusSummary.requests, hasUnsavedChanges, hasRuntimeChanges, latestErrorEntry])

  const integrationGuidance = useMemo(() => ([
    {
      label: t('gateway.anthropicMessagesApi'),
      value: '/v1/messages',
      detail: t('gateway.anthropicMessagesApiDesc')},
    {
      label: t('gateway.openaiApi'),
      value: '/v1/chat/completions, /v1/responses',
      detail: t('gateway.openaiApiDesc')},
    {
      label: t('gateway.troubleshootingEntry'),
      value: t('gateway.observabilityPage'),
      detail: t('gateway.observabilityPageDesc')},
  ]), [t])

  const pollingFallbackConfig = useMemo(
    () => ({
      host: config.host,
      port: config.port}),
    [config.host, config.port]
  )

  const renderMetricList = (items: any[], emptyLabel: string) => {
    if (!items.length) {
      return <Text size="sm" className={"text-muted-foreground"}>{emptyLabel}</Text>
    }

    return (
      <Stack gap={6}>
        {items.map(item => (
          <Group key={`${item.label}-${item.count}`} justify="space-between" gap="xs">
            <Text size="sm" className={"text-foreground"} style={{ wordBreak: 'break-word' }}>{item.label}</Text>
            <Badge variant="light">{item.count}</Badge>
          </Group>
        ))}
      </Stack>
    )
  }

  const inputClassNames = useMemo(() => ({
    input: `text-foreground bg-background border-input ${colors.inputFocus}`,
    label: "text-foreground",
    description: "text-muted-foreground",
    error: 'text-red-400',
    section: "text-muted-foreground"}), [colors.inputFocus])

  const selectClassNames = useMemo(() => ({
    ...inputClassNames,
    dropdown: `glass-card border border-border`,
    option: "text-foreground"}), [inputClassNames])

  const switchClassNames = useMemo(() => ({
    label: "text-foreground",
    description: "text-muted-foreground"}), [])

  const pushError = (msg: any) => {
    const normalized = String(msg?.message || msg || '').trim()
    if (!normalized) return
    setErrorHistory(prev => mergeErrorHistory(prev, normalized, formatGatewayTimestamp(), 8))
  }

  const loadRequestLogs = useCallback(async (limit = 120) => {
    setRequestLogsLoading(true)
    try {
      const logs = await fetchGatewayRequestLogs(limit)
      setRequestLogs(logs)
      setLastRequestLogsSyncAt(formatGatewayTimestamp())
    } catch (e) {
      pushError(e)
    } finally {
      setRequestLogsLoading(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const { gatewayConfig, gatewayStatus, accounts: accountList, groups: groupList, logDir: gatewayLogDir } = await loadGatewayPageData()

      const nextConfig = hydrateGatewayConfig(gatewayConfig)
      const nextStatus = buildGatewayStatusState(gatewayStatus, gatewayConfig, nextConfig)
      const runtimeConfig = gatewayStatus?.running && nextStatus.runtimeConfig ? nextStatus.runtimeConfig : null
      setConfig(nextConfig)
      setSavedConfigSnapshot(buildGatewayConfigSnapshot(nextConfig))
      setAppliedRuntimeSnapshot(runtimeConfig ? buildGatewayRuntimeSnapshot(runtimeConfig) : null)
      setStatus(nextStatus)
      setLastStatusSyncAt(formatGatewayTimestamp())
      setAccounts(accountList)
      setGroups(groupList)
      setLogDir(gatewayLogDir)

      if (gatewayStatus?.lastError) {
        pushError(gatewayStatus.lastError)
      }
    } catch (e) {
      pushError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      loadAll()
    })
  }, [loadAll])

  const handleStatusPoll = useCallback(({ status: nextStatus, fallbackConfig, syncedAt }: any) => {
    const nextState = buildGatewayStatusState(nextStatus, nextStatus, fallbackConfig)
    setStatus(nextState)
    setAppliedRuntimeSnapshot(nextState.running && nextState.runtimeConfig
      ? buildGatewayRuntimeSnapshot(nextState.runtimeConfig)
      : null)
    setLastStatusSyncAt(syncedAt)
    if (nextStatus?.lastError) {
      pushError(nextStatus.lastError)
    }
  }, [])

  const handleRequestLogsPoll = useCallback(({ logs, syncedAt }: any) => {
    setRequestLogs(logs)
    setLastRequestLogsSyncAt(syncedAt)
  }, [])

  useGatewayPolling({
    activeTab,
    fallbackConfig: pollingFallbackConfig,
    onStatus: handleStatusPoll,
    onRequestLogs: handleRequestLogsPoll})

  const setField = (key: string, value: any) => setConfig(prev => ({ ...prev, [key]: value }))

  const createGeneratedApiKey = () => {
    const random = crypto?.randomUUID?.().replace(/-/g, '') || `${Date.now()}${Math.random().toString(36).slice(2)}`
    return `sk-${random}`
  }

  const handleRefresh = async () => {
    await loadAll()
  }

  const handleClearErrors = () => {
    setErrorHistory([])
  }

  const handleGenerateApiKey = () => {
    setConfig(prev => {
      const generatedKey = createGeneratedApiKey()
      const existingKeys = String(prev.clientApiKeysText || prev.apiKey || '').trim()
      const clientApiKeysText = existingKeys ? `${existingKeys}\n${generatedKey}` : generatedKey
      return {
        ...prev,
        apiKey: generatedKey,
        clientApiKeysText}
    })
  }

  const handleOpenLogDir = async () => {
    try {
      const dir = await openGatewayLogDir()
      setLogDir(String(dir || ''))
    } catch (e) {
      pushError(e)
    }
  }

  const handleClearRequestLogs = async () => {
    setRequestLogsLoading(true)
    try {
      await clearGatewayRequestLogs()
      setRequestLogs([])
      setLastRequestLogsSyncAt(formatGatewayTimestamp())
    } catch (e) {
      pushError(e)
    } finally {
      setRequestLogsLoading(false)
    }
  }

  const guardInvalidConfig = () => {
    if (!hasFieldErrors) {
      return false
    }
    pushError(t('gateway.fixFormErrors'))
    return true
  }

  const handleSave = async () => {
    if (guardInvalidConfig()) return
    setSaving(true)
    try {
      await saveGatewayConfig(config)
      setSavedConfigSnapshot(buildGatewayConfigSnapshot(config))
    } catch (e) {
      pushError(e)
    } finally {
      setSaving(false)
    }
  }

  const handleStart = async () => {
    if (guardInvalidConfig()) return
    setSaving(true)
    try {
      const st = await startGateway(config)
      const nextStatus = buildGatewayStatusState(st, st, config)
      setStatus(nextStatus)
      setAppliedRuntimeSnapshot(nextStatus.runtimeConfig ? buildGatewayRuntimeSnapshot(nextStatus.runtimeConfig) : buildGatewayRuntimeSnapshot(config))
      setLastStatusSyncAt(formatGatewayTimestamp())
    } catch (e) {
      pushError(e)
    } finally {
      setSaving(false)
    }
  }

  const handleRestart = async () => {
    if (guardInvalidConfig()) return
    setSaving(true)
    try {
      if (status.running) {
        await stopGateway()
      }
      const st = await startGateway(config)
      const nextStatus = buildGatewayStatusState(st, st, config)
      setStatus(nextStatus)
      setAppliedRuntimeSnapshot(nextStatus.runtimeConfig ? buildGatewayRuntimeSnapshot(nextStatus.runtimeConfig) : buildGatewayRuntimeSnapshot(config))
      setLastStatusSyncAt(formatGatewayTimestamp())
    } catch (e) {
      pushError(e)
    } finally {
      setSaving(false)
    }
  }

  const handleStop = async () => {
    setSaving(true)
    try {
      await stopGateway()
      setStatus(prev => ({ ...prev, running: false }))
      setAppliedRuntimeSnapshot(null)
      setLastStatusSyncAt(formatGatewayTimestamp())
    } catch (e) {
      pushError(e)
    } finally {
      setSaving(false)
    }
  }

  const handleAutoStartToggle = async (checked: boolean) => {
    setField('enabled', checked)
    
    // 延迟执行，确保 setField 先更新状态
    setTimeout(async () => {
      try {
        // 先保存Config
        await saveGatewayConfig({ ...config, enabled: checked })
        setSavedConfigSnapshot(buildGatewayConfigSnapshot({ ...config, enabled: checked }))
        
        // 如果勾选自动启动且Config有效，立即启动反代
        if (checked && !hasFieldErrors) {
          setSaving(true)
          const st = await startGateway({ ...config, enabled: checked })
          const nextStatus = buildGatewayStatusState(st, st, { ...config, enabled: checked })
          setStatus(nextStatus)
          setAppliedRuntimeSnapshot(nextStatus.runtimeConfig ? buildGatewayRuntimeSnapshot(nextStatus.runtimeConfig) : buildGatewayRuntimeSnapshot({ ...config, enabled: checked }))
          setLastStatusSyncAt(formatGatewayTimestamp())
          setSaving(false)
        } else if (!checked && status.running) {
          // 如果取消自动启动且反代正在运行，停止反代
          setSaving(true)
          await stopGateway()
          setStatus(prev => ({ ...prev, running: false }))
          setAppliedRuntimeSnapshot(null)
          setLastStatusSyncAt(formatGatewayTimestamp())
          setSaving(false)
        }
      } catch (e) {
        pushError(e)
        setSaving(false)
      }
    }, 100)
  }

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(successMessage)
      setTimeout(() => setCopySuccess(''), 1600)
    } catch (e) {
      pushError(e)
    }
  }

  return (
    <GatewayConfigProvider>
      <GatewayStatusProvider>
        <GatewayDataProvider>
          <GatewayObservabilityProvider>
            <div className={`h-full overflow-y-auto p-4 glass-main`}>
              <Stack gap="md">
                <Card className={`glass-card border border-border rounded-xl p-4`}>
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={6}>
                        <Text fw={700} className={"text-foreground"}>{t('gateway.kiroApiReverseProxy')}</Text>
                        <Text size="sm" className={"text-muted-foreground"}>
                          {t('gateway.gatewayDescription')}
                        </Text>
                      </Stack>
                      <Group gap="xs">
                        <Badge color="indigo">Gateway Console</Badge>
                        <Badge color={status.running ? 'green' : 'gray'}>{status.running ? t('gateway.trafficEndpointOnline') : t('gateway.waitingToStart')}</Badge>
                      </Group>
                    </Group>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {consoleHighlights.map((item) => (
                <Card key={item.label} className="border rounded-xl p-4">
                  <Text size="xs" className={"text-muted-foreground"}>{item.label}</Text>
                  <Text fw={700} className={"text-foreground"} mt={4}>{item.value}</Text>
                  <Text size="sm" className={"text-muted-foreground"} mt={4}>{item.detail}</Text>
                </Card>
              ))}
            </div>
          </Stack>
        </Card>

        <Card className={`glass-card border border-border rounded-xl p-4`}>
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Group gap="xs">
                  <Badge color={status.running ? 'green' : 'gray'}>{status.running ? t('gateway.reverseProxyRunning') : t('gateway.reverseProxyNotStarted')}</Badge>
                  <Badge color={effectiveConfig.localOnly ? 'teal' : 'yellow'}>{effectiveConfig.localOnly ? t('gateway.localOnly') : t('gateway.allowRemote')}</Badge>
                  <Badge variant="light" color={hasUnsavedChanges ? 'yellow' : 'teal'}>
                    {hasUnsavedChanges ? t('gateway.unsavedConfigExists') : t('gateway.configSaved')}
                  </Badge>
                </Group>
                <Text fw={700} className={"text-foreground"}>{t('gateway.currentEndpoint')} {effectiveBaseUrl}</Text>
                <Text size="sm" className={"text-muted-foreground"}>
                  {effectiveRoutingSummary.modeLabel} · {effectiveRoutingSummary.selectionValue} · {effectiveSecuritySummary.apiKeyState}
                </Text>
              </Stack>

              <Group gap="xs">
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || hasFieldErrors || saving || loading}
                >
                  <Activity size={16} className="mr-1" />
                  {t('gateway.saveConfig')}
                </Button>
                {status.running ? (
                  <Button
                    variant="ghost"
                    onClick={handleRestart}
                    disabled={hasFieldErrors || saving || loading}
                  >
                    <RotateCcw size={16} className="mr-1" />
                    {t('gateway.restartReverseProxy')}
                  </Button>
                ) : null}
                {!status.running ? (
                  <Button
                    onClick={handleStart}
                    disabled={hasFieldErrors || saving || loading}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Play size={16} className="mr-1" />
                    {t('gateway.startReverseProxy')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStop}
                    disabled={saving || loading}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square size={16} className="mr-1" />
                    {t('gateway.stopReverseProxy')}
                  </Button>
                )}
              </Group>
            </Group>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border rounded-xl p-4">
                <Text size="xs" className={"text-muted-foreground"}>{t('gateway.runtimeSnapshot')}</Text>
                <Text fw={700} className={"text-foreground"}>{statusSummary.listen}</Text>
                <Text size="sm" className={"text-muted-foreground"} mt={4}>
                  {statusSummary.routing} · {statusSummary.region}
                </Text>
              </Card>
              <Card className="border rounded-xl p-4">
                <Text size="xs" className={"text-muted-foreground"}>{t('gateway.integrationAndAuth')}</Text>
                <Text fw={700} className={"text-foreground"}>{integrationSummary.endpointLabel}</Text>
                <Text size="sm" className={"text-muted-foreground"} mt={4}>
                  {integrationSummary.authLabel}
                </Text>
              </Card>
              <Card className="border rounded-xl p-4">
                <Text size="xs" className={"text-muted-foreground"}>{t('gateway.latestRisk')}</Text>
                <Text fw={700} className={"text-foreground"}>
                  {latestErrorEntry ? t('gateway.recentErrorRequests') : t('gateway.noRecentErrors')}
                </Text>
                <Text size="sm" className={"text-muted-foreground"} mt={4}>
                  {latestErrorEntry?.lastSeenAt || lastStatusSyncAt}
                </Text>
              </Card>
            </div>

            <ThemedAlert
              color={actionSummary.tone}
              variant="light"
              title={actionSummary.title}
            >
              <Text size="sm" className={"text-muted-foreground"}>
                {actionSummary.description}
              </Text>
            </ThemedAlert>
          </Stack>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            startTransition(() => {
              setActiveTab(value || 'config')
            })
          }}
        >
          <TabsList>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings size={16} />
              {t('gateway.config')}
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Plug size={16} />
              {t('gateway.integration')}
            </TabsTrigger>
            <TabsTrigger value="observability" className="flex items-center gap-2">
              <ActivityIcon size={16} />
              {t('gateway.observability')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integration">
            <GatewayIntegration
              colors={colors}
              integrationGuidance={integrationGuidance}
              integrationSummary={integrationSummary}
              effectiveConnectHost={effectiveConnectHost}
              clientSamples={clientSamples}
              copyText={copyText}
              copySuccess={copySuccess}
              effectiveConfig={effectiveConfig}
              status={status}
            />
          </TabsContent>

          <TabsContent value="observability">
            <GatewayObservability
              colors={colors}
              effectiveConfig={effectiveConfig}
              status={status}
              loading={loading}
              handleRefresh={handleRefresh}
              handleClearErrors={handleClearErrors}
              errorHistory={errorHistory}
              statusSummary={statusSummary}
              hasUnsavedChanges={hasUnsavedChanges}
              filteredRequestLogSummary={filteredRequestLogSummary}
              integrationSummary={integrationSummary}
              logDir={logDir}
              handleOpenLogDir={handleOpenLogDir}
              loadRequestLogs={loadRequestLogs}
              requestLogsLoading={requestLogsLoading}
              handleClearRequestLogs={handleClearRequestLogs}
              requestLogs={requestLogs}
              lastRequestLogsSyncAt={lastRequestLogsSyncAt}
              requestLogOutcome={requestLogOutcome}
              setRequestLogOutcome={setRequestLogOutcome}
              requestLogQuery={requestLogQuery}
              setRequestLogQuery={setRequestLogQuery}
              requestLogSummary={requestLogSummary}
              requestMetrics={requestMetrics}
              filteredRequestLogs={filteredRequestLogs}
            />
          </TabsContent>

          <TabsContent value="config">
            <GatewayConfigComponent
              colors={colors}
              config={config}
              hasFieldErrors={hasFieldErrors}
              hasUnsavedChanges={hasUnsavedChanges}
              fieldErrors={fieldErrors}
              setField={setField}
              handleGenerateApiKey={handleGenerateApiKey}
              securitySummary={securitySummary}
              routingSummary={routingSummary}
              accountOptions={accountOptions}
              groupOptions={groupOptions}
              actionSummary={actionSummary}
              ThemedAlert={ThemedAlert}
              setConfig={setConfig}
              applyGatewayLocalOnlyChange={applyGatewayLocalOnlyChange}
              createGeneratedApiKey={createGeneratedApiKey}
              handleSaveConfig={handleSave}
              handleAutoStartToggle={handleAutoStartToggle}
            />
          </TabsContent>
        </Tabs>
      </Stack>
    </div>
          </GatewayObservabilityProvider>
        </GatewayDataProvider>
      </GatewayStatusProvider>
    </GatewayConfigProvider>
  )
}

export default GatewayPage
