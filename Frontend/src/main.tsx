import '@fontsource-variable/geist-mono';
import '@fontsource-variable/noto-sans-bengali';
import '@fontsource-variable/plus-jakarta-sans';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
