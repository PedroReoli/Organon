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

module.exports = {
  handleNoteList,
  handleNoteRead,
  handleNoteCreate,
  handleNoteUpdate,
  handleNoteDelete
};
