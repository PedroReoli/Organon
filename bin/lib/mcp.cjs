/**
 * Organon MCP (Model Context Protocol) Server via stdio
 * Allows AI Agents (Claude Code, Cursor, Antigravity, Jules) to operate
 * Organon natively using standard JSON-RPC 2.0 tools.
 */

const readline = require('readline');
const store = require('./store.cjs');
const taskCmd = require('./commands/task.cjs');
const noteCmd = require('./commands/note.cjs');
const doctorCmd = require('./commands/doctor.cjs');
const domain = require('./mcp-domain.cjs');
const packageJson = require('../../package.json');

const BASE_TOOLS = [
  {
    name: 'organon_status',
    description: 'Obtém o estado geral, versão, métricas e contagens do Organon.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'organon_doctor',
    description: 'Executa diagnóstico de integridade do banco SQLite, diretórios e modelos.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'organon_task_list',
    description: 'Lista tarefas com filtros opcionais (today, status, priority, limit).',
    inputSchema: {
      type: 'object',
      properties: {
        today: { type: 'boolean', description: 'Filtrar tarefas de hoje' },
        status: { type: 'string', enum: ['all', 'todo', 'in_progress', 'done'], description: 'Filtrar por status' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        limit: { type: 'number', description: 'Limite de tarefas retornadas' }
      }
    }
  },
  {
    name: 'organon_task_create',
    description: 'Cria uma tarefa. Prefira título de até 48 caracteres, etiquetas curtas e detalhes completos em description.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Nome curto da ação, recomendado até 48 caracteres.' },
        description: { type: 'string', description: 'Explicação completa, contexto e critérios da tarefa.' },
        date: { type: 'string', description: 'Data (YYYY-MM-DD)' },
        time: { type: 'string', description: 'Horário (HH:mm)' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas curtas usadas nos cartões do planejamento.' }
      }
    }
  },
  {
    name: 'organon_task_done',
    description: 'Alterna ou marca uma tarefa como concluída.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título da tarefa' }
      }
    }
  },
  {
    name: 'organon_task_update',
    description: 'Atualiza uma tarefa. Mantenha título curto, use tags para identificação rápida e description para detalhes.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', description: 'Explicação completa da tarefa.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas exibidas nos cartões.' },
        status: { type: 'string' },
        priority: { type: 'string' },
        date: { type: ['string', 'null'] },
        time: { type: ['string', 'null'] },
        durationMinutes: { type: 'number' },
        reminder: {}
      }
    }
  },
  {
    name: 'organon_task_delete',
    description: 'Remove uma tarefa existente por ID ou título.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: { idOrTitle: { type: 'string' } }
    }
  },
  {
    name: 'organon_note_list',
    description: 'Lista notas do cofre com busca ou filtro por pasta.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Nome da pasta' },
        search: { type: 'string', description: 'Termo de busca no título/conteúdo' }
      }
    }
  },
  {
    name: 'organon_note_read',
    description: 'Lê o conteúdo Markdown de uma nota específica.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título exato da nota' }
      }
    }
  },
  {
    name: 'organon_note_create',
    description: 'Cria uma nova nota em Markdown no cofre.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Título da nota' },
        content: { type: 'string', description: 'Conteúdo em Markdown' },
        folder: { type: 'string', description: 'Pasta de destino' }
      }
    }
  },
  {
    name: 'organon_note_update',
    description: 'Atualiza o título, conteúdo, anexo ou prepend de uma nota existente.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título da nota' },
        title: { type: 'string', description: 'Novo título (opcional)' },
        content: { type: 'string', description: 'Novo conteúdo em Markdown (substitui anterior)' },
        append: { type: 'string', description: 'Texto a acrescentar no final' },
        prepend: { type: 'string', description: 'Texto a acrescentar no início' }
      }
    }
  },
  {
    name: 'organon_note_delete',
    description: 'Remove uma nota por ID ou título.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título da nota' }
      }
    }
  },
  {
    name: 'organon_note_move',
    description: 'Move uma nota para outra pasta ou a transforma em subpágina de outra nota.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título da nota a mover' },
        folder: { type: 'string', description: 'Nome da pasta de destino' },
        parent: { type: 'string', description: 'ID ou título da nota pai (para subpágina)' }
      }
    }
  },
  {
    name: 'organon_note_rename',
    description: 'Renomeia uma nota.',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle', 'newTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título atual' },
        newTitle: { type: 'string', description: 'Novo título para a nota' }
      }
    }
  },
  {
    name: 'organon_note_set',
    description: 'Altera atributos da nota (ícone, capa, fixada, favorita, trancada, tags).',
    inputSchema: {
      type: 'object',
      required: ['idOrTitle'],
      properties: {
        idOrTitle: { type: 'string', description: 'ID ou título da nota' },
        icon: { type: 'string', description: 'Emoji de ícone (ex: 🚀)' },
        pinned: { type: 'boolean', description: 'Fixar nota no topo' },
        favorite: { type: 'boolean', description: 'Marcar como favorita' },
        lock: { type: 'boolean', description: 'Trancar/proteger nota' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Lista de tags' }
      }
    }
  },
  {
    name: 'organon_folder_list',
    description: 'Lista todas as pastas de notas e quantidade de notas em cada uma.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'organon_folder_create',
    description: 'Cria uma nova pasta no cofre de notas.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', description: 'Nome da pasta' },
        parent: { type: 'string', description: 'Nome ou ID da pasta pai (opcional)' }
      }
    }
  },
  {
    name: 'organon_folder_delete',
    description: 'Exclui uma pasta de notas (as notas filhas retornam para a raiz).',
    inputSchema: {
      type: 'object',
      required: ['idOrName'],
      properties: {
        idOrName: { type: 'string', description: 'ID ou nome da pasta' }
      }
    }
  },
  {
    name: 'organon_batch_mutate',
    description: 'Valida e aplica um lote atômico e idempotente de tarefas, notas e pastas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['requestId', 'expectedRevision', 'operations'],
      properties: {
        requestId: { type: 'string', minLength: 8, maxLength: 128 },
        expectedRevision: { type: 'integer', minimum: 0 },
        dryRun: { type: 'boolean', default: false },
        operations: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['opId', 'kind', 'input'],
            properties: {
              opId: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,64}$' },
              kind: { type: 'string', enum: ['task.create', 'task.update', 'task.delete', 'note.create', 'note.update', 'note.append', 'note.metadata', 'folder.create'] },
              input: { type: 'object' }
            }
          }
        }
      }
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'organon_undo',
    description: 'Reverte um checkpoint por nova transação, recusando divergência ou compensando apenas entidades tocadas.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['requestId', 'checkpointId', 'expectedCurrentRevision'],
      properties: {
        requestId: { type: 'string', minLength: 8, maxLength: 128 },
        checkpointId: { type: 'string' },
        expectedCurrentRevision: { type: 'integer', minimum: 0 },
        mode: { type: 'string', enum: ['reject-if-diverged', 'compensating'], default: 'reject-if-diverged' },
        dryRun: { type: 'boolean', default: false }
      }
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'organon_notes_search',
    description: 'Busca híbrida local em títulos e conteúdo das notas, com scores lexical e de similaridade.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: { type: 'string', minLength: 2 },
        folderId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        limit: { type: 'integer', minimum: 1, maximum: 100 }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'organon_schedule_pressure',
    description: 'Calcula carga, incerteza e sobreposições da agenda sem alterar dados.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        timezone: { type: 'string' },
        capacityMinutesPerDay: { type: 'number', minimum: 30 },
        includeUndated: { type: 'boolean' }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'organon_pending_digest',
    description: 'Consolida tarefas, vencimentos, lembretes e follow-ups de reunião sem mutação.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        projectId: { type: 'string' },
        priority: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 200 }
      }
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }
];

const MUTATING_TOOLS = new Set([
  'organon_task_create', 'organon_task_done', 'organon_task_update', 'organon_task_delete',
  'organon_note_create', 'organon_note_update', 'organon_note_delete', 'organon_note_move',
  'organon_note_rename', 'organon_note_set', 'organon_folder_create', 'organon_folder_delete',
]);

const MCP_TOOLS = BASE_TOOLS.map(tool => ({
  ...tool,
  outputSchema: tool.outputSchema || {
    type: 'object',
    required: ['data'],
    properties: { data: {} },
    additionalProperties: false
  },
  annotations: tool.annotations || {
    readOnlyHint: !MUTATING_TOOLS.has(tool.name),
    destructiveHint: MUTATING_TOOLS.has(tool.name),
    idempotentHint: !MUTATING_TOOLS.has(tool.name),
    openWorldHint: false,
  },
})).sort((left, right) => left.name.localeCompare(right.name));

function handleToolCall(name, args = {}) {
  switch (name) {
    case 'organon_status':
      return store.getSystemStatus();
    case 'organon_doctor':
      return doctorCmd.handleDoctor({ json: true });
    case 'organon_task_list':
      return taskCmd.handleTaskList(args);
    case 'organon_task_create':
      return taskCmd.handleTaskCreate(args);
    case 'organon_task_done':
      return taskCmd.handleTaskDone(args.idOrTitle);
    case 'organon_task_update':
      return taskCmd.handleTaskUpdate(args.idOrTitle, args);
    case 'organon_task_delete':
      return taskCmd.handleTaskDelete(args.idOrTitle);
    case 'organon_note_list':
      return noteCmd.handleNoteList(args);
    case 'organon_note_read':
      return noteCmd.handleNoteRead(args.idOrTitle);
    case 'organon_note_create':
      return noteCmd.handleNoteCreate(args);
    case 'organon_note_update':
      return noteCmd.handleNoteUpdate(args.idOrTitle, args);
    case 'organon_note_delete':
      return noteCmd.handleNoteDelete(args.idOrTitle);
    case 'organon_note_move':
      return noteCmd.handleNoteMove(args.idOrTitle, args);
    case 'organon_note_rename':
      return noteCmd.handleNoteRename(args.idOrTitle, args.newTitle || args.title);
    case 'organon_note_set':
      return noteCmd.handleNoteSet(args.idOrTitle, args);
    case 'organon_folder_list':
      return noteCmd.handleFolderList();
    case 'organon_folder_create':
      return noteCmd.handleFolderCreate(args.name, args.parent);
    case 'organon_folder_delete':
      return noteCmd.handleFolderDelete(args.idOrName || args.name);
    case 'organon_batch_mutate':
      return domain.handleBatchMutate(args);
    case 'organon_undo':
      return domain.handleUndo(args);
    case 'organon_notes_search':
      return domain.handleNotesSearch(args);
    case 'organon_schedule_pressure':
      return domain.handleSchedulePressure(args);
    case 'organon_pending_digest':
      return domain.handlePendingDigest(args);
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

const MODERN_PROTOCOL = '2026-07-28';
const LEGACY_PROTOCOLS = ['2025-11-25', '2025-06-18', '2024-11-05'];
const SERVER_INFO = { name: 'organon-mcp-server', version: packageJson.version };
const RATE_LIMIT_PER_MINUTE = 120;
const recentCalls = [];

function sendResult(id, result, modern = false) {
  const payload = modern
    ? { ...result, _meta: { ...(result._meta || {}), 'io.modelcontextprotocol/serverInfo': SERVER_INFO } }
    : result;
  console.log(JSON.stringify({ jsonrpc: '2.0', id, result: payload }));
}

function sendError(id, code, message, data) {
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data === undefined ? {} : { data }) }
  }));
}

function requestProtocol(msg) {
  return msg.params?._meta?.['io.modelcontextprotocol/protocolVersion']
    || msg._meta?.['io.modelcontextprotocol/protocolVersion']
    || null;
}

function enforceRateLimit() {
  const cutoff = Date.now() - 60_000;
  while (recentCalls.length > 0 && recentCalls[0] < cutoff) recentCalls.shift();
  if (recentCalls.length >= RATE_LIMIT_PER_MINUTE) {
    throw new domain.McpDomainError('RATE_LIMITED', 'Limite local de chamadas excedido; tente novamente em instantes.');
  }
  recentCalls.push(Date.now());
}

function startMcpServer() {
  process.stderr.write(`[Organon MCP] Servidor iniciado via stdio JSON-RPC 2.0\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    const raw = line.trim();
    if (!raw) return;

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (parseErr) {
      sendError(null, -32700, 'JSON inválido.');
      process.stderr.write(`[Organon MCP] Erro de parse JSON: ${parseErr.message}\n`);
      return;
    }

    try {
      const id = msg.id;
      const protocol = requestProtocol(msg);
      const modern = protocol === MODERN_PROTOCOL;

      if (msg.method === 'server/discover') {
        sendResult(id, {
          protocolVersions: [MODERN_PROTOCOL, ...LEGACY_PROTOCOLS],
          capabilities: { tools: { listChanged: false } },
          instructions: 'Use dryRun antes de lotes destrutivos e preserve expectedRevision. Em tarefas, prefira título de até 48 caracteres, tags curtas e explicação completa em description.',
          ttlMs: 3_600_000,
          cacheScope: 'private'
        }, true);
        return;
      }

      if (msg.method === 'initialize') {
        const requested = msg.params?.protocolVersion;
        const selected = LEGACY_PROTOCOLS.includes(requested) ? requested : LEGACY_PROTOCOLS[0];
        sendResult(id, {
          protocolVersion: selected,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: 'Use organon_batch_mutate com dryRun e expectedRevision para mutações compostas. Em tarefas, prefira título de até 48 caracteres, tags curtas e explicação completa em description.'
        });
        return;
      }

      if (msg.method === 'tools/list') {
        sendResult(id, {
          ...(modern ? { resultType: 'result' } : {}),
          tools: MCP_TOOLS,
          ...(modern ? { ttlMs: 3_600_000, cacheScope: 'private' } : {})
        }, modern);
        return;
      }

      if (msg.method === 'tools/call') {
        const toolName = msg.params?.name;
        const toolArgs = msg.params?.arguments || {};
        if (!MCP_TOOLS.some(tool => tool.name === toolName)) {
          sendError(id, -32602, `Ferramenta desconhecida: ${toolName}`);
          return;
        }
        try {
          enforceRateLimit();
          const res = handleToolCall(toolName, toolArgs);
          const structuredContent = { data: res };
          sendResult(id, {
            ...(modern ? { resultType: 'result' } : {}),
            content: [{ type: 'text', text: typeof res === 'string' ? res : JSON.stringify(res, null, 2) }],
            structuredContent
          }, modern);
        } catch (err) {
          const failure = {
            error: {
              code: err.code || 'INTERNAL_ERROR',
              message: err.message || 'Falha interna na ferramenta.',
              ...(err.details === undefined ? {} : { details: err.details })
            }
          };
          sendResult(id, {
            ...(modern ? { resultType: 'result' } : {}),
            isError: true,
            content: [{ type: 'text', text: JSON.stringify(failure, null, 2) }],
            structuredContent: failure
          }, modern);
        }
        return;
      }

      if (msg.method === 'notifications/initialized') {
        // Notification, no reply needed
        return;
      }

      // Default method not found
      if (id !== undefined) {
        sendError(id, -32601, `Método não suportado: ${msg.method}`);
      }
    } catch (error) {
      sendError(msg?.id ?? null, -32603, error.message || 'Falha interna.');
    }
  });
}

module.exports = {
  startMcpServer,
  MCP_TOOLS,
  handleToolCall,
  MODERN_PROTOCOL,
};
