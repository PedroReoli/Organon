
import type { PlaybookViewProps } from '@types'
import { usePlaybookView }    from './hooks/usePlaybookView'
import { PlaybookCatalog }    from './PlaybookCatalog'
import { PlaybookDetail }     from './PlaybookDetail'
import { PlaybookFormModal }  from './PlaybookFormModal'
import { DialogFormModal }    from './DialogFormModal'
import { DialogPreviewModal } from './DialogPreviewModal'
import { TemplateGallery }    from './templates/TemplateGallery'
import { PlaybookFolderSidebar } from './PlaybookFolderSidebar'

export const PlaybookView = (props: PlaybookViewProps) => {
  const v = usePlaybookView(props)

  return (
    <div className="projects-shell projects-theme">
      {v.screen === 'catalog' && (
        <PlaybookFolderSidebar
          playbooks={v.sortedPlaybooks}
          folders={v.playbookFolders}
          selection={v.folderSelection}
          onSelect={v.setFolderSelection}
          onCreateFolder={v.createFolder}
          onRenameFolder={v.renameFolder}
          onRemoveFolder={v.removeFolder}
        />
      )}

      <div className="projects-content-wrapper">
        {v.screen === 'catalog' && (
          <PlaybookCatalog
            search={v.search} setSearch={v.setSearch}
            sectorFilter={v.sectorFilter} setSectorFilter={v.setSectorFilter}
            categoryFilter={v.categoryFilter} setCategoryFilter={v.setCategoryFilter}
            sectors={v.sectors} categories={v.categories}
            filteredPlaybooks={v.filteredPlaybooks}
            allPlaybooks={v.sortedPlaybooks}
            folders={v.playbookFolders}
            folderSelection={v.folderSelection}
            setFolderSelection={v.setFolderSelection}
            selectedPlaybookId={v.selectedPlaybookId}
            contextMenu={v.contextMenu} contextMenuRef={v.contextMenuRef} setContextMenu={v.setContextMenu}
            openPlaybook={v.openPlaybook}
            openPlaybookEditModal={v.openPlaybookEditModal}
            removePlaybookById={v.removePlaybookById}
            togglePlaybookFavorite={v.togglePlaybookFavorite}
            togglePlaybookArchived={v.togglePlaybookArchived}
            movePlaybookToFolder={v.movePlaybookToFolder}
            createFolder={v.createFolder}
            renameFolder={v.renameFolder}
            removeFolder={v.removeFolder}
            openCreateModal={v.openCreateModal}
          />
        )}

        {v.screen === 'detail' && v.selectedPlaybook && (
          <PlaybookDetail
            selectedPlaybook={v.selectedPlaybook}
            sortedDialogs={v.sortedDialogs}
            selectedDialogId={v.selectedDialogId}
            isDetailEditing={v.isDetailEditing}
            detailContentDraft={v.detailContentDraft}
            setDetailContentDraft={v.setDetailContentDraft}
            updatePlaybookTitle={v.updatePlaybookTitle}
            goBackToCatalog={v.goBackToCatalog}
            removePlaybookById={v.removePlaybookById}
            startDetailEdit={v.startDetailEdit}
            cancelDetailEdit={v.cancelDetailEdit}
            saveDetailContent={v.saveDetailContent}
            openCreateDialogModal={v.openCreateDialogModal}
            openDialogPreviewModal={v.openDialogPreviewModal}
            showVersionsPanel={v.showVersionsPanel}
            openVersionsPanel={v.openVersionsPanel}
            closeVersionsPanel={v.closeVersionsPanel}
            restorePlaybookVersion={v.restorePlaybookVersion}
            reorderDialogUp={v.reorderDialogUp}
            reorderDialogDown={v.reorderDialogDown}
            duplicateDialog={v.duplicateDialog}
            quickCopyDialog={v.quickCopyDialog}
            quickCopiedId={v.quickCopiedId}
            dialogSearch={v.dialogSearch}
            setDialogSearch={v.setDialogSearch}
            removeDialog={v.removeDialog}
            editDialog={v.openDialogEditModal}
          />
        )}
      </div>

      {v.showTemplateGallery && (
        <TemplateGallery
          onSelect={v.selectTemplate}
          onCancel={v.closeTemplateGallery}
        />
      )}

      {v.showCreateModal && (
        <PlaybookFormModal
          isEditing={false} form={v.createForm} setForm={v.setCreateForm}
          onCancel={v.closeCreateModal} onConfirm={v.createPlaybook}
        />
      )}

      {v.showPlaybookEditModal && v.editingPlaybook && (
        <PlaybookFormModal
          isEditing={true} form={v.editForm} setForm={v.setEditForm}
          onCancel={v.closePlaybookEditModal} onConfirm={v.savePlaybookEdit}
        />
      )}

      {v.showDialogPreviewModal && v.selectedDialog && (
        <DialogPreviewModal
          selectedDialog={v.selectedDialog}
          selectedDialogResolvedVariables={v.selectedDialogResolvedVariables}
          selectedDialogPreviewHtml={v.selectedDialogPreviewHtml}
          dialogVariableValues={v.dialogVariableValues}
          dialogVariableBold={v.dialogVariableBold}
          dialogCopyStatus={v.dialogCopyStatus}
          setDialogVariableValues={v.setDialogVariableValues}
          setDialogVariableBold={v.setDialogVariableBold}
          setDialogCopyStatus={v.setDialogCopyStatus}
          onClose={v.closeDialogPreviewModal}
          onEdit={v.openSelectedDialogForEdit}
          onCopy={v.copyDialogMessage}
        />
      )}

      {v.showDialogModal && v.selectedPlaybook && (
        <DialogFormModal
          editingDialogId={v.editingDialogId}
          dialogForm={v.dialogForm} setDialogForm={v.setDialogForm}
          onCancel={v.closeDialogModal} onConfirm={v.saveDialogModal} onRemove={v.removeDialogInModal}
        />
      )}
    </div>
  )
}
