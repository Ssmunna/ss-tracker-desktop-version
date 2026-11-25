import { createBrowserRouter, type RouteObject } from 'react-router';

import { appRoutes } from './routes';

const demos = () => import('@/features/gallery/LayoutDemos');

/** Dev-only routes for design review (not part of the production build). */
const galleryRoutes: RouteObject[] = import.meta.env.DEV
    ? [
          {
              path: '/__ui',
              lazy: async () => ({
                  Component: (await import('@/features/gallery/GalleryPage'))
                      .GalleryPage,
              }),
          },
          {
              path: '/__ui/auth',
              lazy: async () => ({ Component: (await demos()).AuthDemo }),
          },
          {
              path: '/__ui/chat',
              lazy: async () => ({ Component: (await demos()).ChatDemo }),
          },
          {
              path: '/__ui/shell',
              lazy: async () => ({ Component: (await demos()).ShellDemo }),
              children: [
                  {
                      path: '*',
                      lazy: async () => ({
                          Component: (await demos()).ShellPlaceholder,
                      }),
                  },
                  {
                      index: true,
                      lazy: async () => ({
                          Component: (await demos()).ShellPlaceholder,
                      }),
                  },
              ],
          },
      ]
    : [];

export const router = createBrowserRouter([...galleryRoutes, ...appRoutes]);
