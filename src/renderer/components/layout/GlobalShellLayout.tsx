import React, { useState } from 'react'
import { CentralNotificationDrawer, type SystemNotificationItem } from './CentralNotificationDrawer'

interface GlobalShellLayoutProps {
  hubTitle: string
  viewTitle?: string
  dynamicNavbarSlot?: React.ReactNode
  metricsText?: string
  footerActions?: any[]
  notifications: SystemNotificationItem[]
  onClearNotifications: () => void
  onNavigateView?: (view: string) => void
  onOpenSyncModal?: () => void
  onOpenSearch?: () => void
  children: React.ReactNode
}

export const GlobalShellLayout: React.FC<GlobalShellLayoutProps> = ({
  notifications,
  onClearNotifications,
  onNavigateView,
  children,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Central View Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}

        {/* Central Notification Drawer */}
        <CentralNotificationDrawer
          isOpen={isDrawerOpen}
          notifications={notifications}
          onClose={() => setIsDrawerOpen(false)}
          onClearAll={onClearNotifications}
          onNavigateView={onNavigateView}
        />
      </div>
    </div>
  )
}
