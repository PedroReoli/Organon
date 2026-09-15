import React from 'react'

export interface TabOption {
  id: string
  label: string
}

export interface SectionTabsProps {
  tabs: TabOption[]
  activeTab: string
  onChange: (tabId: string) => void
}

export const SectionTabs: React.FC<SectionTabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="projects-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`projects-tab ${activeTab === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
