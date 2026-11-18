import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from '@/app/App';
import { loadActiveManifest } from '@/app/staticData';
import { vi } from '@/i18n/vi';
import { initLearner } from '@/storage/useLearner';
import './index.css';

const root = createRoot(document.getElementById('root')!);

/** The hearts rule needs the model's recommended threshold, so the manifest is loaded before the app starts. */
async function start() {
  try {
    const manifest = await loadActiveManifest('static_letters');
    initLearner({ heartThreshold: manifest.recommended.threshold, appVersion: '0.1.0' });
    root.render(
      <StrictMode>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StrictMode>,
    );
  } catch (e) {
    root.render(
      <main role="alert" className="p-8">
        <h1 className="text-2xl font-extrabold">{vi.common.startupError}</h1>
        <p className="mt-2 text-text-muted">{(e as Error).message}</p>
      </main>,
    );
  }
}

void start();
