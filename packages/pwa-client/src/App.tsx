import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoginPage } from '@/pages/LoginPage';
import { ChatPage } from '@/pages/ChatPage';
import { ConnectPage } from '@/pages/ConnectPage';
import { StorePage } from '@/pages/StorePage';
import { StoreDetailPage } from '@/pages/StoreDetailPage';
import { ClusterPage } from '@/pages/ClusterPage';
import { NodeDetailPage } from '@/pages/NodeDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<Shell />}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/pair" element={<ConnectPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/store/:slug" element={<StoreDetailPage />} />
            <Route path="/cluster" element={<ClusterPage />} />
            <Route path="/cluster/:nodeId" element={<NodeDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
