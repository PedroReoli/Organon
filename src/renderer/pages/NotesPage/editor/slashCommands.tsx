/**
 * SLASH_COMMANDS — array de comandos do slash menu do editor.
 *
 * Extraido de WysiwygEditor.tsx (250 linhas) no refator do Upgrade 10a.
 * E puramente data + funcoes que recebem o Editor; nao tem state proprio.
 */


import type { SlashCommand } from '@types'

export const TOOLBOX_SLASH_COMMAND: SlashCommand = {
  id: 'toolbox',
  label: 'Caixa de ferramentas',
  description: 'Abre a toolbox flutuante do editor',
  keywords: ['toolbox', 'ferramentas', 'ferramenta', 'caixa', 'caixa de', 'caixa de ferramentas'],
  icon: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <rect x="2" y="5" width="12" height="8" rx="1.5" />
      <path d="M6 5V4a2 2 0 0 1 4 0v1" />
      <path d="M2 8h12" />
    </svg>
  ),
  action: () => {
    document.dispatchEvent(new CustomEvent('slash-open-toolbox'))
  },
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Título 1',
    description: 'Cabeçalho grande',
    keywords: ['h1', 'heading', 'titulo'],
    icon: <span style={{ fontWeight: 800, fontSize: 14 }}>H1</span>,
    action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Título 2',
    description: 'Cabeçalho médio',
    keywords: ['h2', 'heading', 'titulo'],
    icon: <span style={{ fontWeight: 700, fontSize: 13 }}>H2</span>,
    action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Título 3',
    description: 'Cabeçalho pequeno',
    keywords: ['h3', 'heading', 'titulo'],
    icon: <span style={{ fontWeight: 600, fontSize: 12 }}>H3</span>,
    action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'paragraph',
    label: 'Parágrafo',
    description: 'Texto normal',
    keywords: ['p', 'paragraph', 'texto'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <path d="M3 3h6a3 3 0 0 1 0 6H7v4" />
        <line x1="5" y1="9" x2="5" y2="13" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().setParagraph().run(),
  },
  {
    id: 'bullet',
    label: 'Lista com marcadores',
    description: 'Lista não ordenada',
    keywords: ['bullet', 'list', 'lista', 'ul'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <circle cx="3" cy="5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="3" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <line x1="6" y1="5" x2="14" y2="5" />
        <line x1="6" y1="8.5" x2="14" y2="8.5" />
        <line x1="6" y1="12" x2="14" y2="12" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Lista numerada',
    description: 'Lista ordenada',
    keywords: ['ordered', 'number', 'lista', 'ol'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <text x="1" y="6" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">1.</text>
        <text x="1" y="10" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">2.</text>
        <text x="1" y="14" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">3.</text>
        <line x1="7" y1="5" x2="14" y2="5" />
        <line x1="7" y1="9" x2="14" y2="9" />
        <line x1="7" y1="13" x2="14" y2="13" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: 'Lista de tarefas',
    description: 'Checkboxes interativos',
    keywords: ['task', 'todo', 'check', 'checkbox'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="3" width="5" height="5" rx="1" />
        <polyline points="3.5 5.5 5 7 7 4" />
        <line x1="9" y1="5.5" x2="14" y2="5.5" />
        <rect x="2" y="10" width="5" height="5" rx="1" />
        <line x1="9" y1="12.5" x2="14" y2="12.5" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'Citação',
    description: 'Bloco de citação',
    keywords: ['quote', 'citacao', 'blockquote'],
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path d="M3 7.5C3 5.6 4.4 4 6.5 3L7 4c-1.7.9-2 2.1-2 2.6.2-.1.5-.1.8-.1.9 0 1.7.7 1.7 1.8C7.5 9.4 6.7 10 5.7 10 4.3 10 3 9 3 7.5zM9 7.5C9 5.6 10.4 4 12.5 3L13 4c-1.7.9-2 2.1-2 2.6.2-.1.5-.1.8-.1.9 0 1.7.7 1.7 1.8 0 1.1-.8 1.7-1.8 1.7C10.3 10 9 9 9 7.5z" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Bloco de código',
    description: 'Código com syntax highlight',
    keywords: ['code', 'codigo', 'pre'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <polyline points="10.5 11.5 13.5 8 10.5 4.5" />
        <polyline points="5.5 4.5 2.5 8 5.5 11.5" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'table',
    label: 'Tabela',
    description: 'Grade de dados',
    keywords: ['table', 'tabela', 'grid'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <line x1="2" y1="6.5" x2="14" y2="6.5" />
        <line x1="2" y1="11" x2="14" y2="11" />
        <line x1="7" y1="2" x2="7" y2="14" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'divider',
    label: 'Divisor',
    description: 'Linha horizontal',
    keywords: ['hr', 'divider', 'divisor', 'separador'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    ),
    action: (ed) => ed.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'image',
    label: 'Imagem',
    description: 'Inserir imagem',
    keywords: ['image', 'imagem', 'foto', 'img'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <circle cx="6" cy="6" r="1.5" />
        <path d="m14 10-4-4L4 14" />
      </svg>
    ),
    action: (_ed) => {
      document.dispatchEvent(new CustomEvent('slash-insert-image'))
    },
  },
  {
    id: 'link',
    label: 'Link',
    description: 'Inserir hyperlink',
    keywords: ['link', 'url', 'href'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <path d="M7 9a3 3 0 0 0 4.54.33l2-2a3 3 0 0 0-4.24-4.24L8.12 4.3" />
        <path d="M9 7a3 3 0 0 0-4.54-.33l-2 2a3 3 0 0 0 4.24 4.24L7.88 11.7" />
      </svg>
    ),
    action: (_ed) => {
      document.dispatchEvent(new CustomEvent('slash-insert-link'))
    },
  },
  {
    id: 'toggle',
    label: 'Bloco recolhível',
    description: 'Bloco que expande e recolhe',
    keywords: ['toggle', 'recolhivel', 'collapsible', 'detalhe', 'details'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <polyline points="6 4 10 8 6 12" />
        <line x1="2" y1="8" x2="14" y2="8" strokeOpacity="0.3" />
      </svg>
    ),
    action: (ed) => {
      ed.chain().focus().insertContent({
        type: 'toggleBlock',
        attrs: { summary: 'Título do bloco' },
        content: [{ type: 'paragraph' }],
      }).run()
    },
  },
  {
    id: 'password',
    label: 'Senha / Oculto',
    description: 'Bloco mascarado com bolinhas',
    keywords: ['password', 'senha', 'oculto', 'secret', 'secreto', 'masked'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="7" width="12" height="8" rx="1.5" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    ),
    action: (ed) => {
      ed.chain().focus().insertContent({
        type: 'passwordBlock',
        attrs: { text: '' },
      }).run()
    },
  },
  {
    id: 'page',
    label: 'Subpágina',
    description: 'Criar uma nota dentro desta nota',
    keywords: ['page', 'pagina', 'subpage', 'subpagina', 'nested'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <path d="M3 14V4l3-3h7v13H3Z" /><path d="M6 1v3H3" />
        <line x1="6" y1="8" x2="10" y2="8" /><line x1="8" y1="6" x2="8" y2="10" />
      </svg>
    ),
    action: (_ed) => {
      document.dispatchEvent(new CustomEvent('slash-create-subpage'))
    },
  },
]
