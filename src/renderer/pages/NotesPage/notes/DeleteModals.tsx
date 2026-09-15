interface DeleteModalsProps {
  deleteConfirm:       { noteId: string; title: string } | null
  folderDeleteConfirm: { folderId: string; name: string } | null
  onCancelNote:   () => void
  onConfirmNote:  () => void
  onCancelFolder: () => void
  onConfirmFolder: () => void
}

export const DeleteModals = ({
  deleteConfirm, folderDeleteConfirm,
  onCancelNote, onConfirmNote, onCancelFolder, onConfirmFolder,
}: DeleteModalsProps) => (
  <>
    {deleteConfirm && (
      <div className="notes-delete-modal-overlay" onClick={onCancelNote}>
        <div className="notes-delete-modal" onClick={e => e.stopPropagation()}>
          <div className="notes-delete-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </div>
          <h3 className="notes-delete-modal-title">Excluir nota</h3>
          <p className="notes-delete-modal-desc">
            Tem certeza que deseja excluir <strong>"{deleteConfirm.title}"</strong>?<br />
            Esta ação não pode ser desfeita.
          </p>
          <div className="notes-delete-modal-actions">
            <button className="notes-delete-modal-btn cancel"  onClick={onCancelNote}>Cancelar</button>
            <button className="notes-delete-modal-btn confirm" onClick={onConfirmNote}>Excluir</button>
          </div>
        </div>
      </div>
    )}

    {folderDeleteConfirm && (
      <div className="notes-delete-modal-overlay" onClick={onCancelFolder}>
        <div className="notes-delete-modal" onClick={e => e.stopPropagation()}>
          <div className="notes-delete-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="2" y1="10" x2="22" y2="10" /><path d="M9 13h6" />
            </svg>
          </div>
          <h3 className="notes-delete-modal-title">Excluir pasta</h3>
          <p className="notes-delete-modal-desc">
            Tem certeza que deseja excluir <strong>"{folderDeleteConfirm.name}"</strong>?<br />
            Esta acao nao pode ser desfeita.
          </p>
          <div className="notes-delete-modal-actions">
            <button className="notes-delete-modal-btn cancel"  onClick={onCancelFolder}>Cancelar</button>
            <button className="notes-delete-modal-btn confirm" onClick={onConfirmFolder}>Excluir</button>
          </div>
        </div>
      </div>
    )}
  </>
)
