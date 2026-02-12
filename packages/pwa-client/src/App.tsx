import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
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
      <Shell>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/pair" element={<ConnectPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/:slug" element={<StoreDetailPage />} />
          <Route path="/cluster" element={<ClusterPage />} />
          <Route path="/cluster/:nodeId" element={<NodeDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
