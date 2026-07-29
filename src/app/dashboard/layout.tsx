'use client'

import { useState } from 'react'
import { DashboardSidebar } from '@/components/admin/dashboard-sidebar'
import { DashboardHeader } from '@/components/admin/dashboard-header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen">
      <div className={`flex h-screen overflow-hidden ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Two-Tier Navigation System */}
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
