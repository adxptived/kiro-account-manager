const STATUS_LABELS = {
  normal: 'Active',
  capped: 'Capped',
  banned: 'Banned',
  invalid: 'Invalid',
  expired: 'Expired'}

const SPECIAL_GROUP_LABELS = {
  __none__: 'No group',
  __has__: 'Has group'}

const SPECIAL_TAG_LABELS = {
  __none__: 'No tags',
  __has__: 'Has tags'}

function pickFirst(values) {
  return Array.isArray(values) ? values[0] || '' : values || ''
}

export function resolveGroupFilterLabel(selectedGroup, allGroups = []) {
  if (!selectedGroup) return ''

  const groupMap = new Map((Array.isArray(allGroups) ? allGroups : []).map(group => [group.id, group]))
  return SPECIAL_GROUP_LABELS[selectedGroup] || groupMap.get(selectedGroup)?.name || selectedGroup
}

export function countActiveFilters({ filters, selectedGroup, selectedTag }) {
  return [
    filters?.subscriptions?.length || 0,
    filters?.statuses?.length || 0,
    filters?.providers?.length || 0,
    filters?.usageRange ? 1 : 0,
    selectedGroup ? 1 : 0,
    selectedTag ? 1 : 0,
  ].reduce((total, count) => total + count, 0)
}

export function buildFilterSummaryItems({
  filters,
  selectedGroup,
  selectedTag,
  allGroups = [],
  allTags = []}) {
  const items = []
  const tagMap = new Map((Array.isArray(allTags) ? allTags : []).map(tag => [tag.id, tag]))

  if (selectedGroup) {
    items.push({
      key: 'group',
      label: 'Group',
      value: resolveGroupFilterLabel(selectedGroup, allGroups)})
  }

  if (selectedTag) {
    items.push({
      key: 'tag',
      label: 'Tag',
      value: SPECIAL_TAG_LABELS[selectedTag] || tagMap.get(selectedTag)?.name || selectedTag})
  }

  const subscription = pickFirst(filters?.subscriptions)
  if (subscription) {
    items.push({ key: 'subscription', label: 'Subscription', value: subscription })
  }

  const status = pickFirst(filters?.statuses)
  if (status) {
    items.push({ key: 'status', label: 'Status', value: STATUS_LABELS[status] || status })
  }

  const provider = pickFirst(filters?.providers)
  if (provider) {
    items.push({ key: 'provider', label: 'Provider', value: provider })
  }

  if (filters?.usageRange) {
    items.push({ key: 'usageRange', label: 'Usage', value: filters.usageRange })
  }

  return items
}
