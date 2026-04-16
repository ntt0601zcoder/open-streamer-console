import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { HooksPage } from '@/pages/HooksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StreamDetailPage } from '@/pages/StreamDetailPage';
import { StreamsPage } from '@/pages/StreamsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'streams', element: <StreamsPage /> },
      { path: 'streams/:code', element: <StreamDetailPage /> },
      { path: 'hooks', element: <HooksPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
