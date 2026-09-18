export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function parseLocalIntent(
  input: string,
  folders: Array<{ id: string; name: string; parentId?: string | null; isHome?: boolean }> = [],
  notes: Array<{ id: string; title: string; content: string; folderId?: string | null }> = []
): { message: string; action?: { id: string; type: string; [key: string]: any } } {
  const trimmed = input.trim()
  const lower = trimmed.toLowerCase()

  // 1. Criar pasta: "crie a pasta PROMPTS", "criar pasta dev", "nova pasta X"
  const folderMatch = lower.match(/(?:criar|crie|nova|adicionar|adicione)\s+(?:uma\s+)?pasta\s+(?:chamada\s+)?["']?([^"'\n\r]+)["']?/i)
  if (folderMatch) {
    const folderName = folderMatch[1].trim()
    return {
      message: `Entendido! Preparei a criação da pasta "${folderName}". Confirme no card abaixo para executar:`,
      action: { id: generateId(), type: 'create_folder', name: folderName }
    }
  }

  // 2. Mover nota: "mova a nota X para a pasta Y", "mover nota A para B"
  const moveMatch = lower.match(/(?:mover|mova)\s+(?:a\s+)?nota\s+["']?([^"'\n\r]+)["']?\s+para\s+(?:a\s+pasta\s+)?["']?([^"'\n\r]+)["']?/i)
  if (moveMatch) {
    const noteSearch = moveMatch[1].trim()
    const folderSearch = moveMatch[2].trim()

    const targetNote = notes.find(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()))
    const targetFolder = folders.find(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()))

    if (targetNote && targetFolder) {
      return {
        message: `Localizei a nota "${targetNote.title}" e a pasta de destino "${targetFolder.name}". Confirme a mudança:`,
        action: { id: generateId(), type: 'move_note', noteId: targetNote.id, noteTitle: targetNote.title, folderId: targetFolder.id, folderName: targetFolder.name }
      }
    } else if (!targetNote) {
      return { message: `Não encontrei nenhuma nota com o nome correspondente a "${noteSearch}".` }
    } else {
      return { message: `Não encontrei nenhuma pasta de destino com o nome correspondente a "${folderSearch}".` }
    }
  }

  // 3. Transformar pasta em Hub: "transforme a pasta X em hub", "tornar a pasta X um hub"
  const hubMatch = lower.match(/(?:transforme|tornar|tornar a|definir|torne)\s+(?:a\s+pasta\s+)?["']?([^"'\n\r]+)["']?\s+(?:em|como|um)?\s*hub/i)
  if (hubMatch) {
    const folderSearch = hubMatch[1].trim()
    const targetFolder = folders.find(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
    if (targetFolder) {
      return {
        message: `Deseja alternar a pasta "${targetFolder.name}" para status de Hub Central?`,
        action: { id: generateId(), type: 'toggle_hub', folderId: targetFolder.id, folderName: targetFolder.name, isHome: !targetFolder.isHome }
      }
    }
    return { message: `Não encontrei a pasta "${folderSearch}" para transformar em Hub.` }
  }

  // 4. Renomear pasta: "renomear pasta X para Y", "renomeie a pasta X para Y"
  const renameMatch = lower.match(/(?:renomear|renomeie)\s+(?:a\s+pasta\s+)?["']?([^"'\n\r]+)["']?\s+para\s+["']?([^"'\n\r]+)["']?/i)
  if (renameMatch) {
    const oldName = renameMatch[1].trim()
    const newName = renameMatch[2].trim()
    const targetFolder = folders.find(f => f.name.toLowerCase().includes(oldName.toLowerCase()))
    if (targetFolder) {
      return {
        message: `Preparei a renomeação da pasta "${targetFolder.name}" para "${newName}". Confirme:`,
        action: { id: generateId(), type: 'rename_folder', folderId: targetFolder.id, folderName: targetFolder.name, newName }
      }
    }
    return { message: `Não encontrei a pasta "${oldName}".` }
  }

  // 5. Criar nota: "criar nota X", "crie uma nota sobre Y"
  const noteCreateMatch = lower.match(/(?:criar|crie|nova)\s+(?:uma\s+)?nota\s+(?:chamada|sobre|com o título)?\s*["']?([^"'\n\r]+)["']?/i)
  if (noteCreateMatch) {
    const noteTitle = noteCreateMatch[1].trim()
    return {
      message: `Entendido! Preparei a criação da nota "${noteTitle}". Confirme no card abaixo:`,
      action: { id: generateId(), type: 'create_note', title: noteTitle, content: `# ${noteTitle}\n\nNota criada pelo Assistente Organon.` }
    }
  }

  // Fallback assistente geral
  return {
    message: `Olá! Sou o Orquestrador IA do Organon.\n\nPosso executar os seguintes comandos de organização:\n\n• **"Criar pasta [Nome]"** (ex: *crie a pasta PROMPTS*)\n• **"Mova a nota [Nome] para [Pasta]"** (ex: *mova a nota DevTools para a pasta Tools*)\n• **"Transforme a pasta [Nome] em Hub"**\n• **"Renomear pasta [Nome] para [NovoNome]"**\n• **"Criar nota [Título]"**\n\n*(Dica: Você também pode configurar sua chave de API nas configurações de IA para respostas avançadas de LLM!)*`
  }
}
