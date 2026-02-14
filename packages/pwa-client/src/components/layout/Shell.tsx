import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden shrink-0 border-r md:flex flex-col transition-[width] duration-200',
            sidebarCollapsed ? 'w-16' : 'w-64',
          )}
        >
          <div className="flex-1">
            <Sidebar collapsed={sidebarCollapsed} />
          </div>
          <div className="border-t p-2 flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-7 w-7 text-muted-foreground"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-200',
            sidebarOpen
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none',
          )}
          onClick={closeSidebar}
          aria-hidden="true"
        />
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 border-r bg-background md:hidden transition-transform duration-200 ease-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="h-14 flex items-center px-4 border-b font-bold text-lg">
            <span className="text-primary">Open</span>
            <span>Claw</span>
          </div>
          <Sidebar onNavigate={closeSidebar} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
      <StatusBar />
    </div>
  );
}
