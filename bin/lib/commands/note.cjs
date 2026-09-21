const path = require('path');
const store = require('../store.cjs');

function handleNoteList(options = {}) {
  const notesData = store.getNotesData();
  let notes = notesData.notes || [];

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
  const found = notesData.notes.find(n =>
    n.id.toLowerCase() === queryLower ||
    n.id.toLowerCase().startsWith(queryLower) ||
    n.title.toLowerCase().includes(queryLower)
  );
  return { notesData, note: found };
}

function handleNoteRead(idOrTitle) {
  const { note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Note not found matching: "${idOrTitle}"`);
  }
  const content = store.readNoteContent(note);
  return {
    id: note.id,
    title: note.title,
    mdPath: note.mdPath,
    updatedAt: note.updatedAt,
    content
  };
}

function handleNoteCreate(options = {}) {
  if (!options.title) {
    throw new Error("Note title is required (--title=\"...\")");
  }

  const notesData = store.getNotesData();
  let folderId = null;

  if (options.folder) {
    let folder = notesData.noteFolders.find(f =>
      f.name.toLowerCase() === options.folder.toLowerCase()
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

  notesData.notes.push(newNote);
  store.writeNoteContent(mdPath, options.content || `# ${options.title}\n\n`);
  store.saveNotesData(notesData);

  return newNote;
}

function handleNoteUpdate(idOrTitle, options = {}) {
  const { notesData, note } = findNote(idOrTitle);
  if (!note) {
    throw new Error(`Note not found matching: "${idOrTitle}"`);
  }

  if (options.title) {
    note.title = options.title;
  }
  if (options.content !== undefined) {
    store.writeNoteContent(note.mdPath, options.content);
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
  return (notesData.noteFolders || []).map(f => {
    const count = (notesData.notes || []).filter(n => n.folderId === f.id).length;
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

module.exports = {
  handleNoteList,
  handleNoteRead,
  handleNoteCreate,
  handleNoteUpdate,
  handleNoteDelete,
  handleNoteMove,
  handleNoteRename,
  handleNoteOrganize,
  handleNoteSet,
  handleFolderList,
  handleFolderCreate,
  handleFolderDelete,
};

