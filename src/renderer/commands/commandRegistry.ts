export type CommandGroup = 'view' | 'note' | 'task' | 'action'

export type CommandResult = {
  ok: boolean
  message?: string
  entityId?: string
}

export interface CommandDefinition {
  id: string
  group: CommandGroup
  title: string
  description?: string
  keywords: string[]
  shortcut?: string
  mutates: boolean
  preview?: string
  isAvailable?: () => boolean
  run: () => CommandResult | void | Promise<CommandResult | void>
}

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

export function rankCommands(commands: CommandDefinition[], query: string): CommandDefinition[] {
  const needle = normalize(query)
  return commands
    .filter(command => command.isAvailable?.() !== false)
    .map(command => {
      if (!needle) return { command, score: command.group === 'action' ? 30 : 10 }
      const title = normalize(command.title)
      const description = normalize(command.description || '')
      const keywords = command.keywords.map(normalize)
      let score = 0
      if (title === needle) score = 100
      else if (title.startsWith(needle)) score = 80
      else if (title.includes(needle)) score = 60
      else if (keywords.some(keyword => keyword.startsWith(needle))) score = 45
      else if (keywords.some(keyword => keyword.includes(needle)) || description.includes(needle)) score = 30
      return { command, score }
    })
    .filter(item => !needle || item.score > 0)
    .sort((a, b) => b.score - a.score || a.command.group.localeCompare(b.command.group) || a.command.title.localeCompare(b.command.title, 'pt-BR'))
    .map(item => item.command)
}
