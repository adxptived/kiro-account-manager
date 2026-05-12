import i18n from '../../../../i18n'

function pickNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return ''
}

function normalizeTagLinks(tagLinks) {
  if (!Array.isArray(tagLinks)) return []

  return tagLinks
    .filter(link => link && typeof link === 'object')
    .map(link => ({
      ...link,
      tagId: pickNonEmptyString(link.tagId),
      tagName: pickNonEmptyString(link.tagName) || null,
      linkedAt: pickNonEmptyString(link.linkedAt)}))
    .filter(link => link.tagId)
}

function localizeAccountLabel(label) {
  const value = pickNonEmptyString(label)
  const providerMatch = value.match(/^kiro:(.+):account$/) || value.match(/^Kiro\s+(.+?)\s+(?:账号|account)$/i)
  if (providerMatch) {
    return i18n.t('accounts.providerAccountLabel', { provider: providerMatch[1] })
  }

  const cliMatch = value.match(/^kiro-cli:import:(.+)$/) || value.match(/^从 kiro-cli 导入 \((.+)\)$/) || value.match(/^Imported from kiro-cli \((.+)\)$/)
  if (cliMatch) {
    return i18n.t('accounts.kiroCliImportedLabel', { tokenKey: cliMatch[1] })
  }

  return value
}

export function getSafeAccountDisplayName(account) {
  const normalizedUserId = pickNonEmptyString(account?.userId)

  return pickNonEmptyString(
    account?.email,
    normalizedUserId,
    localizeAccountLabel(account?.label),
  ) || i18n.t('common.unknown')
}

export function getSafeAccountInitial(account) {
  return getSafeAccountDisplayName(account).charAt(0).toUpperCase() || 'U'
}

export function normalizeAccountForUi(account) {
  const source = account && typeof account === 'object' ? account : {}

  return {
    ...source,
    email: pickNonEmptyString(source.email),
    userId: pickNonEmptyString(source.userId),
    label: localizeAccountLabel(source.label),
    status: pickNonEmptyString(source.status) || 'unknown',
    provider: pickNonEmptyString(source.provider),
    authMethod: pickNonEmptyString(source.authMethod),
    addedAt: pickNonEmptyString(source.addedAt),
    expiresAt: pickNonEmptyString(source.expiresAt),
    groupId: pickNonEmptyString(source.groupId) || null,
    machineId: pickNonEmptyString(source.machineId),
    tagLinks: normalizeTagLinks(source.tagLinks),
    usageData: source.usageData && typeof source.usageData === 'object' ? source.usageData : null}
}
