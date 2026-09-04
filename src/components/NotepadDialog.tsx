import React, { useEffect } from 'react';

export interface DialogConfig {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'danger';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotepadDialogProps {
  dialog: DialogConfig | null;
  onClose: () => void;
}

export const NotepadDialog: React.FC<NotepadDialogProps> = ({ dialog, onClose }) => {
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (dialog.onCancel) {
          dialog.onCancel();
        }
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        dialog.onConfirm();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, onClose]);

  if (!dialog) return null;

  const isAlert = dialog.type === 'alert';
  const isDanger = dialog.type === 'danger';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 font-mono">
      <div className="bg-white border-2 border-black w-full max-w-md shadow-none select-none">
        {/* Title Bar */}
        <div
          className={`border-b border-black px-2 py-1 flex items-center justify-between text-xs font-bold ${
            isDanger ? 'bg-red-600 text-white' : 'bg-[#FFFFCC] text-black'
          }`}
        >
          <span>{dialog.title || (isDanger ? 'AVISO CRÍTICO' : 'BLOCO DE NOTAS - AVISO')}</span>
          <button
            onClick={() => {
              if (dialog.onCancel) dialog.onCancel();
              onClose();
            }}
            className={`w-5 h-5 border border-black flex items-center justify-center text-xs font-bold cursor-pointer ${
              isDanger ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-white hover:bg-black hover:text-white'
            }`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-white text-xs space-y-3">
          <div className="whitespace-pre-wrap leading-relaxed text-black">
            {dialog.message}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-black pt-3 flex justify-end space-x-2">
            {!isAlert && (
              <button
                type="button"
                onClick={() => {
                  if (dialog.onCancel) dialog.onCancel();
                  onClose();
                }}
                className="px-3 h-6 border border-black bg-white hover:bg-[#FFFFCC] text-xs cursor-pointer"
              >
                {dialog.cancelText || '[ Cancelar (Esc) ]'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                dialog.onConfirm();
                onClose();
              }}
              autoFocus
              className={`px-4 h-6 border border-black font-bold text-xs cursor-pointer ${
                isDanger
                  ? 'bg-red-600 text-white hover:bg-black'
                  : 'bg-[#FFFFCC] hover:bg-[#ffff99] text-black'
              }`}
            >
              {dialog.confirmText || (isAlert ? '[ OK (Enter) ]' : '[ Confirmar (Enter) ]')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
