/**
 * Organon Autonomous AI Agent Protocol Specification
 * Emitted when running `organon --ai` or `organon protocol`.
 * Modeled after the Achilles autonomous agent specification.
 */

const PROTOCOL_TEXT = `# PROTOCOLO AGENTE AUTÔNOMO ORGANON (v6.23)

Você está conectado à CLI & Bridge Operacional do Organon — a central unificada de produtividade, planejamento e notas da suíte Reoli.

## 1. PRINCÍPIOS FUNDAMENTAIS DE OPERAÇÃO

### 🔒 REGRA ZERO-BREAKAGE (INTEGRIDADE & PERSISTÊNCIA ATÔMICA)
- O Organon gerencia a persistência de notas, tarefas, projetos, sprints e hábitos com garantia de integridade.
- Toda modificação realizada via CLI sincroniza automaticamente com as janelas abertas do app desktop sem necessidade de reiniciar o Electron.
- Ao concluir operações de lote, dispare \`organon sync\` para forçar recarga visual do app se necessário.
- **NUNCA** apague arquivos de banco SQLite brutos diretamente. Sempre utilize a CLI ou os canais IPC oficiais.

### ⚡ TOKEN-ZERO-WASTE (MÁXIMA EFICIÊNCIA DE TOKENS)
- **Para ler tarefas**: SEMPRE passe \`--today\` ou \`--status=todo\` acompanhado de \`--json\` (\`-j\`), reduzindo mais de 90% do consumo de tokens em comparação ao retorno textual bruto.
- **Para consultar notas**: Use \`organon note list --folder="X" --json\` ou busque por termo com \`--search="termo"\`. Não despeje todas as 50+ notas no contexto sem filtro.
- **Para ler conteúdo de uma nota específica**: Execute \`organon note read <id_ou_titulo>\` para receber o Markdown enxuto.

### 🛡️ MODO OPERATE (DIRETO, RÁPIDO E CONCISO)
- O Organon opera no modo **Operate** do design system Reoli: tarefas diretas, ações rápidas, respostas compactas em JSON para automações e logs legíveis para humanos.

---

## 2. GUIA DE COMANDOS CLI PARA AGENTES DE IA

| Objetivo do Agente | Comando CLI | Descrição |
|---|---|---|
| Diagnóstico do Sistema | \`organon status --json\` | Exibe contagens, versão, diretório ativo e pendências |
| Verificação de Saúde | \`organon doctor --json\` | Valida integridade do banco SQLite, diretórios e modelos |
| Listar Tarefas de Hoje | \`organon task list --today --json\` | Retorna tarefas agendadas para o dia com prioridade |
| Listar Tarefas Pendentes | \`organon task list --status=todo --json\` | Lista backlog ou pendências gerais |
| Criar Tarefa | \`organon task create --title="..." [--priority=urgent] [--date=YYYY-MM-DD]\` | Cria tarefa atômica no planejamento |
| Concluir Tarefa | \`organon task done <id_ou_titulo>\` | Alterna status para concluído (\`done\`) |
| Buscar/Ler Nota | \`organon note read <id_ou_titulo>\` | Retorna o conteúdo Markdown da nota |
| Criar Nova Nota | \`organon note create --title="..." [--content="..." \\| --file="path.md"] [--folder="Geral"]\` | Cria nota no cofre (suporta arquivo ou stdin) |
| Atualizar Nota | \`organon note update <id_ou_titulo> [--content="..." \\| --file="path.md"] [--append="..."]\` | Atualiza ou acrescenta conteúdo em nota existente |
| Mover Nota | \`organon note move <id_ou_titulo> --folder="NomePasta" \\| --parent="NotaPai"\` | Move para pasta ou transforma em subpágina |
| Renomear Nota | \`organon note rename <id_ou_titulo> --title="Novo Título"\` | Altera título da nota |
| Listar Pastas | \`organon note folder list --json\` | Lista pastas e contagem de notas |
| Criar Pasta | \`organon note folder create --name="Nova Pasta"\` | Cria pasta no cofre de notas |
| Listar Sprints | \`organon sprint list --json\` | Retorna sprints ativas e métricas |
| Listar Hábitos | \`organon habit list --json\` | Lista hábitos e status de conclusão hoje |
| Marcar Hábito | \`organon habit check <id_ou_nome>\` | Alterna realização do hábito no dia |
| Sincronizar App | \`organon sync\` | Notifica e sincroniza o app desktop instantaneamente |
| Schema de Ferramentas | \`organon schema\` | Emite Tool Calling Schema (JSON) para LLMs |

---

## 3. PROTOCOLOS DE COMUNICAÇÃO AVANÇADOS

### 🔌 Servidor MCP (Model Context Protocol via Stdio)
- Inicie com: \`organon mcp\`
- Qualquer agente compatível com MCP (Claude Code, Cursor, Antigravity, Jules) pode consumir as tools nativas do Organon como chamadas de função com tipagem estrita JSON-RPC 2.0.

### 🤖 Prompt em Linguagem Natural
- Para criar tarefas e agendamentos interpretados por NLP básico:
  \`organon ai "Revisar relatório amanhã 15h prioridade alta"\`
  O sistema extrai título, data, horário e prioridade automaticamente.

Execute os comandos acima via terminal para gerenciar a rotina do usuário de forma autônoma e segura.
`;

function printProtocol() {
  console.log(PROTOCOL_TEXT);
}

module.exports = {
  PROTOCOL_TEXT,
  printProtocol
};
