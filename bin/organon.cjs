#!/usr/bin/env node

/**
 * Organon Master CLI & AI Integration Bridge
 * Unified Command Line Interface for Humans & AI Agents.
 */

const path = require('path');
const store = require('./lib/store.cjs');
const schema = require('./lib/schema.cjs');
const repl = require('./lib/repl.cjs');

const taskCmd = require('./lib/commands/task.cjs');
const sprintCmd = require('./lib/commands/sprint.cjs');
const noteCmd = require('./lib/commands/note.cjs');
const projectCmd = require('./lib/commands/project.cjs');
const habitCmd = require('./lib/commands/habit.cjs');
const statusCmd = require('./lib/commands/status.cjs');

const BANNER = `
\x1b[38;2;99;102;241m ██████╗ ██████╗  ██████╗  █████╗ ███╗   ██╗ ██████╗ ███╗   ██╗\x1b[0m
\x1b[38;2;129;140;248m██╔═══██╗██╔══██╗██╔════╝ ██╔══██╗████╗  ██║██╔═══██╗████╗  ██║\x1b[0m
\x1b[38;2;165;180;252m██║   ██║██████╔╝██║  ███╗███████║██╔██╗ ██║██║   ██║██╔██╗ ██║\x1b[0m
\x1b[38;2;199;210;254m██║   ██║██╔══██╗██║   ██║██╔══██║██║╚██╗██║██║   ██║██║╚██╗██║\x1b[0m
\x1b[38;2;224;231;255m╚██████╔╝██║  ██║╚██████╔╝██║  ██║██║ ╚████║╚██████╔╝██║ ╚████║\x1b[0m
\x1b[90m═════════════════════════════════════════════════════════════════════\x1b[0m
\x1b[36m Organon OS v6.23.2 \x1b[0m• \x1b[32mCLI & AI Agent Protocol Active\x1b[0m
`;

function printHelp() {
  console.log(BANNER);
  console.log(`\x1b[1mUSO GERAL:\x1b[0m
  \x1b[33morganon\x1b[0m <comando> [subcomando] [opções]
  \x1b[33morganon\x1b[0m                  \x1b[90m(Inicia a CLI no modo interativo REPL)\x1b[0m
  \x1b[33morganon schema\x1b[0m           \x1b[90m(Exibe schema JSON com especificações para IAs)\x1b[0m

\x1b[1mCOMANDOS DISPONÍVEIS:\x1b[0m

  \x1b[36m📋 TAREFAS & PLANEJAMENTO (task / plan)\x1b[0m
    organon task list [--today] [--status=todo|in_progress|done] [--priority=urgent|high] [--json]
    organon task create --title="Minha Tarefa" [--date=YYYY-MM-DD] [--time=HH:mm] [--priority=urgent] [--tags=dev,ai]
    organon task done <id_ou_titulo>        \x1b[90m(Alterna status concluído/pendente)\x1b[0m
    organon task get <id_ou_titulo>         \x1b[90m(Exibe detalhes completos)\x1b[0m
    organon task update <id_ou_titulo> [--title=...] [--status=...] [--priority=...]
    organon task delete <id_ou_titulo>

  \x1b[36m🏃 SPRINTS & PROJETOS (sprint / project)\x1b[0m
    organon sprint list [--status=planning|active|completed]
    organon sprint create --name="Sprint 1" --goal="Lançar MVP" [--start=YYYY-MM-DD] [--end=YYYY-MM-DD]
    organon sprint velocity                 \x1b[90m(Métricas e taxa de conclusão de story points)\x1b[0m
    organon project list
    organon project create --name="Novo App" [--desc="Descrição"]

  \x1b[36m📝 NOTAS & MARKDOWN (note / notes)\x1b[0m
    organon note list [--folder="Trabalho"] [--search="termo"]
    organon note read <id_ou_titulo>
    organon note create --title="Ideias de Arquitetura" --content="# Conteúdo" [--folder="Geral"]
    organon note delete <id_ou_titulo>

  \x1b[36m⚡ HÁBITOS & ROTINA (habit / habits)\x1b[0m
    organon habit list
    organon habit check <id_ou_nome>        \x1b[90m(Marca/desmarca hábito no dia de hoje)\x1b[0m

  \x1b[36m🤖 COMANDOS PARA IAs & AGENTES\x1b[0m
    organon ai "<prompt em linguagem natural>"
    organon schema                          \x1b[90m(Emite JSON Tool Schema format para IAs)\x1b[0m
    organon status                          \x1b[90m(Diagnóstico do sistema e diretórios de dados)\x1b[0m
    organon sync                            \x1b[90m(Notifica e recarrega a UI do app desktop)\x1b[0m

\x1b[1mOPÇÕES GLOBAIS:\x1b[0m
  \x1b[33m--json\x1b[0m, \x1b[33m-j\x1b[0m        Retorna resposta exclusivamente em JSON estruturado para automações.
  \x1b[33m--help\x1b[0m, \x1b[33m-h\x1b[0m        Exibe este menu de ajuda.
`);
}

const BOOLEAN_FLAGS = new Set(['json', 'j', 'help', 'h', 'today', 'raw', 'all', 'v', 'version']);

function parseArgs(argsArray) {
  const options = { _: [] };
  for (let i = 0; i < argsArray.length; i++) {
    const arg = argsArray[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        options[key] = val;
      } else {
        const key = arg.slice(2);
        if (BOOLEAN_FLAGS.has(key)) {
          options[key] = true;
        } else {
          const next = argsArray[i + 1];
          if (next && !next.startsWith('-')) {
            options[key] = next;
            i++;
          } else {
            options[key] = true;
          }
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      if (key === 'j') options.json = true;
      else if (key === 'h') options.help = true;
      else options[key] = true;
    } else {
      options._.push(arg);
    }
  }
  return options;
}

function execute(args, context = {}) {
  const opts = parseArgs(args);
  const isJson = Boolean(opts.json || opts.j);
  const primary = opts._[0] ? opts._[0].toLowerCase() : null;
  const secondary = opts._[1] ? opts._[1].toLowerCase() : null;
  const target = opts._[2] || opts._[1];

  if (opts.help || primary === 'help') {
    if (isJson) {
      console.log(JSON.stringify(schema.AI_TOOLS_SCHEMA, null, 2));
    } else {
      printHelp();
    }
    return;
  }

  // 1. Schema for AIs
  if (primary === 'schema' || primary === 'ai-spec') {
    console.log(JSON.stringify(schema.AI_TOOLS_SCHEMA, null, 2));
    return;
  }

  // 2. Natural Language AI command
  if (primary === 'ai') {
    const rawPrompt = args.slice(1).filter(a => !a.startsWith('-')).join(' ');
    const parsed = schema.parseNaturalLanguageTask(rawPrompt);
    const created = taskCmd.handleTaskCreate(parsed);
    if (isJson) {
      console.log(JSON.stringify({ success: true, aiParsed: parsed, task: created }, null, 2));
    } else {
      console.log(`\x1b[32m✔ Tarefa criada via IA:\x1b[0m "${created.title}" [Prioridade: ${created.priority}] ${created.date ? `(Data: ${created.date})` : ''}`);
    }
    return;
  }

  // 3. Status & Info
  if (primary === 'status' || primary === 'info') {
    const status = statusCmd.handleStatus();
    if (isJson) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(`\n\x1b[1mESTADO DO ORGANON:\x1b[0m`);
      console.log(`  • Versão: \x1b[36m${status.version}\x1b[0m`);
      console.log(`  • Layout: \x1b[32m${status.storageLayout}\x1b[0m`);
      console.log(`  • Diretório de Dados: \x1b[33m${status.dataDir}\x1b[0m`);
      console.log(`  • Tarefas Pendentes: \x1b[35m${status.counts.pendingTasks} / ${status.counts.totalTasks}\x1b[0m`);
      console.log(`  • Sprints: \x1b[36m${status.counts.sprints}\x1b[0m | Notas: \x1b[36m${status.counts.notes}\x1b[0m | Projetos: \x1b[36m${status.counts.projects}\x1b[0m | Hábitos: \x1b[36m${status.counts.habits}\x1b[0m\n`);
    }
    return;
  }

  // 4. Sync
  if (primary === 'sync') {
    const res = statusCmd.handleSync();
    if (isJson) console.log(JSON.stringify(res, null, 2));
    else console.log(`\x1b[32m✔ Sinal de sincronização enviado para as janelas do Organon.\x1b[0m`);
    return;
  }

  // 5. Tasks
  if (primary === 'task' || primary === 'tasks' || primary === 'plan') {
    if (secondary === 'create' || secondary === 'add') {
      const res = taskCmd.handleTaskCreate(opts);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Tarefa criada:\x1b[0m [${res.id.slice(0, 8)}] ${res.title} (${res.priority})`);
      return;
    }
    if (secondary === 'done' || secondary === 'toggle') {
      const res = taskCmd.handleTaskDone(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Tarefa atualizada:\x1b[0m "${res.task.title}" agora está \x1b[33m${res.updatedStatus}\x1b[0m.`);
      return;
    }
    if (secondary === 'get' || secondary === 'show') {
      const res = taskCmd.handleTaskGet(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else {
        console.log(`\n\x1b[1m${res.title}\x1b[0m`);
        console.log(`  ID: ${res.id} | Status: ${res.status} | Prioridade: ${res.priority}`);
        if (res.date) console.log(`  Agendamento: ${res.date} ${res.time || ''} (${res.durationMinutes || 30}m)`);
        if (res.tags && res.tags.length) console.log(`  Tags: ${res.tags.join(', ')}`);
      }
      return;
    }
    if (secondary === 'update') {
      const res = taskCmd.handleTaskUpdate(opts._[2], opts);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Tarefa atualizada com sucesso:\x1b[0m "${res.title}"`);
      return;
    }
    if (secondary === 'delete' || secondary === 'rm') {
      const res = taskCmd.handleTaskDelete(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[31m✔ Tarefa removida:\x1b[0m "${res.title}"`);
      return;
    }
    // Default or 'list'
    const list = taskCmd.handleTaskList(opts);
    if (isJson) {
      console.log(JSON.stringify(list, null, 2));
    } else {
      console.log(`\n\x1b[1m📋 TAREFAS (${list.length}):\x1b[0m`);
      if (list.length === 0) console.log('  \x1b[90m(Nenhuma tarefa encontrada)\x1b[0m');
      list.forEach(t => {
        const check = t.status === 'done' ? '\x1b[32m[✓]\x1b[0m' : '\x1b[90m[ ]\x1b[0m';
        const prioColor = t.priority === 'urgent' ? '\x1b[31m' : t.priority === 'high' ? '\x1b[33m' : '\x1b[90m';
        const dateStr = t.date ? ` \x1b[36m(${t.date}${t.time ? ' ' + t.time : ''})\x1b[0m` : '';
        console.log(`  ${check} \x1b[90m[${t.id.slice(0, 6)}]\x1b[0m ${t.title} ${prioColor}[${t.priority || 'medium'}]\x1b[0m${dateStr}`);
      });
      console.log();
    }
    return;
  }

  // 6. Sprints
  if (primary === 'sprint' || primary === 'sprints') {
    if (secondary === 'create') {
      const res = sprintCmd.handleSprintCreate(opts);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Sprint criada:\x1b[0m "${res.name}" (${res.startDate} até ${res.endDate})`);
      return;
    }
    if (secondary === 'start') {
      const res = sprintCmd.handleSprintStart(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Sprint iniciada:\x1b[0m "${res.name}"`);
      return;
    }
    if (secondary === 'complete') {
      const res = sprintCmd.handleSprintComplete(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Sprint concluída:\x1b[0m "${res.name}"`);
      return;
    }
    if (secondary === 'velocity') {
      const vel = sprintCmd.handleSprintVelocity();
      if (isJson) console.log(JSON.stringify(vel, null, 2));
      else {
        console.log(`\n\x1b[1m🏃 VELOCIDADE DAS SPRINTS:\x1b[0m`);
        vel.forEach(v => {
          console.log(`  • \x1b[1m${v.name}\x1b[0m (${v.status}): ${v.completedPoints}/${v.totalPoints} pts (\x1b[32m${v.completionRate}%\x1b[0m) - ${v.totalCards} cards`);
        });
        console.log();
      }
      return;
    }
    const list = sprintCmd.handleSprintList(opts);
    if (isJson) console.log(JSON.stringify(list, null, 2));
    else {
      console.log(`\n\x1b[1m🏃 SPRINTS (${list.length}):\x1b[0m`);
      list.forEach(s => {
        console.log(`  • \x1b[1m[${s.id.slice(0, 6)}]\x1b[0m ${s.name} [${s.status}] (${s.startDate} -> ${s.endDate})`);
        if (s.goal) console.log(`    \x1b[90mMeta: ${s.goal}\x1b[0m`);
      });
      console.log();
    }
    return;
  }

  // 7. Notes
  if (primary === 'note' || primary === 'notes') {
    if (secondary === 'create') {
      const res = noteCmd.handleNoteCreate(opts);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Nota criada:\x1b[0m "${res.title}" em ${res.mdPath}`);
      return;
    }
    if (secondary === 'read' || secondary === 'get') {
      const res = noteCmd.handleNoteRead(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else {
        console.log(`\n\x1b[1m📝 ${res.title}\x1b[0m \x1b[90m(${res.mdPath})\x1b[0m`);
        console.log('─'.repeat(50));
        console.log(res.content);
        console.log('─'.repeat(50));
      }
      return;
    }
    if (secondary === 'update') {
      const res = noteCmd.handleNoteUpdate(opts._[2], opts);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Nota atualizada:\x1b[0m "${res.title}"`);
      return;
    }
    if (secondary === 'delete' || secondary === 'rm') {
      const res = noteCmd.handleNoteDelete(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[31m✔ Nota removida:\x1b[0m "${res.title}"`);
      return;
    }
    const list = noteCmd.handleNoteList(opts);
    if (isJson) console.log(JSON.stringify(list, null, 2));
    else {
      console.log(`\n\x1b[1m📝 NOTAS (${list.length}):\x1b[0m`);
      list.forEach(n => console.log(`  • \x1b[90m[${n.id.slice(0, 6)}]\x1b[0m ${n.title} \x1b[90m(${n.folder})\x1b[0m`));
      console.log();
    }
    return;
  }

  // 8. Projects
  if (primary === 'project' || primary === 'projects') {
    if (secondary === 'create') {
      const res = projectCmd.handleProjectCreate(opts);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Projeto criado:\x1b[0m "${res.name}"`);
      return;
    }
    const list = projectCmd.handleProjectList();
    if (isJson) console.log(JSON.stringify(list, null, 2));
    else {
      console.log(`\n\x1b[1m📁 PROJETOS (${list.length}):\x1b[0m`);
      list.forEach(p => console.log(`  • \x1b[1m${p.name}\x1b[0m - ${p.description || 'Sem descrição'}`));
      console.log();
    }
    return;
  }

  // 9. Habits
  if (primary === 'habit' || primary === 'habits') {
    if (secondary === 'check' || secondary === 'toggle') {
      const res = habitCmd.handleHabitCheck(opts._[2]);
      if (isJson) console.log(JSON.stringify(res, null, 2));
      else console.log(`\x1b[32m✔ Hábito atualizado:\x1b[0m "${res.name}" (${res.completed ? 'Concluído hoje' : 'Pendente'})`);
      return;
    }
    const list = habitCmd.handleHabitList();
    if (isJson) console.log(JSON.stringify(list, null, 2));
    else {
      console.log(`\n\x1b[1m⚡ HÁBITOS:\x1b[0m`);
      list.forEach(h => {
        const check = h.completedToday ? '\x1b[32m[✓]\x1b[0m' : '\x1b[90m[ ]\x1b[0m';
        console.log(`  ${check} ${h.name} \x1b[90m(${h.period || 'geral'})\x1b[0m`);
      });
      console.log();
    }
    return;
  }

  // Interactive explicit command
  if (primary === 'interactive' || primary === 'cli' || primary === 'repl') {
    repl.startRepl(execute);
    return;
  }

  console.error(`\x1b[31mComando desconhecido:\x1b[0m "${primary}". Digite \x1b[33morganon --help\x1b[0m para ver as opções.`);
}

// -------------------------------------------------------------
// CLI ENTRYPOINT
// -------------------------------------------------------------
const rawArgs = process.argv.slice(2);

if (rawArgs.length === 0) {
  // If run in terminal with no args, print banner & start REPL
  printHelp();
  if (process.stdin.isTTY) {
    repl.startRepl(execute);
  }
} else {
  try {
    execute(rawArgs);
  } catch (err) {
    console.error(`\x1b[31mErro de execução:\x1b[0m ${err.message}`);
    process.exit(1);
  }
}
