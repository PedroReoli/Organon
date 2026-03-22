import React, { useState } from 'react'
import Titlebar from './components/Titlebar'
import Sidebar, { type ViewName } from './components/Sidebar'
import LicensesView from './views/LicensesView'
import CreateLicenseView from './views/CreateLicenseView'
import LicenseDetailView from './views/LicenseDetailView'

type Route =
  | { view: 'licenses' }
  | { view: 'create' }
  | { view: 'detail'; id: string }

export default function App() {
  const [route, setRoute] = useState<Route>({ view: 'licenses' })
  const [licensesRefreshKey, setLicensesRefreshKey] = useState(0)

  function navigate(view: ViewName) {
    setRoute({ view })
  }

  function handleLicenseCreated(id: string) {
    setLicensesRefreshKey((k) => k + 1)
    setRoute({ view: 'detail', id })
  }

  const sidebarView: ViewName = route.view === 'detail' ? 'licenses' : (route.view as ViewName)

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={sidebarView} onNavigate={navigate} />

        {route.view === 'licenses' && (
          <LicensesView
            onSelect={(id) => setRoute({ view: 'detail', id })}
            refreshKey={licensesRefreshKey}
          />
        )}

        {route.view === 'create' && (
          <CreateLicenseView
            onCreated={handleLicenseCreated}
            onCancel={() => setRoute({ view: 'licenses' })}
          />
        )}

        {route.view === 'detail' && (
          <LicenseDetailView
            licenseId={route.id}
            onBack={() => setRoute({ view: 'licenses' })}
          />
        )}
      </div>
    </div>
  )
}
