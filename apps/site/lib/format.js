export const formatBytes = (value) => {
  if (value === null || value === undefined) return "n/a"
  const units = ["B", "KB", "MB", "GB"]
  let index = 0
  let size = value
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size < 10 && index > 0 ? 2 : 1)} ${units[index]}`
}

export const formatMs = (value) => {
  if (value === null || value === undefined) return "n/a"
  return `${Number(value).toFixed(2)} ms`
}

export const formatNumber = (value) => {
  if (value === null || value === undefined) return "n/a"
  return new Intl.NumberFormat("en-US").format(value)
}

export const formatRssKb = (value) => {
  if (value === null || value === undefined) return "n/a"
  return `${formatNumber(value)} kb`
}
