import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import { router } from './router';
import { store } from './store';

export function App() {
    return (
        <Provider store={store}>
            <TooltipProvider>
                <RouterProvider router={router} />
                <Toaster />
            </TooltipProvider>
        </Provider>
    );
}
