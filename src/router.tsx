import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/streams" replace /> },
      {
        path: 'streams',
        lazy: async () => {
          const { StreamsPage } = await import('@/pages/StreamsPage');
          return { Component: StreamsPage };
        },
      },
      {
        path: 'streams/new',
        lazy: async () => {
          const { StreamCreatePage } = await import('@/pages/StreamCreatePage');
          return { Component: StreamCreatePage };
        },
      },
      {
        path: 'streams/:code',
        lazy: async () => {
          const { StreamDetailPage } = await import('@/pages/StreamDetailPage');
          return { Component: StreamDetailPage };
        },
      },
      {
        path: 'vod',
        lazy: async () => {
          const { VodPage } = await import('@/pages/VodPage');
          return { Component: VodPage };
        },
      },
      {
        path: 'vod/:name',
        lazy: async () => {
          const { VodMountPage } = await import('@/pages/VodMountPage');
          return { Component: VodMountPage };
        },
      },
      {
        path: 'hooks',
        lazy: async () => {
          const { HooksPage } = await import('@/pages/HooksPage');
          return { Component: HooksPage };
        },
      },
      {
        path: 'sessions',
        lazy: async () => {
          const { SessionsPage } = await import('@/pages/SessionsPage');
          return { Component: SessionsPage };
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsPage } = await import('@/pages/SettingsPage');
          return { Component: SettingsPage };
        },
      },
      {
        path: 'settings/editor',
        lazy: async () => {
          const { ConfigEditorPage } = await import('@/pages/ConfigEditorPage');
          return { Component: ConfigEditorPage };
        },
      },
    ],
  },
]);
