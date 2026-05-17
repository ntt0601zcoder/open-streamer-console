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
        // Splat route — stream codes may contain '/' (template-prefix
        // namespaces like `receiver/test_tpl_push`), and `:code` only
        // matches a single segment. Static `streams/new` above ranks
        // higher than this splat so create still wins.
        path: 'streams/*',
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
        path: 'templates',
        lazy: async () => {
          const { TemplatesPage } = await import('@/pages/TemplatesPage');
          return { Component: TemplatesPage };
        },
      },
      {
        path: 'templates/new',
        lazy: async () => {
          const { TemplateEditorPage } = await import('@/pages/TemplateEditorPage');
          return { Component: TemplateEditorPage };
        },
      },
      {
        path: 'templates/:code',
        lazy: async () => {
          const { TemplateEditorPage } = await import('@/pages/TemplateEditorPage');
          return { Component: TemplateEditorPage };
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
        path: 'watermarks',
        lazy: async () => {
          const { WatermarksPage } = await import('@/pages/WatermarksPage');
          return { Component: WatermarksPage };
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
