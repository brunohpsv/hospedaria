import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1 ou ?', desc: 'Abrir esta tela de atalhos e documentação de navegação' },
    { key: 'F2 ou Alt+1', desc: 'Ir para a tela de Cadastro de Hóspedes & Reservas' },
    { key: 'F3 ou Alt+2', desc: 'Ir para a tela de Controle de Quartos' },
    { key: 'F4 ou Alt+3', desc: 'Ir para a tela de Tabela de Valores (Tarifário)' },
    { key: 'F5 ou Alt+4', desc: 'Ir para a tela de Calendário de Reservas (Grade)' },
    { key: 'Ctrl + N', desc: 'Iniciar novo cadastro de hóspede / formulário em branco' },
    { key: 'Ctrl + S', desc: 'Salvar hóspede atual / persistir dados no sistema local' },
    { key: 'Ctrl + F', desc: 'Focar na barra de busca rápida superior' },
    { key: 'F7', desc: 'Abrir modal de emissão de Comprovante TXT do Bloco de Notas' },
    { key: 'Esc', desc: 'Fechar modais abertos ou limpar formulário de digitação' },
    { key: 'TAB', desc: 'Avançar para o próximo campo de formulário com rapidez' },
    { key: 'Shift + TAB', desc: 'Voltar para o campo de formulário anterior' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 font-mono">
      <div className="bg-white border-2 border-black w-full max-w-xl shadow-none">
        {/* Title Bar */}
        <div className="bg-white text-black border-b border-black px-2 py-1 flex items-center justify-between text-xs font-bold select-none">
          <div className="flex items-center space-x-1.5">
            <span className="material-symbols-outlined text-sm leading-none">help</span>
            <span>AJUDA & GUIA DE ATALHOS - BLOCO DE NOTAS [F1]</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 border border-black hover:bg-black hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="p-3 bg-white text-xs">
          <div className="bg-[#FFFFCC] border border-black p-2 mb-3">
            <span className="font-bold block mb-1 text-xs">
              FOCO EM RAPIDEZ DE DIGITAÇÃO E OPERAÇÃO DIÁRIA:
            </span>
            <p className="text-[10px] text-gray-800">
              O sistema adota o padrão minimalista Windows Bloco de Notas para garantir que o
              atendente possa operar 100% via teclado com total agilidade.
            </p>
          </div>

          <table className="w-full border-collapse text-left text-xs mb-3">
            <thead>
              <tr className="border-b border-black bg-white">
                <th className="py-1 w-32 font-bold text-[11px]">ATALHO</th>
                <th className="py-1 font-bold text-[11px]">AÇÃO EXECUTADA</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((s, idx) => (
                <tr key={idx} className="border-b border-dotted border-black hover:bg-[#FFFFCC]">
                  <td className="py-1 font-bold whitespace-nowrap">
                    <span className="bg-[#FFFFCC] border border-black px-1 py-0.5 text-[10px]">
                      {s.key}
                    </span>
                  </td>
                  <td className="py-1 text-[11px]">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-black pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="h-6 px-4 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-xs"
            >
              [ ENTENDIDO (Esc) ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
