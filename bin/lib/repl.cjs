const readline = require('readline');

function startRepl(executor) {
  console.log('\n\x1b[36m💡 Modo Interativo Ativado.\x1b[0m Digite um comando ou \x1b[33mhelp\x1b[0m para instruções. (\x1b[90mexit\x1b[0m para sair)\n');

  const completer = (line) => {
    const completions = [
      'help', 'status', 'schema', 'sync', 'exit',
      'task list', 'task create', 'task done', 'task get', 'task update', 'task delete',
      'sprint list', 'sprint create', 'sprint start', 'sprint complete', 'sprint velocity',
      'note list', 'note read', 'note create', 'note update', 'note delete',
      'project list', 'project create',
      'habit list', 'habit check',
      'ai '
    ];
    const hits = completions.filter(c => c.startsWith(line.trim()));
    return [hits.length ? hits : completions, line];
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[35morganon\x1b[0m \x1b[34m❯\x1b[0m ',
    completer
  });

  rl.prompt();

  rl.on('line', (line) => {
    const raw = line.trim();
    if (!raw) {
      rl.prompt();
      return;
    }

    if (raw === 'exit' || raw === 'quit' || raw === ':q') {
      console.log('\x1b[90mSaindo do Organon CLI...\x1b[0m\n');
      rl.close();
      process.exit(0);
    }

    try {
      // Split args respecting quotes
      const parsedArgs = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      const cleanArgs = parsedArgs.map(a => a.replace(/^['"]|['"]$/g, ''));

      executor(cleanArgs, { isRepl: true });
    } catch (err) {
      console.error('\x1b[31mErro:\x1b[0m', err.message);
    }

    console.log();
    rl.prompt();
  }).on('close', () => {
    process.exit(0);
  });
}

module.exports = {
  startRepl
};
