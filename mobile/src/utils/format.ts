/** Formata valor como moeda BRL */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Trunca string com reticências */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.substring(0, max - 3) + '...'
}

/** Capitaliza primeira letra */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Gera ID único simples */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

/** Remove HTML tags para exibir como plain text */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}
