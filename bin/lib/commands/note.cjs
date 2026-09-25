const path = require('path');
const store = require('../store.cjs');

function handleNoteList(options = {}) {
  const notesData = store.getNotesData();
  let notes = notesData.notes || [];

  if (!options.all && !options.trash) {
    notes = notes.filter(n => !n.deletedAt && !n.isDeleted);
  } else if (options.trash) {
    notes = notes.filter(n => n.deletedAt || n.isDeleted);
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    notes = notes.filter(n => (n.title || '').toLowerCase().includes(q));
  }

  if (options.folder) {
    const folder = notesData.noteFolders.find(f =>
      f.name.toLowerCase() === options.folder.toLowerCase() || f.id === options.folder
    );
    if (folder) {
      notes = notes.filter(n => n.folderId === folder.id);
    }
  }

  return notes.map(n => {
    const folder = notesData.noteFolders.find(f => f.id === n.folderId);
    return {
      id: n.id,
      title: n.title,
      folder: folder ? folder.name : 'Geral',
      updatedAt: n.updatedAt,
      mdPath: n.mdPath
    };
  });
}

function findNote(query) {
  const notesData = store.getNotesData();
  const queryLower = (query || '').toLowerCase().trim();
  const activeNotes = notesData.notes.filter(n => !n.deletedAt && !n.isDeleted);
  let found = activeNotes.find(n =>
    n.id.toLowerCase() === queryLower ||
    n.id.toLowerCase().startsWith(queryLower) ||
    n.title.toLowerCase() === queryLower
  );
  if (!found) {
    found = activeNotes.find(n => n.title.toLowerCase().includes(queryLower));
  }
  // Fallback to all notes if not found in active
  if (!found) {
    found = notesData.notes.find(n =>
      n.id.toLowerCase() === queryLower ||
      n.id.toLowerCase().startsWith(queryLower) ||
      n.title.toLowerCase().includes(queryLower)
    );
  }
  return { notesData, note: found };
}

function handleNoteRead(idOrTitle) {
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Note not found matching: "${idOrTitle}"`);
  }
  const folder = note.folderId ? (notesData.noteFolders || []).find(f => f.id === note.folderId) : null;
  const content = store.readNoteContent(note);
  return {
    id: note.id,
    title: note.title,
    folder: folder ? folder.name : 'Raiz',
    folderId: note.folderId || null,
    mdPath: note.mdPath,
    updatedAt: note.updatedAt,
    content
  };
}

function resolveContentFromOptions(options = {}) {
  const fs = require('fs');
  if (options.file || options.f) {
    const targetFile = options.file || options.f;
    if (fs.existsSync(targetFile)) {
      return fs.readFileSync(targetFile, 'utf8');
    }
    throw new Error(`Arquivo não encontrado: "${targetFile}"`);
  }
  if (options.stdin || options.content === '-') {
    try {
      return fs.readFileSync(0, 'utf8');
    } catch {
      // Falha ao ler stdin
    }
  }
  return options.content;
}

function handleNoteCreate(options = {}) {
  if (!options.title) {
    throw new Error("Note title is required (--title=\"...\")");
  }

  const notesData = store.getNotesData();
  let folderId = null;
  let folderName = 'Raiz';

  if (options.folder) {
    let folder = notesData.noteFolders.find(f =>
      f.name.toLowerCase() === options.folder.toLowerCase() || f.id === options.folder
    );
    if (!folder) {
      folder = {
        id: store.randomUUID(),
        name: options.folder,
        parentId: null,
        order: notesData.noteFolders.length
      };
      notesData.noteFolders.push(folder);
    }
    folderId = folder.id;
    folderName = folder.name;
  }

  const noteId = store.randomUUID();
  const safeTitle = options.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const mdPath = `${safeTitle}--${noteId.slice(0, 8)}.md`;

  const newNote = {
    id: noteId,
    title: options.title,
    mdPath,
    folderId,
    isLocked: false,
    order: notesData.notes.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const resolvedContent = resolveContentFromOptions(options);

  notesData.notes.push(newNote);
  store.writeNoteContent(mdPath, resolvedContent !== undefined ? resolvedContent : `# ${options.title}\n\n`);
  store.saveNotesData(notesData);

  return {
    ...newNote,
    folder: folderName
  };
}

function handleNoteUpdate(idOrTitle, options = {}) {
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Note not found matching: "${idOrTitle}"`);
  }

  if (options.title) {
    note.title = options.title;
  }

  const resolvedContent = resolveContentFromOptions(options);

  if (resolvedContent !== undefined) {
    store.writeNoteContent(note.mdPath, resolvedContent);
  } else if (options.append !== undefined) {
    const existing = store.readNoteContent(note);
    store.writeNoteContent(note.mdPath, existing.trimEnd() + '\n\n' + options.append + '\n');
  } else if (options.prepend !== undefined) {
    const existing = store.readNoteContent(note);
    store.writeNoteContent(note.mdPath, options.prepend + '\n\n' + existing.trimStart());
  }

  note.updatedAt = new Date().toISOString();
  store.saveNotesData(notesData);
  return note;
}

function handleNoteDelete(idOrTitle) {
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Note not found matching: "${idOrTitle}"`);
  }

  notesData.notes = notesData.notes.filter(n => n.id !== note.id);
  store.saveNotesData(notesData);
  return { deletedId: note.id, title: note.title };
}

function handleNoteMove(idOrTitle, options = {}) {
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Nota não encontrada para: "${idOrTitle}"`);
  }

  let movedTarget = '';

  if (options.parent) {
    const { note: parentNote } = findNote(options.parent);
    if (!parentNote) {
      throw new Error(`Nota pai não encontrada: "${options.parent}"`);
    }
    if (parentNote.id === note.id) {
      throw new Error("Uma nota não pode ser subpágina de si mesma");
    }
    note.parentNoteId = parentNote.id;
    note.folderId = parentNote.folderId || null;
    movedTarget = `subpágina de "${parentNote.title}"`;
  } else if (options.folder !== undefined) {
    if (!options.folder || options.folder.toLowerCase() === 'raiz' || options.folder.toLowerCase() === 'geral') {
      note.folderId = null;
      note.parentNoteId = null;
      movedTarget = 'Raiz (Geral)';
    } else {
      let folder = notesData.noteFolders.find(f =>
        f.name.toLowerCase() === options.folder.toLowerCase() || f.id === options.folder
      );
      if (!folder) {
        folder = {
          id: store.randomUUID(),
          name: options.folder,
          parentId: null,
          order: notesData.noteFolders.length,
          isHome: false,
        };
        notesData.noteFolders.push(folder);
      }
      note.folderId = folder.id;
      note.parentNoteId = null;
      movedTarget = `pasta "${folder.name}"`;
    }
  } else {
    throw new Error("Especifique o destino: --folder=\"NomeDaPasta\" ou --parent=\"NotaPai\"");
  }

  note.updatedAt = new Date().toISOString();
  store.saveNotesData(notesData);
  return { id: note.id, title: note.title, movedTarget, folderId: note.folderId, parentNoteId: note.parentNoteId };
}

function handleNoteRename(idOrTitle, newTitle) {
  if (!newTitle || !newTitle.trim()) {
    throw new Error("Novo título é obrigatório (--title=\"Novo Título\")");
  }
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Nota não encontrada para: "${idOrTitle}"`);
  }

  const oldTitle = note.title;
  note.title = newTitle.trim();
  note.updatedAt = new Date().toISOString();
  store.saveNotesData(notesData);
  return { id: note.id, oldTitle, title: note.title };
}

function handleNoteOrganize(options = {}) {
  const notesData = store.getNotesData();
  const by = options.by || 'alphabet'; // alphabet | recent | created

  if (by === 'alphabet') {
    notesData.notes.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (by === 'recent') {
    notesData.notes.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  } else if (by === 'created') {
    notesData.notes.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }

  notesData.notes.forEach((n, idx) => {
    n.order = idx;
  });

  if (options.folders) {
    notesData.noteFolders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    notesData.noteFolders.forEach((f, idx) => {
      f.order = idx;
    });
  }

  store.saveNotesData(notesData);
  return { totalNotes: notesData.notes.length, organizedBy: by };
}

function handleNoteSet(idOrTitle, options = {}) {
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Nota não encontrada para: "${idOrTitle}"`);
  }

  if (options.icon !== undefined) note.icon = options.icon || null;
  if (options.cover !== undefined) note.cover = options.cover || null;
  if (options.pinned !== undefined) note.isPinned = options.pinned === true || options.pinned === 'true';
  if (options.favorite !== undefined) note.isFavorite = options.favorite === true || options.favorite === 'true';
  if (options.lock !== undefined) note.isLocked = options.lock === true || options.lock === 'true';
  if (options.tags !== undefined) {
    note.tags = Array.isArray(options.tags) ? options.tags : options.tags.split(',').map(t => t.trim());
  }

  note.updatedAt = new Date().toISOString();
  store.saveNotesData(notesData);
  return note;
}

function handleFolderList() {
  const notesData = store.getNotesData();
  const folders = (notesData.noteFolders || []).filter(f => !f.deletedAt && !f.isDeleted);
  return folders.map(f => {
    const count = (notesData.notes || []).filter(n => !n.deletedAt && !n.isDeleted && n.folderId === f.id).length;
    return {
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      order: f.order,
      notesCount: count
    };
  });
}

function handleFolderCreate(name, parentNameOrId) {
  if (!name || !name.trim()) throw new Error("Nome da pasta é obrigatório");
  const notesData = store.getNotesData();

  let parentId = null;
  if (parentNameOrId) {
    const parentFolder = notesData.noteFolders.find(f =>
      f.name.toLowerCase() === parentNameOrId.toLowerCase() || f.id === parentNameOrId
    );
    if (parentFolder) parentId = parentFolder.id;
  }

  const newFolder = {
    id: store.randomUUID(),
    name: name.trim(),
    parentId,
    order: notesData.noteFolders.length,
    isHome: false,
  };

  notesData.noteFolders.push(newFolder);
  store.saveNotesData(notesData);
  return newFolder;
}

function handleFolderDelete(idOrName) {
  const notesData = store.getNotesData();
  const folder = notesData.noteFolders.find(f =>
    f.id === idOrName || f.name.toLowerCase() === (idOrName || '').toLowerCase()
  );
  if (!folder) throw new Error(`Pasta não encontrada: "${idOrName}"`);

  // Move orpas to root
  notesData.notes.forEach(n => {
    if (n.folderId === folder.id) {
      n.folderId = null;
    }
  });

  notesData.noteFolders = notesData.noteFolders.filter(f => f.id !== folder.id);
  store.saveNotesData(notesData);
  return { deletedId: folder.id, name: folder.name };
}

function polishMarkdown(rawContent, title, options = {}) {
  let content = rawContent || '';
  // Normalizar quebras de linha Windows/Unix
  content = content.replace(/\r\n/g, '\n');

  // Remover espaços em branco no final de cada linha
  content = content.split('\n').map(line => line.trimEnd()).join('\n');

  // Corrigir títulos sem espaço: ex: "###Título" -> "### Título"
  content = content.replace(/^(#{1,6})([^#\s\n])/gm, '$1 $2');

  // Corrigir listas sem espaço: ex: "-Item" -> "- Item"
  content = content.replace(/^([*-])([^\s*-])/gm, '$1 $2');

  // Corrigir listas numeradas: ex: "1.Item" -> "1. Item"
  content = content.replace(/^(\d+\.)([^\s])/gm, '$1 $2');

  // Reduzir 3 ou mais quebras de linhas consecutivas para no máximo 2
  content = content.replace(/\n{3,}/g, '\n\n');

  // Se solicitado ou se a nota não tiver H1 inicial, garante cabeçalho
  if (options.ensureTitle && title && !content.trim().startsWith('#')) {
    content = `# ${title}\n\n` + content.trim();
  }

  // Finalizar com quebra de linha limpa
  return content.trim() + '\n';
}

function handleNotePolish(idOrTitle, options = {}) {
  const notesData = store.getNotesData();

  if (idOrTitle === '--all' || options.all || !idOrTitle) {
    let polishedCount = 0;
    const details = [];

    for (const note of notesData.notes) {
      const original = store.readNoteContent(note);
      const polished = polishMarkdown(original, note.title, options);
      if (polished !== original) {
        store.writeNoteContent(note.mdPath, polished);
        note.updatedAt = new Date().toISOString();
        polishedCount++;
        details.push({ id: note.id, title: note.title, diff: polished.length - original.length });
      }
    }
    if (polishedCount > 0) {
      store.saveNotesData(notesData);
    }
    return { total: notesData.notes.length, polishedCount, details };
  }

  const { note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Nota não encontrada para: "${idOrTitle}"`);
  }

  const original = store.readNoteContent(note);
  const polished = polishMarkdown(original, note.title, options);
  store.writeNoteContent(note.mdPath, polished);
  note.updatedAt = new Date().toISOString();
  store.saveNotesData(notesData);

  return {
    id: note.id,
    title: note.title,
    charsBefore: original.length,
    charsAfter: polished.length,
    diff: polished.length - original.length
  };
}

function handleNoteEmptyTrash() {
  const notesData = store.getNotesData();
  const trashedNotes = notesData.notes.filter(n => n.deletedAt || n.isDeleted);
  const trashedFolders = notesData.noteFolders.filter(f => f.deletedAt || f.isDeleted);

  let filesRemoved = 0;
  for (const n of trashedNotes) {
    if (n.mdPath && store.deleteNoteFile) {
      if (store.deleteNoteFile(n.mdPath)) filesRemoved++;
    }
  }

  notesData.notes = notesData.notes.filter(n => !n.deletedAt && !n.isDeleted);
  notesData.noteFolders = notesData.noteFolders.filter(f => !f.deletedAt && !f.isDeleted);
  store.saveNotesData(notesData);

  return {
    purgedNotes: trashedNotes.length,
    purgedFolders: trashedFolders.length,
    filesRemoved
  };
}

module.exports = {
  handleNoteList,
  handleNoteRead,
  handleNoteCreate,
  handleNoteUpdate,
  handleNoteDelete,
  handleNoteMove,
  handleNoteRename,
  handleNoteOrganize,
  handleNotePolish,
  handleNoteEmptyTrash,
  handleNoteSet,
  handleFolderList,
  handleFolderCreate,
  handleFolderDelete,
};

