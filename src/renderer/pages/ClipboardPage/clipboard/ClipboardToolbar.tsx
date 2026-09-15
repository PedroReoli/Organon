export type ClipboardSortMode = 'recent' | 'most-used' | 'type' | 'pinned-first'

interface ClipboardToolbarProps {
  search:       string
  setSearch:    (v: string) => void
  sortMode:     ClipboardSortMode
  setSortMode:  (v: ClipboardSortMode) => void
  onAdd:        () => void
  newContent:   string
  setNewContent:(v: string) => void
}

const SORT_OPTIONS: { value: ClipboardSortMode; label: string }[] = [
  { value: 'recent',      label: 'Recente'     },
  { value: 'most-used',   label: 'Mais usado'  },
  { value: 'pinned-first',label: 'Fixados'     },
  { value: 'type',        label: 'Tipo'        },
]

export const ClipboardToolbar = ({
  search, setSearch,
  sortMode, setSortMode,
  onAdd, newContent, setNewContent,
}: ClipboardToolbarProps) => (
  <div className="cb-toolbar">
    <div className="cb-toolbar-add">
      <textarea
        className="cb-add-textarea"
        placeholder="Cole ou escreva aqui para salvar..."
        rows={2}
        value={newContent}
        onChange={e => setNewContent(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onAdd() } }}
      />
      <button
        type="button"
        className="cb-btn-primary"
        onClick={onAdd}
        disabled={!newContent.trim()}
      >
        Salvar
      </button>
    </div>

    <div className="cb-toolbar-filters">
      <div className="cb-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="cb-search-icon">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="cb-search-input"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <select
        className="cb-select"
        value={sortMode}
        onChange={e => setSortMode(e.target.value as ClipboardSortMode)}
        title="Ordenação"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  </div>
)
