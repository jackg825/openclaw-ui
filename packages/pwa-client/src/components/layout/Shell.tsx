import { useState, useCallback, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-background md:hidden">
              <div className="h-14 flex items-center px-4 border-b font-bold text-lg">
                OpenClaw
              </div>
              <Sidebar onNavigate={closeSidebar} />
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <StatusBar />
    </div>
  );
}
