import { Activity, AlertTriangle, ChevronDown, ChevronUp, FolderOpen, Radio, RefreshCw, Search, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatGatewayRequestDuration } from './gatewayPageUtils'
import { GatewayCodeCard, GatewayPathCard, GatewaySectionHeader, GatewayStatCard, GatewaySubCard, GatewaySurfaceCard } from './GatewayShared'
import { MetricBar } from './MetricBar'
import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type {
  RequestLog,
  ProcessedRequestLog,
  RequestLogSummary,
  RequestMetrics,
  ErrorHistoryItem,
  StatusSummary,
  IntegrationSummary,
  GatewayStatus,
  GatewayConfig
} from './types'

interface GatewayObservabilityProps {
  colors: any;
  effectiveConfig: GatewayConfig;
  status: GatewayStatus;
  loading: boolean;
  handleRefresh: () => Promise<void>;
  handleClearErrors: () => void;
  errorHistory: ErrorHistoryItem[];
  statusSummary: StatusSummary;
  hasUnsavedChanges: boolean;
  filteredRequestLogSummary: RequestLogSummary;
  integrationSummary: IntegrationSummary;
  logDir: string;
  handleOpenLogDir: () => Promise<void>;
  loadRequestLogs: (limit?: number) => Promise<void>;
  requestLogsLoading: boolean;
  handleClearRequestLogs: () => Promise<void>;
  requestLogs: RequestLog[];
  lastRequestLogsSyncAt: string;
  requestLogOutcome: string;
  setRequestLogOutcome: (value: string) => void;
  requestLogQuery: string;
  setRequestLogQuery: (value: string) => void;
  requestLogSummary: RequestLogSummary;
  requestMetrics: RequestMetrics;
  filteredRequestLogs: RequestLog[];
}

function GatewayErrorHistoryCard({ errorHistory }: { errorHistory: ErrorHistoryItem[] }) {
  const { t } = useTranslation()
  const entries = errorHistory.length
    ? errorHistory
    : [{ message: t('gateway.noStreamingErrors'), firstSeenAt: '-', lastSeenAt: '-', count: 1 }]

  return (
    <GatewayCodeCard title={t('gateway.streamingUpstreamErrors')}>
      <div className="flex flex-col gap-1.5 mt-2">
        {entries.map((item, idx) => (
          <GatewaySubCard key={`${item.message}-${idx}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                <div className="text-sm font-semibold">{t('gateway.errorHit')} {item.count} {t('gateway.times')}</div>
              </div>
              <Badge variant="secondary">{item.lastSeenAt}</Badge>
            </div>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
              {`${t('gateway.firstSeen')}: ${item.firstSeenAt}\n${t('gateway.lastSeen')}: ${item.lastSeenAt}\n${t('gateway.count')}: ${item.count}\n${item.message}`}
            </pre>
          </GatewaySubCard>
        ))}
      </div>
    </GatewayCodeCard>
  )
}

function GatewayObservability({
  colors,
  effectiveConfig,
  status,
  loading,
  handleRefresh,
  handleClearErrors,
  errorHistory,
  statusSummary,
  hasUnsavedChanges,
  filteredRequestLogSummary,
  integrationSummary,
  logDir,
  handleOpenLogDir,
  loadRequestLogs,
  requestLogsLoading,
  handleClearRequestLogs,
  requestLogs,
  lastRequestLogsSyncAt,
  requestLogOutcome,
  setRequestLogOutcome,
  requestLogQuery,
  setRequestLogQuery,
  requestLogSummary,
  requestMetrics,
  filteredRequestLogs}: GatewayObservabilityProps) {
  const { t } = useTranslation()
  // Local state for immediate input feedback
  const [searchInput, setSearchInput] = useState(requestLogQuery)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  // 最近请求明细展开/收起状态
  const [isRequestDetailExpanded, setIsRequestDetailExpanded] = useState(true)

  // Debounced search handler - 修复内存泄漏问题
  const debouncedSetQuery = useCallback((value: string) => {
    // 清除之前的 timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // 设置新的 timeout
    timeoutRef.current = setTimeout(() => {
      setRequestLogQuery(value)
      timeoutRef.current = null
    }, 300)
  }, [setRequestLogQuery])

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchInput(value)
    debouncedSetQuery(value)
  }, [debouncedSetQuery])

  // 组件卸载时清理 timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] gap-4">
        <GatewaySurfaceCard colors={colors}>
          <div className="flex flex-col gap-3">
            <GatewaySectionHeader
              colors={colors}
              icon={Shield}
              title={t('gateway.observabilityOverview')}
              actions={(
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <Radio size={12} />
                    {`${t('gateway.accountPool')} ${effectiveConfig.strategy}`}
                  </Badge>
                  <Badge variant={effectiveConfig.localOnly ? 'default' : 'secondary'}>{effectiveConfig.localOnly ? t('gateway.localOnly') : t('gateway.allowRemote')}</Badge>
                  <Badge variant={status.running ? 'default' : 'destructive'}>{status.running ? t('gateway.running') : t('gateway.stopped')}</Badge>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                    {t('gateway.refreshStatus')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearErrors} disabled={!errorHistory.length}>
                    {t('gateway.clearErrors')}
                  </Button>
                </div>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GatewayStatCard colors={colors} label={t('gateway.listenAddress')} value={statusSummary.listen} />
              <GatewayStatCard colors={colors} label={t('gateway.requestCount')} value={statusSummary.requests} />
              <GatewayStatCard colors={colors} label={t('gateway.routingStrategy')} value={statusSummary.routing} />
              <GatewayStatCard colors={colors} label={t('gateway.exposureScope')} value={statusSummary.exposure} />
              <GatewayStatCard colors={colors} label={t('gateway.regionLogLevel')} value={`${statusSummary.region} / ${statusSummary.logLevel}`} />
              <GatewayStatCard colors={colors} label={t('gateway.lastSync')} value={statusSummary.sync} />
            </div>

            <Alert>
              <AlertTitle>{t('gateway.runtimeSummary')}</AlertTitle>
              <AlertDescription>
                {`${t('gateway.errorHistory')} ${statusSummary.errorCount}，${t('gateway.currently')}${status.running ? t('gateway.started') : t('gateway.notStarted')}，${hasUnsavedChanges ? t('gateway.pageHasUnsavedChanges') : t('gateway.pageConfigSyncedStatus')}`}
              </AlertDescription>
            </Alert>

            {/* Prompt Caching 统计 */}
            {requestLogSummary.requestsWithCache > 0 && (
              <GatewaySubCard>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{t('gateway.promptCaching')}</div>
                    <Badge variant="default" className="text-xs">{t('gateway.savings')} {requestLogSummary.costSavings}%</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{t('gateway.hitRate')}</span>
                      <span className="font-semibold">{requestLogSummary.cacheHitRate}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{t('gateway.read')}</span>
                      <span className="font-semibold text-green-600">{requestLogSummary.totalCacheReadTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{t('gateway.write')}</span>
                      <span className="font-semibold">{requestLogSummary.totalCacheCreationTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{t('gateway.io')}</span>
                      <span className="font-semibold">{requestLogSummary.totalInputTokens.toLocaleString()}/{requestLogSummary.totalOutputTokens.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </GatewaySubCard>
            )}

            <GatewaySubCard>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-semibold">{t('gateway.opsSuggestions')}</div>
                  <Badge variant={filteredRequestLogSummary.errors ? 'secondary' : 'default'}>
                    {filteredRequestLogSummary.errors ? t('gateway.priorityErrorDetails') : t('gateway.priorityRequestTrends')}
                  </Badge>
                </div>
                <div className={`text-sm text-muted-foreground`}>
                  {t('gateway.opsSuggestionsDesc')}
                </div>
              </div>
            </GatewaySubCard>
          </div>
        </GatewaySurfaceCard>

        <GatewaySurfaceCard colors={colors}>
          <div className="flex flex-col gap-3">
            <GatewaySectionHeader
              colors={colors}
              title={t('gateway.operationsTroubleshooting')}
              badge={<Badge variant={errorHistory.length ? 'secondary' : 'default'}>{integrationSummary.errorDigest}</Badge>}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GatewayStatCard colors={colors} label={t('gateway.logStatus')} value={integrationSummary.logDirState} />
              <GatewayStatCard colors={colors} label={t('gateway.errorDigest')} value={integrationSummary.errorDigest} />
            </div>

            <GatewayPathCard
              value={logDir || t('gateway.notYetRetrieved')}
              actions={(
                <Button variant="outline" onClick={handleOpenLogDir}>
                  <FolderOpen size={16} className="mr-1" />
                  {t('gateway.openLogDir')}
                </Button>
              )}
            />

            <GatewayErrorHistoryCard errorHistory={errorHistory} />
          </div>
        </GatewaySurfaceCard>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <GatewaySurfaceCard colors={colors}>
          <div className="flex flex-col gap-3">
            <GatewaySectionHeader
              colors={colors}
              icon={Activity}
              title={t('gateway.requestLogs')}
              actions={(
                <div className="flex items-center gap-2">
                  <Badge variant="default">gateway-request-log.jsonl</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadRequestLogs()}
                    disabled={requestLogsLoading}
                  >
                    <RefreshCw size={14} className={`mr-1 ${requestLogsLoading ? 'animate-spin' : ''}`} />
                    {t('gateway.refreshLogs')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearRequestLogs}
                    disabled={requestLogsLoading || !requestLogs.length}
                  >
                    {t('gateway.clearLogs')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenLogDir}
                  >
                    <FolderOpen size={14} className="mr-1" />
                    {t('gateway.openDirectory')}
                  </Button>
                </div>
              )}
            />

            <div className={`text-sm text-muted-foreground`}>
              {t('gateway.logsDescription')} {lastRequestLogsSyncAt}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="outcome-filter">{t('gateway.outcomeFilter')}</Label>
                <Select value={requestLogOutcome} onValueChange={(value) => setRequestLogOutcome(value || 'all')}>
                  <SelectTrigger id="outcome-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('gateway.allResults')}</SelectItem>
                    <SelectItem value="success">{t('gateway.successOnly')}</SelectItem>
                    <SelectItem value="stream">{t('gateway.streamingOnly')}</SelectItem>
                    <SelectItem value="error">{t('gateway.errorOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="query-search">{t('gateway.keywordSearch')}</Label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="query-search"
                    placeholder={t('gateway.searchPlaceholder')}
                    value={searchInput}
                    onChange={handleSearchChange}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <GatewayStatCard colors={colors} label={t('gateway.displayingTotal')} value={`${filteredRequestLogSummary.total} / ${requestLogSummary.total}`} />
              <GatewayStatCard colors={colors} label={t('gateway.successStreaming')} value={`${filteredRequestLogSummary.success} / ${filteredRequestLogSummary.streaming}`} />
              <GatewayStatCard colors={colors} label={t('gateway.errorCount')} value={filteredRequestLogSummary.errors} />
              <GatewayStatCard colors={colors} label={t('gateway.latestRecordMaxDuration')} value={filteredRequestLogSummary.latestOccurredAt} detail={filteredRequestLogSummary.maxDurationLabel} />
            </div>

            <GatewayPathCard value={logDir || t('gateway.notYetRetrieved')} />

            {/* 请求明细表格 */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex justify-between items-center">
                <div className="text-sm font-semibold">{t('gateway.requestDetails')}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={filteredRequestLogSummary.errors ? 'destructive' : 'default'}>
                    {filteredRequestLogSummary.errors ? `${filteredRequestLogSummary.errors} ${t('gateway.errorRecords')}` : t('gateway.noErrorRecords')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRequestDetailExpanded(!isRequestDetailExpanded)}
                    className="h-6 w-6 p-0"
                  >
                    {isRequestDetailExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
              </div>

              {isRequestDetailExpanded && (
                <>
                  {!filteredRequestLogs.length ? (
                    <Alert>
                      <AlertTitle>{t('gateway.noRequestLogs')}</AlertTitle>
                      <AlertDescription>
                        {requestLogs.length
                          ? t('gateway.noMatchingResults')
                          : t('gateway.noLogsWritten')}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <VirtualizedRequestLogTable filteredRequestLogs={filteredRequestLogs} />
                  )}
                </>
              )}
            </div>
          </div>
        </GatewaySurfaceCard>

        <GatewaySurfaceCard colors={colors}>
          <div className="flex flex-col gap-5">
            {/* 标题区域 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full"></div>
                <Radio size={18} className="text-primary" />
                <div className="text-base font-semibold text-foreground">{t('gateway.statisticsView')}</div>
              </div>
              <Badge variant={requestMetrics.errorRateLabel === '0%' ? 'default' : 'secondary'} className="text-xs">
                {t('gateway.successRate')} {requestMetrics.successRateLabel} / {t('gateway.errorRateLabel')} {requestMetrics.errorRateLabel}
              </Badge>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10 hover:shadow-sm transition-shadow">
                <div className="text-xs text-muted-foreground mb-1.5">{t('gateway.avgDuration')}</div>
                <div className="text-xl font-bold text-foreground">{requestMetrics.avgDurationLabel}</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10 hover:shadow-sm transition-shadow">
                <div className="text-xs text-muted-foreground mb-1.5">{t('gateway.modelCount')}</div>
                <div className="text-xl font-bold text-foreground">{requestMetrics.uniqueModels}</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10 hover:shadow-sm transition-shadow">
                <div className="text-xs text-muted-foreground mb-1.5">{t('gateway.upstreamSourceCount')}</div>
                <div className="text-xl font-bold text-foreground">{requestMetrics.uniqueUpstreams}</div>
              </div>
              <div className="border rounded-lg p-4 bg-gradient-to-br from-muted/30 to-muted/10 hover:shadow-sm transition-shadow">
                <div className="text-xs text-muted-foreground mb-1.5">{t('gateway.statisticalSample')}</div>
                <div className="text-xl font-bold text-foreground">{requestMetrics.total}</div>
              </div>
            </div>

            {/* 统计可视化 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 热门模型 */}
              <div className="border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-shadow">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    {t('gateway.topModels')}
                  </div>
                </div>
                <div className="p-5">
                  {requestMetrics.topModels.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">{t('gateway.noStatistics')}</div>
                  ) : (
                    <div className="space-y-3">
                      {requestMetrics.topModels.map((item: any, idx: number) => (
                        <MetricBar key={idx} label={item.label} count={item.count} percent={item.percent} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 热门上游来源 */}
              <div className="border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-shadow">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    {t('gateway.topUpstreamSources')}
                  </div>
                </div>
                <div className="p-5">
                  {requestMetrics.topUpstreams.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">{t('gateway.noStatistics')}</div>
                  ) : (
                    <div className="space-y-3">
                      {requestMetrics.topUpstreams.map((item: any, idx: number) => (
                        <MetricBar key={idx} label={item.label} count={item.count} percent={item.percent} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 状态码分布 */}
              <div className="border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-shadow">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    {t('gateway.statusCodeDistribution')}
                  </div>
                </div>
                <div className="p-5">
                  {requestMetrics.topStatuses.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">{t('gateway.noStatistics')}</div>
                  ) : (
                    <div className="space-y-3">
                      {requestMetrics.topStatuses.map((item: any, idx: number) => {
                        const statusCode = parseInt(item.label)
                        const isError = statusCode >= 400
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs h-6 min-w-[56px] justify-center font-mono ${isError ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}
                            >
                              {item.label}
                            </Badge>
                            <MetricBar label="" count={item.count} percent={item.percent} isError={isError} className="flex-1" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 端点 & Region */}
              <div className="border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-shadow">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    {t('gateway.endpointAndRegion')}
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  {/* 端点 */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                      <div className="w-0.5 h-3 bg-muted-foreground/50 rounded-full"></div>
                      {t('gateway.endpoint')}
                    </div>
                    {requestMetrics.topEndpoints.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">{t('gateway.noStatistics')}</div>
                    ) : (
                      <div className="space-y-3">
                        {requestMetrics.topEndpoints.map((item: any, idx: number) => (
                          <MetricBar key={idx} label={item.label} count={item.count} percent={item.percent} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Region */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                      <div className="w-0.5 h-3 bg-muted-foreground/50 rounded-full"></div>
                      Region
                    </div>
                    {requestMetrics.topRegions.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">{t('gateway.noStatistics')}</div>
                    ) : (
                      <div className="space-y-3">
                        {requestMetrics.topRegions.map((item: any, idx: number) => (
                          <MetricBar key={idx} label={item.label} count={item.count} percent={item.percent} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GatewaySurfaceCard>
      </div>
    </>
  )
}

// 提取行渲染组件，使用 React.memo 优化
const RequestLogTableRow = React.memo(({
  item,
  virtualRow,
  isExpanded,
  onToggle
}: {
  item: ProcessedRequestLog
  virtualRow: any
  isExpanded: boolean
  onToggle: () => void
}) => {
  const hasDetails = !!(item.error || item.requestBody || item.responseBody)

  return (
    <div
      className={`flex flex-col text-sm border-b absolute top-0 left-0 w-full ${
        item.outcome === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''
      }`}
      style={{
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <div
        className={`flex hover:bg-muted/30 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
      <div className="flex-shrink-0 w-[80px] p-3 font-mono text-xs text-muted-foreground">
        #{item.requestIndex ?? '-'}
      </div>
      <div className="flex-shrink-0 w-[140px] p-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Badge
              variant={item.outcome === 'success' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {item.outcome || 'unknown'}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${item.statusCode >= 400 ? 'border-red-500 text-red-500' : ''}`}
            >
              {item.statusCode || 0}
            </Badge>
          </div>
          {item.stream && (
            <Badge variant="outline" className="text-xs border-blue-500 text-blue-500 w-fit">
              stream
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 w-[120px] p-3">
        <span className="text-xs">{item.endpoint || '-'}</span>
      </div>
      <div className="flex-shrink-0 w-[160px] p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">{item.model || t('gateway.notRecorded')}</span>
          <span className="text-xs text-muted-foreground">{item.region || '-'}</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-[160px] p-3">
        {item.totalTokens > 0 ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-mono">{item.inputTokens.toLocaleString()} → {item.outputTokens.toLocaleString()}</span>
            {item.hasCache && (
              <span className="text-xs text-green-600">
                ⚡ {item.cacheReadTokens > 0 ? `${t('gateway.read')}${item.cacheReadTokens.toLocaleString()}` : ''}{item.cacheReadTokens > 0 && item.cacheCreationTokens > 0 ? ' ' : ''}{item.cacheCreationTokens > 0 ? `${t('gateway.write')}${item.cacheCreationTokens.toLocaleString()}` : ''}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
      <div className="flex-shrink-0 w-[180px] p-3">
        <span className="text-xs">
          {(() => {
            const source = item.upstreamSource || t('gateway.unresolved')
            const parts = source.split(':')
            return parts.length > 1 ? parts[parts.length - 1] : source
          })()}
        </span>
      </div>
      <div className="flex-shrink-0 w-[100px] p-3">
        <span className="text-xs font-mono font-semibold">
          {formatGatewayRequestDuration(item.durationMs)}
        </span>
      </div>
      <div className="flex-shrink-0 w-[140px] p-3">
        <span className="text-xs text-muted-foreground">{item.occurredAt || '-'}</span>
      </div>
      <div className="flex-1 min-w-[120px] p-3">
        <span className="text-xs text-muted-foreground">{item.clientIp || '-'}</span>
      </div>
      </div>

      {/* 展开的详情区域 */}
      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 border-t bg-muted/10">
          {item.error && (
            <div className="mt-2">
              <div className="text-xs text-red-600 font-semibold mb-1">{t('gateway.errorInfo')}</div>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {item.error}
              </pre>
            </div>
          )}
          {(item.requestBody || item.responseBody) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 mt-2">
              {item.requestBody && (
                <div>
                  <div className="text-xs font-semibold mb-1">{t('gateway.requestBody')}</div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {item.requestBody}
                  </pre>
                </div>
              )}
              {item.responseBody && (
                <div>
                  <div className="text-xs font-semibold mb-1">{t('gateway.responseBody')}</div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {item.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

RequestLogTableRow.displayName = 'RequestLogTableRow'

function VirtualizedRequestLogTable({ filteredRequestLogs }: { filteredRequestLogs: RequestLog[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: keyof RequestLog | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'desc'
  })
  const [containerHeight, setContainerHeight] = useState(600)

  // 响应式高度调整
  useEffect(() => {
    const handleResize = () => {
      const availableHeight = window.innerHeight - 500
      setContainerHeight(Math.max(400, Math.min(800, availableHeight)))
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 预计算行数据，避免在渲染时重复计算
  const processedLogs = useMemo<ProcessedRequestLog[]>(() => {
    let logs = filteredRequestLogs.map(item => {
      const inputTokens = item.inputTokens || 0
      const outputTokens = item.outputTokens || 0
      const cacheReadTokens = item.cacheReadInputTokens || 0
      const cacheCreationTokens = item.cacheCreationInputTokens || 0

      return {
        ...item,
        hasCache: cacheReadTokens > 0 || cacheCreationTokens > 0,
        totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
      }
    })

    // 应用排序
    if (sortConfig.key) {
      logs.sort((a, b) => {
        const aVal = a[sortConfig.key!]
        const bVal = b[sortConfig.key!]

        if (aVal === bVal) return 0

        const comparison = aVal > bVal ? 1 : -1
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }

    return logs
  }, [filteredRequestLogs, sortConfig])

  // 切换排序
  const handleSort = useCallback((key: keyof RequestLog) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  // 切换行展开状态
  const toggleRow = useCallback((index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }, [])

  // 动态行高估算（考虑展开状态）
  const estimateSize = useCallback((index: number) => {
    const item = processedLogs[index]
    if (!item) return 80

    const isExpanded = expandedRows.has(index)
    const hasDetails = !!(item.error || item.requestBody || item.responseBody)

    // 基础高度
    let baseHeight = 80
    if (item.error) baseHeight = 100
    else if (item.stream) baseHeight = 90

    // 展开状态额外高度
    if (isExpanded && hasDetails) {
      let expandedHeight = 100
      if (item.error) expandedHeight += 80
      if (item.requestBody || item.responseBody) expandedHeight += 120
      return baseHeight + expandedHeight
    }

    return baseHeight
  }, [processedLogs, expandedRows])

  const rowVirtualizer = useVirtualizer({
    count: processedLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
  })

  // 筛选后自动滚动到顶部
  useEffect(() => {
    if (rowVirtualizer && processedLogs.length > 0) {
      rowVirtualizer.scrollToIndex(0, { align: 'start' })
    }
  }, [filteredRequestLogs.length, rowVirtualizer])

  const hasDetailedLogs = useMemo(
    () => filteredRequestLogs.some(item => item.error || item.requestBody || item.responseBody),
    [filteredRequestLogs]
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* 表头 */}
          <div className="bg-muted/50 border-b">
            <div className="flex text-sm">
              <div className="flex-shrink-0 w-[80px] p-3 font-semibold">#</div>
              <div
                className="flex-shrink-0 w-[140px] p-3 font-semibold cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleSort('statusCode')}
              >
                {t('gateway.status')} {sortConfig.key === 'statusCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div className="flex-shrink-0 w-[120px] p-3 font-semibold">{t('gateway.endpoint')}</div>
              <div
                className="flex-shrink-0 w-[160px] p-3 font-semibold cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleSort('model')}
              >
                {t('gateway.model')} {sortConfig.key === 'model' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div className="flex-shrink-0 w-[160px] p-3 font-semibold">Tokens</div>
              <div className="flex-shrink-0 w-[180px] p-3 font-semibold">{t('gateway.account')}</div>
              <div
                className="flex-shrink-0 w-[100px] p-3 font-semibold cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleSort('durationMs')}
              >
                {t('gateway.duration')} {sortConfig.key === 'durationMs' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div
                className="flex-shrink-0 w-[140px] p-3 font-semibold cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleSort('occurredAt')}
              >
                {t('gateway.time')} {sortConfig.key === 'occurredAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div className="flex-1 min-w-[120px] p-3 font-semibold">{t('gateway.client')}</div>
            </div>
          </div>

          {/* 虚拟化表体 */}
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height: `${containerHeight}px` }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                <RequestLogTableRow
                  key={virtualRow.key}
                  item={processedLogs[virtualRow.index]}
                  virtualRow={virtualRow}
                  isExpanded={expandedRows.has(virtualRow.index)}
                  onToggle={() => toggleRow(virtualRow.index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 展开详情（可选） */}
      {hasDetailedLogs && (
        <div className="border-t bg-muted/20 p-3">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              {t('gateway.viewDetailedLogs')}
            </summary>
            <div className="mt-3 space-y-3">
              {filteredRequestLogs.map((item, idx) => {
                if (!item.error && !item.requestBody && !item.responseBody) return null
                return (
                  <div key={`detail-${idx}`} className="border rounded-lg p-3 bg-background">
                    <div className="text-xs font-semibold mb-2">
                      #{item.requestIndex ?? '-'} - {item.occurredAt || '-'}
                    </div>
                    {item.error && (
                      <div className="mb-2">
                        <div className="text-xs text-red-600 font-semibold mb-1">{t('gateway.errorInfo')}</div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                          {item.error}
                        </pre>
                      </div>
                    )}
                    {(item.requestBody || item.responseBody) && (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                        {item.requestBody && (
                          <div>
                            <div className="text-xs font-semibold mb-1">{t('gateway.requestBody')}</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                              {item.requestBody}
                            </pre>
                          </div>
                        )}
                        {item.responseBody && (
                          <div>
                            <div className="text-xs font-semibold mb-1">{t('gateway.responseBody')}</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                              {item.responseBody}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

export default GatewayObservability
