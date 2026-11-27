/** Text colour (white or near-black) readable on a `#rrggbb` background, from its WCAG relative luminance. */
export function textColorOn(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return '#fff'
  const [r = 0, g = 0, b = 0] = m.slice(1, 4).map((h) => {
    const c = parseInt(h, 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.179 ? '#1a1a1a' : '#fff'
}
