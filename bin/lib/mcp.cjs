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

const MCP_TOOLS = [
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
    description: 'Cria uma nova tarefa no planejamento do Organon.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Título da tarefa' },
        date: { type: 'string', description: 'Data (YYYY-MM-DD)' },
        time: { type: 'string', description: 'Horário (HH:mm)' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        tags: { type: 'array', items: { type: 'string' } }
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
  }
];

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
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
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

    try {
      const msg = JSON.parse(raw);
      const id = msg.id;

      if (msg.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'organon-mcp-server',
              version: '6.23.2'
            }
          }
        };
        console.log(JSON.stringify(response));
        return;
      }

      if (msg.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS
          }
        };
        console.log(JSON.stringify(response));
        return;
      }

      if (msg.method === 'tools/call') {
        const toolName = msg.params?.name;
        const toolArgs = msg.params?.arguments || {};
        try {
          const res = handleToolCall(toolName, toolArgs);
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof res === 'string' ? res : JSON.stringify(res, null, 2)
                }
              ]
            }
          };
          console.log(JSON.stringify(response));
        } catch (err) {
          const response = {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: err.message
            }
          };
          console.log(JSON.stringify(response));
        }
        return;
      }

      if (msg.method === 'notifications/initialized') {
        // Notification, no reply needed
        return;
      }

      // Default method not found
      if (id !== undefined) {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Método não suportado: ${msg.method}`
          }
        }));
      }
    } catch (parseErr) {
      process.stderr.write(`[Organon MCP] Erro de parse JSON: ${parseErr.message}\n`);
    }
  });
}

module.exports = {
  startMcpServer,
  MCP_TOOLS
};
