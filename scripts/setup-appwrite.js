#!/usr/bin/env node
/**
 * setup-appwrite.js
 *
 * Cria automaticamente toda a infraestrutura do Appwrite para o Organon:
 *   - Storage Bucket (para sync do store JSON)
 *   - Database + Collections com atributos e índices
 *
 * Uso: npm run setup:appwrite
 */

const { Client, Databases, Storage, Permission, Role, IndexType } = require('node-appwrite')

// ─── Configuração ────────────────────────────────────────────────────────────

const ENDPOINT   = 'https://fra.cloud.appwrite.io/v1'
const PROJECT_ID = '69a04328002453254a38'
const API_KEY    = 'standard_ed815cd52f74da407ff56261510d69db1ccf8110d88b547266f7d75856a133546c976bc00fcbef625150ed6aeaf9dfb357401226dde3d1b8fbcb4fab3d05af57f31ada32333c35e4d02021a6d62e95708239ae7bed5221a924a7b94f04f7561cbb9068f0224af699dd841e60313b3bcff7f3a45b4945e60728c6b96954649f46'

const DATABASE_ID = 'organon-db'
const BUCKET_ID   = 'organon-stores'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok  = (msg) => console.log(`  ✓  ${msg}`)
const skip = (msg) => console.log(`  ~  ${msg} (já existe)`)
const fail = (msg, err) => console.error(`  ✗  ${msg}: ${err.message}`)

async function tryRun(label, fn) {
  try {
    await fn()
    ok(label)
  } catch (err) {
    if (err.code === 409) skip(label)
    else fail(label, err)
  }
}

// Cria atributo de string
function strAttr(db, col, key, size = 255, required = false) {
  return tryRun(
    `  attr ${col}.${key} (string)`,
    () => db.createStringAttribute(DATABASE_ID, col, key, size, required)
  )
}

// Cria atributo inteiro
function intAttr(db, col, key, required = false) {
  return tryRun(
    `  attr ${col}.${key} (integer)`,
    () => db.createIntegerAttribute(DATABASE_ID, col, key, required)
  )
}

// Cria atributo float
function floatAttr(db, col, key, required = false) {
  return tryRun(
    `  attr ${col}.${key} (float)`,
    () => db.createFloatAttribute(DATABASE_ID, col, key, required)
  )
}

// Cria atributo booleano
function boolAttr(db, col, key, required = false) {
  return tryRun(
    `  attr ${col}.${key} (boolean)`,
    () => db.createBooleanAttribute(DATABASE_ID, col, key, required)
  )
}

// Cria índice
function idx(db, col, key, attrs, type = IndexType.Key) {
  return tryRun(
    `  index ${col}[${attrs.join(',')}]`,
    () => db.createIndex(DATABASE_ID, col, key, type, attrs)
  )
}

// Permissões padrão de collection: autenticados fazem CRUD
const userPerms = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
]

// ─── Setup Principal ──────────────────────────────────────────────────────────

async function main() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY)

  const db      = new Databases(client)
  const storage = new Storage(client)

  console.log('\n╔══════════════════════════════════════╗')
  console.log('║   Organon — Setup Appwrite           ║')
  console.log('╚══════════════════════════════════════╝\n')

  // ── 1. Storage Bucket ──────────────────────────────────────────────────────
  console.log('📦 Storage Bucket\n')

  await tryRun('Bucket: organon-stores', () =>
    storage.createBucket(
      BUCKET_ID,
      'Organon Stores',
      userPerms,
      false,          // fileSecurity
      true,           // enabled
      50000000,       // maximumFileSize: 50MB
      [],             // allowedFileExtensions
      'none',         // compression
      false,          // encryption
      false           // antivirus
    )
  )

  // ── 2. Database ────────────────────────────────────────────────────────────
  console.log('\n🗄️  Database\n')

  await tryRun('Database: organon-db', () =>
    db.create(DATABASE_ID, 'Organon DB')
  )

  // ── 3. Collections ─────────────────────────────────────────────────────────

  // ── 3.1 cards ──────────────────────────────────────────────────────────────
  console.log('\n📋 Collection: cards\n')
  await tryRun('collection: cards', () =>
    db.createCollection(DATABASE_ID, 'cards', 'Cards', userPerms)
  )
  await strAttr(db, 'cards', 'userId', 255, true)
  await strAttr(db, 'cards', 'title', 500, true)
  await strAttr(db, 'cards', 'description', 2000)
  await strAttr(db, 'cards', 'priority', 10)       // P1 / P2 / P3 / P4
  await strAttr(db, 'cards', 'status', 20)         // todo / in_progress / blocked / done
  await strAttr(db, 'cards', 'date', 20)           // ISO date
  await strAttr(db, 'cards', 'time', 10)
  await strAttr(db, 'cards', 'locationDay', 15)    // mon / tue / ... / sun
  await strAttr(db, 'cards', 'locationPeriod', 20) // morning / afternoon / night
  await strAttr(db, 'cards', 'projectId', 255)
  await intAttr(db, 'cards', 'order')
  await strAttr(db, 'cards', 'checklist', 3000)    // JSON array
  await strAttr(db, 'cards', 'tags', 500)          // JSON array
  await strAttr(db, 'cards', 'createdAt', 30)
  await strAttr(db, 'cards', 'updatedAt', 30)
  await idx(db, 'cards', 'idx_userId',  ['userId'])
  await idx(db, 'cards', 'idx_date',    ['date'])
  await idx(db, 'cards', 'idx_status',  ['status'])

  // ── 3.2 calendarEvents ────────────────────────────────────────────────────
  console.log('\n📅 Collection: calendarEvents\n')
  await tryRun('collection: calendarEvents', () =>
    db.createCollection(DATABASE_ID, 'calendarEvents', 'Calendar Events', userPerms)
  )
  await strAttr(db, 'calendarEvents', 'userId', 255, true)
  await strAttr(db, 'calendarEvents', 'title', 500, true)
  await strAttr(db, 'calendarEvents', 'date', 20, true)
  await strAttr(db, 'calendarEvents', 'time', 10)
  await strAttr(db, 'calendarEvents', 'description', 5000)
  await strAttr(db, 'calendarEvents', 'color', 30)
  await strAttr(db, 'calendarEvents', 'recurrence', 1000) // JSON
  await strAttr(db, 'calendarEvents', 'reminder', 500)    // JSON
  await strAttr(db, 'calendarEvents', 'createdAt', 30)
  await strAttr(db, 'calendarEvents', 'updatedAt', 30)
  await idx(db, 'calendarEvents', 'idx_userId', ['userId'])
  await idx(db, 'calendarEvents', 'idx_date',   ['date'])

  // ── 3.3 projects ──────────────────────────────────────────────────────────
  console.log('\n📁 Collection: projects\n')
  await tryRun('collection: projects', () =>
    db.createCollection(DATABASE_ID, 'projects', 'Projects', userPerms)
  )
  await strAttr(db, 'projects', 'userId', 255, true)
  await strAttr(db, 'projects', 'name', 500, true)
  await strAttr(db, 'projects', 'path', 1000)
  await strAttr(db, 'projects', 'color', 30)
  await strAttr(db, 'projects', 'ideId', 255)
  await strAttr(db, 'projects', 'description', 5000)
  await strAttr(db, 'projects', 'links', 5000)    // JSON array
  await strAttr(db, 'projects', 'githubUrl', 500)
  await intAttr(db, 'projects', 'order')
  await strAttr(db, 'projects', 'createdAt', 30)
  await strAttr(db, 'projects', 'updatedAt', 30)
  await idx(db, 'projects', 'idx_userId', ['userId'])

  // ── 3.4 notes ─────────────────────────────────────────────────────────────
  console.log('\n📝 Collection: notes\n')
  await tryRun('collection: notes', () =>
    db.createCollection(DATABASE_ID, 'notes', 'Notes', userPerms)
  )
  await strAttr(db, 'notes', 'userId', 255, true)
  await strAttr(db, 'notes', 'title', 500, true)
  await strAttr(db, 'notes', 'folderId', 255)
  await strAttr(db, 'notes', 'projectId', 255)
  await strAttr(db, 'notes', 'mdPath', 500)
  await strAttr(db, 'notes', 'content', 200000) // HTML/markdown content
  await intAttr(db, 'notes', 'order')
  await strAttr(db, 'notes', 'createdAt', 30)
  await strAttr(db, 'notes', 'updatedAt', 30)
  await idx(db, 'notes', 'idx_userId',   ['userId'])
  await idx(db, 'notes', 'idx_folderId', ['folderId'])

  // ── 3.5 noteFolders ───────────────────────────────────────────────────────
  console.log('\n📂 Collection: noteFolders\n')
  await tryRun('collection: noteFolders', () =>
    db.createCollection(DATABASE_ID, 'noteFolders', 'Note Folders', userPerms)
  )
  await strAttr(db, 'noteFolders', 'userId', 255, true)
  await strAttr(db, 'noteFolders', 'name', 500, true)
  await strAttr(db, 'noteFolders', 'parentId', 255)
  await intAttr(db, 'noteFolders', 'order')
  await strAttr(db, 'noteFolders', 'createdAt', 30)
  await idx(db, 'noteFolders', 'idx_userId', ['userId'])

  // ── 3.6 habits ────────────────────────────────────────────────────────────
  console.log('\n🔄 Collection: habits\n')
  await tryRun('collection: habits', () =>
    db.createCollection(DATABASE_ID, 'habits', 'Habits', userPerms)
  )
  await strAttr(db, 'habits', 'userId', 255, true)
  await strAttr(db, 'habits', 'name', 500, true)
  await strAttr(db, 'habits', 'type', 20)       // boolean / count / time / quantity
  await strAttr(db, 'habits', 'frequency', 20)  // daily / weekly
  await strAttr(db, 'habits', 'color', 30)
  await strAttr(db, 'habits', 'unit', 100)
  await intAttr(db, 'habits', 'goal')
  await intAttr(db, 'habits', 'order')
  await boolAttr(db, 'habits', 'active')
  await strAttr(db, 'habits', 'createdAt', 30)
  await idx(db, 'habits', 'idx_userId', ['userId'])

  // ── 3.7 habitEntries ──────────────────────────────────────────────────────
  console.log('\n📊 Collection: habitEntries\n')
  await tryRun('collection: habitEntries', () =>
    db.createCollection(DATABASE_ID, 'habitEntries', 'Habit Entries', userPerms)
  )
  await strAttr(db, 'habitEntries', 'userId', 255, true)
  await strAttr(db, 'habitEntries', 'habitId', 255, true)
  await strAttr(db, 'habitEntries', 'date', 20, true)
  await floatAttr(db, 'habitEntries', 'value')
  await boolAttr(db, 'habitEntries', 'skipped')
  await strAttr(db, 'habitEntries', 'skipReason', 500)
  await idx(db, 'habitEntries', 'idx_userId',  ['userId'])
  await idx(db, 'habitEntries', 'idx_habitId', ['habitId'])
  await idx(db, 'habitEntries', 'idx_date',    ['date'])

  // ── 3.8 crmContacts ───────────────────────────────────────────────────────
  console.log('\n👥 Collection: crmContacts\n')
  await tryRun('collection: crmContacts', () =>
    db.createCollection(DATABASE_ID, 'crmContacts', 'CRM Contacts', userPerms)
  )
  await strAttr(db, 'crmContacts', 'userId', 255, true)
  await strAttr(db, 'crmContacts', 'name', 500, true)
  await strAttr(db, 'crmContacts', 'company', 500)
  await strAttr(db, 'crmContacts', 'email', 500)
  await strAttr(db, 'crmContacts', 'phone', 100)
  await strAttr(db, 'crmContacts', 'stage', 50)
  await strAttr(db, 'crmContacts', 'priority', 10)
  await strAttr(db, 'crmContacts', 'tags', 1000)    // JSON array
  await strAttr(db, 'crmContacts', 'notes', 5000)
  await strAttr(db, 'crmContacts', 'followUpDate', 20)
  await intAttr(db, 'crmContacts', 'order')
  await strAttr(db, 'crmContacts', 'createdAt', 30)
  await strAttr(db, 'crmContacts', 'updatedAt', 30)
  await idx(db, 'crmContacts', 'idx_userId', ['userId'])
  await idx(db, 'crmContacts', 'idx_stage',  ['stage'])

  // ── 3.9 bills ─────────────────────────────────────────────────────────────
  console.log('\n💸 Collection: bills\n')
  await tryRun('collection: bills', () =>
    db.createCollection(DATABASE_ID, 'bills', 'Bills', userPerms)
  )
  await strAttr(db, 'bills', 'userId', 255, true)
  await strAttr(db, 'bills', 'name', 500, true)
  await floatAttr(db, 'bills', 'amount', true)
  await intAttr(db, 'bills', 'dueDay')
  await strAttr(db, 'bills', 'category', 100)
  await boolAttr(db, 'bills', 'active')
  await strAttr(db, 'bills', 'color', 30)
  await strAttr(db, 'bills', 'createdAt', 30)
  await idx(db, 'bills', 'idx_userId', ['userId'])

  // ── 3.10 expenses ─────────────────────────────────────────────────────────
  console.log('\n💳 Collection: expenses\n')
  await tryRun('collection: expenses', () =>
    db.createCollection(DATABASE_ID, 'expenses', 'Expenses', userPerms)
  )
  await strAttr(db, 'expenses', 'userId', 255, true)
  await strAttr(db, 'expenses', 'description', 500, true)
  await floatAttr(db, 'expenses', 'amount', true)
  await strAttr(db, 'expenses', 'date', 20, true)
  await strAttr(db, 'expenses', 'category', 100)
  await strAttr(db, 'expenses', 'type', 20)          // expense / income
  await intAttr(db, 'expenses', 'installments')
  await intAttr(db, 'expenses', 'installmentCurrent')
  await strAttr(db, 'expenses', 'tags', 500)          // JSON
  await strAttr(db, 'expenses', 'createdAt', 30)
  await idx(db, 'expenses', 'idx_userId', ['userId'])
  await idx(db, 'expenses', 'idx_date',   ['date'])

  // ── 3.11 shortcuts ────────────────────────────────────────────────────────
  console.log('\n🔖 Collection: shortcuts\n')
  await tryRun('collection: shortcuts', () =>
    db.createCollection(DATABASE_ID, 'shortcuts', 'Shortcuts', userPerms)
  )
  await strAttr(db, 'shortcuts', 'userId', 255, true)
  await strAttr(db, 'shortcuts', 'title', 500, true)
  await strAttr(db, 'shortcuts', 'url', 2000, true)
  await strAttr(db, 'shortcuts', 'folderId', 255)
  await strAttr(db, 'shortcuts', 'favicon', 500)
  await intAttr(db, 'shortcuts', 'order')
  await strAttr(db, 'shortcuts', 'createdAt', 30)
  await idx(db, 'shortcuts', 'idx_userId',   ['userId'])
  await idx(db, 'shortcuts', 'idx_folderId', ['folderId'])

  // ── 3.12 playbooks ────────────────────────────────────────────────────────
  console.log('\n📘 Collection: playbooks\n')
  await tryRun('collection: playbooks', () =>
    db.createCollection(DATABASE_ID, 'playbooks', 'Playbooks', userPerms)
  )
  await strAttr(db, 'playbooks', 'userId', 255, true)
  await strAttr(db, 'playbooks', 'title', 500, true)
  await strAttr(db, 'playbooks', 'sector', 255)
  await strAttr(db, 'playbooks', 'category', 255)
  await strAttr(db, 'playbooks', 'summary', 2000)
  await strAttr(db, 'playbooks', 'content', 200000)
  await strAttr(db, 'playbooks', 'dialogs', 50000) // JSON array
  await intAttr(db, 'playbooks', 'order')
  await strAttr(db, 'playbooks', 'createdAt', 30)
  await strAttr(db, 'playbooks', 'updatedAt', 30)
  await idx(db, 'playbooks', 'idx_userId', ['userId'])

  // ── 3.13 settings ─────────────────────────────────────────────────────────
  console.log('\n⚙️  Collection: settings\n')
  await tryRun('collection: settings', () =>
    db.createCollection(DATABASE_ID, 'settings', 'Settings', userPerms)
  )
  await strAttr(db, 'settings', 'userId', 255, true)
  await strAttr(db, 'settings', 'themeName', 50)
  await strAttr(db, 'settings', 'dataDir', 500)
  await strAttr(db, 'settings', 'navbarConfig', 3000)     // JSON
  await strAttr(db, 'settings', 'keyboardShortcuts', 2000) // JSON
  await boolAttr(db, 'settings', 'backupEnabled')
  await intAttr(db, 'settings', 'backupIntervalMinutes')
  await strAttr(db, 'settings', 'updatedAt', 30)
  await idx(db, 'settings', 'idx_userId', ['userId'])

  // ── Fim ────────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║  Setup concluído!                                        ║')
  console.log('║                                                          ║')
  console.log('║  Próximos passos no Console Appwrite:                    ║')
  console.log('║  1. Abra o bucket "organon-stores"                       ║')
  console.log('║  2. Em Settings > Platforms, adicione uma Web Platform   ║')
  console.log('║     com hostname "localhost" (dev) e "file://" (Electron)║')
  console.log('║  3. Em Auth > Settings, habilite Email/Password          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message)
  process.exit(1)
})
