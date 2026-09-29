const fs = require('fs');
const path = require('path');

const FIXTURE_ROOT = path.join(__dirname, '..', 'fixtures', 'storage');
const PROFILE_NAMES = ['small', 'medium', 'large'];
const FIXED_DATE = '2026-09-29T12:00:00.000Z';

function readProfile(name) {
  if (!PROFILE_NAMES.includes(name)) throw new Error(`Perfil desconhecido: ${name}`);
  const profile = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, `${name}.json`), 'utf8'));
  if (profile.schemaVersion !== 1 || profile.name !== name) throw new Error(`Fixture inválida: ${name}`);
  return profile;
}

function createStore(profile) {
  const { cards, notes, meetings } = profile.counts;
  return {
    version: 10,
    cards: Array.from({ length: cards }, (_, index) => ({
      id: `card-${profile.seed}-${index}`,
      title: `Tarefa ${index}`,
      description: `Descrição determinística ${profile.seed + index}`,
      status: index % 7 === 0 ? 'done' : 'todo',
      priority: `P${(index % 4) + 1}`,
      date: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
      durationMinutes: 15 + (index % 8) * 15,
      tags: [`grupo-${index % 12}`, `seed-${profile.seed}`],
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    })),
    notes: Array.from({ length: notes }, (_, index) => ({
      id: `note-${profile.seed}-${index}`,
      title: `Nota ${index}`,
      mdPath: `fixtures/nota-${index}.md`,
      folderId: `folder-${index % 20}`,
      tags: [`tema-${index % 16}`],
      isLocked: false,
      order: index,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    })),
    noteFolders: Array.from({ length: Math.min(20, notes) }, (_, index) => ({
      id: `folder-${index}`,
      name: `Pasta ${index}`,
      parentId: null,
      order: index,
    })),
    meetings: Array.from({ length: meetings }, (_, index) => ({
      id: `meeting-${profile.seed}-${index}`,
      title: `Reunião ${index}`,
      date: FIXED_DATE,
      durationSeconds: 900 + index,
      transcript: `Transcrição determinística da reunião ${index}.`,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    })),
    settings: { themeName: 'dark-default', dataDir: null, installerCompleted: true, backupEnabled: false, backupIntervalMinutes: 15 },
    storeUpdatedAt: FIXED_DATE,
  };
}

function materializeProfile(name) {
  const profile = readProfile(name);
  return { profile, store: createStore(profile) };
}

module.exports = { PROFILE_NAMES, materializeProfile };

