import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ConfigEditorPage } from '@/pages/ConfigEditorPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HooksPage } from '@/pages/HooksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StreamDetailPage } from '@/pages/StreamDetailPage';
import { StreamsPage } from '@/pages/StreamsPage';
import { VodMountPage } from '@/pages/VodMountPage';
import { VodPage } from '@/pages/VodPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'streams', element: <StreamsPage /> },
      { path: 'streams/:code', element: <StreamDetailPage /> },
      { path: 'vod', element: <VodPage /> },
      { path: 'vod/:name', element: <VodMountPage /> },
      { path: 'hooks', element: <HooksPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/editor', element: <ConfigEditorPage /> },
    ],
  },
]);
