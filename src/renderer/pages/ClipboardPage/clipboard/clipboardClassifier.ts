import type { ClipboardContentType } from '@types'

// ── Regexes ───────────────────────────────────────────────────────────────────

const RE_HEX_COLOR   = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const RE_RGB_COLOR   = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*[\d.]+)?\s*\)$/i
const RE_HSL_COLOR   = /^hsla?\(\s*\d{1,3}\s*,\s*[\d.]+%\s*,\s*[\d.]+%(\s*,\s*[\d.]+)?\s*\)$/i

const RE_URL         = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i
const RE_URL_LOOSE   = /^(www\.)[^\s/$.?#].[^\s]*$/i

const RE_EMAIL       = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

// Password heuristic: 12+ chars, no spaces, at least 3 of: uppercase, lowercase, digit, symbol
const RE_UPPER     = /[A-Z]/
const RE_LOWER     = /[a-z]/
const RE_DIGIT     = /[0-9]/
const RE_SYMBOL    = /[^a-zA-Z0-9\s]/

// Phone: formatos BR e internacionais
const RE_PHONE_BR  = /^\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}$/
const RE_PHONE_INT = /^\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,4}$/

// Documentos BR: CPF e CNPJ
const RE_CPF       = /^\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}$/
const RE_CNPJ      = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-.]?\d{2}$/

// JSON heuristic
const RE_JSON_OBJ  = /^\s*\{[\s\S]*\}\s*$/
const RE_JSON_ARR  = /^\s*\[[\s\S]*\]\s*$/

// SQL keywords
const RE_SQL       = /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|EXPLAIN)\b/im

// Markdown indicators
const RE_MARKDOWN  = /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\[.+\]\(.+\)|\*\*.+\*\*|__.+__)/m

// Code heuristic keywords/patterns
const CODE_PATTERNS = [
  /^\s*(import|export|const|let|var|function|class|interface|type|return|if|for|while)\b/m,
  /[{};]\s*$/m,
  /=>/,
  /\bfunction\s*\(/,
  /^\s*<\/?[a-zA-Z][a-zA-Z0-9]*[\s/>]/m,  // JSX/HTML tags
  /^\s*(def |class |import |from |print\()/m, // Python
  /\$\{[^}]+\}/,  // template literals
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function looksLikeUrl(s: string): boolean {
  return RE_URL.test(s) || RE_URL_LOOSE.test(s)
}

function looksLikeEmail(s: string): boolean {
  return RE_EMAIL.test(s)
}

function isValidJson(s: string): boolean {
  if (!RE_JSON_OBJ.test(s) && !RE_JSON_ARR.test(s)) return false
  try { JSON.parse(s); return true } catch { return false }
}

// ── Classifier ────────────────────────────────────────────────────────────────

export function classifyClipboardContent(content: string): ClipboardContentType {
  const trimmed = content.trim()
  if (!trimmed) return 'text'

  // Color
  if (RE_HEX_COLOR.test(trimmed)) return 'color'
  if (RE_RGB_COLOR.test(trimmed)) return 'color'
  if (RE_HSL_COLOR.test(trimmed)) return 'color'

  // URL
  if (looksLikeUrl(trimmed)) return 'url'

  // Email
  if (looksLikeEmail(trimmed)) return 'email'

  // Phone (BR e internacional)
  if (RE_PHONE_BR.test(trimmed) || RE_PHONE_INT.test(trimmed)) return 'phone'

  // Documentos BR (CPF/CNPJ)
  if (RE_CPF.test(trimmed) || RE_CNPJ.test(trimmed)) return 'document'

  // JSON (antes de code — JSON valido e mais especifico)
  if (isValidJson(trimmed)) return 'json'

  // SQL
  if (RE_SQL.test(trimmed)) return 'sql'

  // Markdown (multi-line com indicadores claros)
  if (trimmed.includes('\n') && RE_MARKDOWN.test(trimmed)) return 'markdown'

  // Code (check before password — code blocks can look like "passwords")
  if (trimmed.length > 20 || trimmed.includes('\n')) {
    const isCode = CODE_PATTERNS.some(re => re.test(trimmed))
    if (isCode) return 'code'
  }

  // Password: 12+ chars, no spaces/newlines, at least 3 complexity factors,
  // e nao parece URL/email
  if (
    trimmed.length >= 12 && trimmed.length <= 80 &&
    !/[\s\n]/.test(trimmed) &&
    !looksLikeUrl(trimmed) && !looksLikeEmail(trimmed)
  ) {
    const factors = [
      RE_UPPER.test(trimmed),
      RE_LOWER.test(trimmed),
      RE_DIGIT.test(trimmed),
      RE_SYMBOL.test(trimmed),
    ]
    if (factors.filter(Boolean).length >= 3) return 'password'
  }

  return 'text'
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const CONTENT_TYPE_LABELS: Record<ClipboardContentType, string> = {
  color:    'Cor',
  url:      'Link',
  email:    'E-mail',
  password: 'Senha',
  code:     'Código',
  json:     'JSON',
  sql:      'SQL',
  markdown: 'Markdown',
  phone:    'Telefone',
  document: 'Documento',
  text:     'Texto',
}

export const CONTENT_TYPE_ORDER: ClipboardContentType[] = [
  'color',
  'url',
  'email',
  'phone',
  'document',
  'password',
  'json',
  'sql',
  'markdown',
  'code',
  'text',
]

export const CONTENT_TYPE_COLORS: Record<ClipboardContentType, string> = {
  color:    'var(--color-primary)',
  url:      '#38bdf8',
  email:    '#34d399',
  phone:    '#2dd4bf',
  document: '#fbbf24',
  password: '#f87171',
  json:     '#c084fc',
  sql:      '#60a5fa',
  markdown: '#a3e635',
  code:     '#fb923c',
  text:     '#94a3b8',
}
