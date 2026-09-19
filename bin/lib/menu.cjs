/**
 * Organon Visual Operations Menu
 * Triggered when typing `organon` in the terminal without arguments.
 * Fast, numbered keyboard navigation inspired by Achilles CLI.
 */

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
  gray: '\x1b[90m',
};

const BANNER = `
${c.brightCyan}  ██████╗ ██████╗  ██████╗  █████╗ ███╗   ██╗ ██████╗ ███╗   ██╗${c.reset}
${c.cyan} ██╔═══██╗██╔══██╗██╔════╝ ██╔══██╗████╗  ██║██╔═══██╗████╗  ██║${c.reset}
${c.brightMagenta} ██║   ██║██████╔╝██║  ███╗███████║██╔██╗ ██║██║   ██║██╔██╗ ██║${c.reset}
${c.magenta} ██║   ██║██╔══██╗██║   ██║██╔══██║██║╚██╗██║██║   ██║██║╚██╗██║${c.reset}
${c.dim} ╚██████╔╝██║  ██║╚██████╔╝██║  ██║██║ ╚████║╚██████╔╝██║ ╚████║${c.reset}
${c.gray} ═════════════════════════════════════════════════════════════════${c.reset}
 ${c.brightWhite}Organon OS v6.23.2${c.reset} • ${c.brightGreen}Central Operacional & AI Protocol${c.reset}
`;

function renderMenu() {
  console.clear();
  console.log(BANNER);
  console.log(` ${c.bold}MENU PRINCIPAL:${c.reset}\n`);

  console.log(`  ${c.brightCyan}[1]${c.reset} ${c.bold}⚡ DEV FULL${c.reset}           ${c.gray}Inicia Vite + Electron com hot-reload${c.reset}`);
  console.log(`  ${c.brightYellow}[2]${c.reset} ${c.bold}📦 BUILD FULL${c.reset}         ${c.gray}Compila TypeScript, Vite e gera instalador${c.reset}`);
  console.log(`  ${c.brightGreen}[3]${c.reset} ${c.bold}📋 TAREFAS DE HOJE${c.reset}    ${c.gray}Lista tarefas agendadas para hoje${c.reset}`);
  console.log(`  ${c.brightGreen}[4]${c.reset} ${c.bold}➕ NOVA TAREFA${c.reset}        ${c.gray}Criação rápida de tarefa no planejamento${c.reset}`);
  console.log(`  ${c.brightMagenta}[5]${c.reset} ${c.bold}📝 NOTAS RÁPIDAS${c.reset}      ${c.gray}Lista últimas notas salvas no cofre${c.reset}`);
  console.log(`  ${c.cyan}[6]${c.reset} ${c.bold}🩺 DOCTOR${c.reset}             ${c.gray}Verifica banco SQLite, integridade e modelos${c.reset}`);
  console.log(`  ${c.brightWhite}[7]${c.reset} ${c.bold}🤖 PROTOCOLO IA${c.reset}       ${c.gray}Exibe guia autônomo e comandos para IAs (--ai)${c.reset}`);
  console.log(`  ${c.yellow}[8]${c.reset} ${c.bold}🔌 SERVIDOR MCP${c.reset}       ${c.gray}Inicia bridge MCP stdio para Claude / IDEs${c.reset}`);
  console.log(`  ${c.magenta}[9]${c.reset} ${c.bold}💾 SINCRONIZAR${c.reset}        ${c.gray}Dispara sinal de sincronização com o app aberto${c.reset}`);
  console.log(`  ${c.gray}[R]${c.reset} ${c.bold}💡 MODO REPL${c.reset}          ${c.gray}Terminal de comandos interativos do Organon${c.reset}`);
  console.log(`  ${c.red}[0]${c.reset} ${c.bold}🚪 SAIR${c.reset}\n`);

  process.stdout.write(` ${c.bold}Digite a opção [0-9, R]:${c.reset} `);
}

function startMenu(executor) {
  renderMenu();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', (line) => {
    const choice = line.trim().toLowerCase();

    switch (choice) {
      case '1':
        rl.close();
        console.log(`\n${c.cyan}Iniciando ambiente de desenvolvimento...${c.reset}\n`);
        const devProcess = spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          shell: true,
          cwd: path.resolve(__dirname, '../..')
        });
        devProcess.on('exit', () => process.exit(0));
        break;

      case '2':
        rl.close();
        console.log(`\n${c.yellow}Iniciando build de produção...${c.reset}\n`);
        const buildProcess = spawn('npm', ['run', 'build'], {
          stdio: 'inherit',
          shell: true,
          cwd: path.resolve(__dirname, '../..')
        });
        buildProcess.on('exit', () => process.exit(0));
        break;

      case '3':
        rl.close();
        console.log();
        executor(['task', 'list', '--today']);
        promptReturnToMenu(executor);
        break;

      case '4':
        rl.question(`\n ${c.bold}Título da tarefa:${c.reset} `, (title) => {
          if (title.trim()) {
            executor(['task', 'create', `--title=${title.trim()}`]);
          }
          promptReturnToMenu(executor);
        });
        break;

      case '5':
        rl.close();
        console.log();
        executor(['note', 'list']);
        promptReturnToMenu(executor);
        break;

      case '6':
        rl.close();
        executor(['doctor']);
        promptReturnToMenu(executor);
        break;

      case '7':
        rl.close();
        executor(['--ai']);
        promptReturnToMenu(executor);
        break;

      case '8':
        rl.close();
        executor(['mcp']);
        break;

      case '9':
        rl.close();
        console.log();
        executor(['sync']);
        promptReturnToMenu(executor);
        break;

      case 'r':
      case 'repl':
        rl.close();
        executor(['repl']);
        break;

      case '0':
      case 'q':
      case 'exit':
        console.log(`\n${c.gray}Até logo!${c.reset}\n`);
        rl.close();
        process.exit(0);
        break;

      default:
        console.log(`\n ${c.red}Opção inválida.${c.reset}`);
        setTimeout(() => renderMenu(), 800);
        break;
    }
  });
}

function promptReturnToMenu(executor) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(`\n${c.gray}Pressione [Enter] para voltar ao menu ou [Ctrl+C] para sair...${c.reset}`, () => {
    rl.close();
    startMenu(executor);
  });
}

module.exports = {
  startMenu
};
