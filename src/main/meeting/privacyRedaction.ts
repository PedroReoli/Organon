export interface PrivacyRedactionReport {
  applied: boolean
  total: number
  categories: Record<string, number>
}

export interface RedactedText {
  text: string
  report: PrivacyRedactionReport
}

function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (double) { digit *= 2; if (digit > 9) digit -= 9 }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

export function redactSensitiveText(input: string): RedactedText {
  const categories: Record<string, number> = {}
  const counters = new Map<string, number>()
  const placeholder = (category: string) => {
    const next = (counters.get(category) || 0) + 1
    counters.set(category, next)
    categories[category] = next
    return `[${category.toUpperCase()}_${next}]`
  }
  let text = String(input || '')

  text = text.replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/gi, () => placeholder('private_key'))
  text = text.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, () => `Bearer ${placeholder('token')}`)
  text = text.replace(/\b(api[_-]?key|access[_-]?token|auth[_-]?token|secret|password|senha)\s*[:=]\s*(['"]?)[^\s'",;]{6,}\2/gi, (_match, label) => `${label}=${placeholder('secret')}`)
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => placeholder('email'))
  text = text.replace(/\b\d{3}[.-]?\d{3}[.-]?\d{3}-?\d{2}\b/g, () => placeholder('cpf'))
  text = text.replace(/\b\d{2}[.-]?\d{3}[.-]?\d{3}[\/]?\d{4}-?\d{2}\b/g, () => placeholder('cnpj'))
  text = text.replace(/\b(?:\d[ -]?){13,19}\b/g, match => passesLuhn(match) ? placeholder('card') : match)
  text = text.replace(/(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}(?!\d)/g, () => placeholder('phone'))
  text = text.replace(/\bC:\\Users\\[^\\\s]+/gi, () => `C:\\Users\\${placeholder('user_path')}`)
  text = text.replace(/\/(?:home|Users)\/[^/\s]+/g, match => `${match.slice(0, match.lastIndexOf('/') + 1)}${placeholder('user_path')}`)

  const total = Object.values(categories).reduce((sum, count) => sum + count, 0)
  return { text, report: { applied: total > 0, total, categories } }
}
