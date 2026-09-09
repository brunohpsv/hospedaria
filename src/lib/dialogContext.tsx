import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotepadDialog, DialogConfig } from '../components/NotepadDialog';

interface DialogContextType {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (options: {
    message: string;
    title?: string;
    type?: 'confirm' | 'danger';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const showAlert = (message: string, title?: string) => {
    setDialog({
      title: title || 'BLOCO DE NOTAS - AVISO',
      message,
      type: 'alert',
      confirmText: '[ OK (Enter) ]',
      onConfirm: () => setDialog(null),
    });
  };

  const showConfirm = (options: {
    message: string;
    title?: string;
    type?: 'confirm' | 'danger';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setDialog({
      title: options.title || (options.type === 'danger' ? 'CONFIRMAÇÃO CRÍTICA' : 'BLOCO DE NOTAS - CONFIRMAÇÃO'),
      message: options.message,
      type: options.type || 'confirm',
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: () => {
        options.onConfirm();
        setDialog(null);
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        setDialog(null);
      },
    });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <NotepadDialog dialog={dialog} onClose={() => setDialog(null)} />
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showAlert: (msg: string) => {
        try {
          window.alert(msg);
        } catch {
          console.warn(msg);
        }
      },
      showConfirm: ({ message, onConfirm, onCancel }) => {
        try {
          if (window.confirm(message)) {
            onConfirm();
          } else if (onCancel) {
            onCancel();
          }
        } catch {
          onConfirm();
        }
      },
    };
  }
  return context;
};
