import { TFunction } from 'i18next'

/**
 * Maps backend error strings to i18n keys for translated display.
 * Falls back to the original message if no mapping exists.
 */
export function mapBackendError(error: unknown, t: TFunction): string {
  const raw = typeof error === 'string' ? error : String(error)
  const lower = raw.toLowerCase()

  // Login / Auth
  if (lower.includes('login cancelled') || lower.includes('cancel')) {
    return t('login.cancelled')
  }
  if (lower.includes('state parameter not received') || lower.includes('未收到 state')) {
    return t('errors.stateMissing')
  }
  if (lower.includes('state mismatch') || lower.includes('state 不匹配')) {
    return t('errors.stateMismatch')
  }
  if (lower.includes('authorization timeout') || lower.includes('授权超时')) {
    return t('errors.authTimeout')
  }
  if (lower.includes('authorization code not received') || lower.includes('未收到授权码')) {
    return t('errors.authCodeMissing')
  }
  if (lower.includes('refresh token has expired') || lower.includes('refreshtoken 已失效')) {
    return t('errors.refreshTokenExpired')
  }
  if (lower.includes('invalid start url') || lower.includes('start url 无效')) {
    return t('errors.startUrlInvalid')
  }
  if (lower.includes('failed to get email')) {
    return t('errors.getEmailFailed')
  }
  if (lower.includes('failed to save account data') || lower.includes('保存账号数据失败')) {
    return t('errors.saveAccountFailed')
  }

  // Account
  if (raw.includes('BANNED') || lower.includes('账号已被封禁')) {
    return t('accounts.accountBanned')
  }
  if (lower.includes('account not found') || lower.includes('账号不存在') || lower.includes('account does not exist')) {
    return t('errors.accountNotFound')
  }
  if (lower.includes('account is missing userid') || lower.includes('缺少 userId')) {
    return t('errors.accountMissingIdentifiers')
  }
  if (lower.includes('remote deletion') || lower.includes('不支持远程删除')) {
    return t('errors.remoteDeleteNotSupported')
  }
  if (lower.includes('no account data found in database') || lower.includes('数据库中没有账号数据')) {
    return t('errors.noCliAccounts')
  }
  if (lower.includes('multiple accounts found in database') || lower.includes('数据库中有多个账号')) {
    return t('errors.multipleCliAccounts')
  }

  // Browser / Misc
  if (lower.includes('browser path is empty') || lower.includes('浏览器路径为空')) {
    return t('errors.browserPathEmpty')
  }

  // Gateway
  if (lower.includes('client api key')) {
    return t('errors.clientApiKeyInvalid')
  }
  if (lower.includes('no available account') || lower.includes('未找到符合反代配置的可用账号')) {
    return t('errors.noAvailableAccount')
  }
  if (lower.includes('loadbalancer') || lower.includes('未能选择可用账号')) {
    return t('errors.loadBalancerFailed')
  }

  // Fallback: return raw message
  return raw
}
