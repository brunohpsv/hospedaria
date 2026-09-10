import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { DialogProvider } from './lib/dialogContext.tsx';
import './index.css';

function mount() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Elemento #root não encontrado no DOM!');
    return;
  }

  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (err) {
    console.error('Falha ao inicializar React:', err);
    container.innerHTML = `
      <div style="font-family:monospace;padding:24px;background:#FFF;border:2px solid #000;margin:20px;box-shadow:4px 4px 0 #000;">
        <div style="background:#FFFFCC;border-bottom:1px solid #000;padding:8px;font-weight:bold;margin:-24px -24px 16px -24px;">
          [BLOCO DE NOTAS - FALHA DE INICIALIZAÇÃO]
        </div>
        <p>Ocorreu um erro ao iniciar a aplicação:</p>
        <pre style="background:#F5F5F5;padding:12px;border:1px solid #DDD;overflow:auto;margin:12px 0;">${String(err)}</pre>
        <button onclick="localStorage.clear();location.reload();" style="padding:8px 16px;background:#000;color:#FFF;border:none;font-weight:bold;cursor:pointer;">
          [ LIMPAR DADOS LOCAIS E RECARREGAR ]
        </button>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

