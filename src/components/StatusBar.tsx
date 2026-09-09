import React, { useState, useEffect } from 'react';
import { ActiveTab, Room } from '../types';
import { useDialog } from '../lib/dialogContext';

interface StatusBarProps {
  activeTab: ActiveTab;
  rooms: Room[];
  onResetData: () => void;
  onClearData: () => void;
  isCloudSynced?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeTab,
  rooms,
  onResetData,
  onClearData,
  isCloudSynced = true,
}) => {
  const [time, setTime] = useState<string>('');
  const { showConfirm } = useDialog();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabLabels: Record<ActiveTab, string> = {
    hospedes: 'HÓSPEDES',
    quartos: 'QUARTOS',
    valores: 'VALORES & TARIFÁRIO',
    calendario: 'CALENDÁRIO',
  };

  const occupied = rooms.filter((r) => r.status === 'ocupado').length;
  const occupancyPercent = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0;

  return (
    <footer className="bg-white border-t border-black px-2 py-1 text-[11px] font-mono select-none flex flex-wrap items-center justify-between gap-2 text-black">
      <div className="flex items-center space-x-3">
        <span>
          MODO: <strong className="bg-[#FFFFCC] px-1 border border-black">{tabLabels[activeTab]}</strong>
        </span>
        <span className="text-gray-400">|</span>
        <span>
          OCUPAÇÃO: <strong>{occupied}/{rooms.length}</strong> ({occupancyPercent}%)
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <span className="flex items-center space-x-1">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isCloudSynced ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
          <span className="text-gray-700">{isCloudSynced ? 'CONECTADO' : 'OFFLINE'}</span>
        </span>

        <span className="text-gray-400">|</span>

        <button
          onClick={() => {
            showConfirm({
              title: 'RESTAURAR DADOS PADRÃO',
              message: 'Deseja restaurar os dados padrão de demonstração no sistema?\n\nQuartos, hóspedes e tarifas padrão serão reinseridos.',
              confirmText: '[ Restaurar (Enter) ]',
              onConfirm: onResetData,
            });
          }}
          className="text-gray-600 hover:text-black hover:bg-[#FFFFCC] px-1 cursor-pointer font-bold"
          title="Restaurar dados padrão de exemplo"
        >
          [RESTAURAR DADOS]
        </button>

        <button
          onClick={() => {
            showConfirm({
              title: 'AVISO CRÍTICO - ZERAR DADOS',
              message: 'ATENÇÃO: Deseja realmente ZERAR todas as informações da plataforma (quartos, hóspedes e reservas)?\n\nEsta ação limpará permanentemente todos os registros atuais.',
              type: 'danger',
              confirmText: '[ Sim, Zerar Tudo ]',
              onConfirm: onClearData,
            });
          }}
          className="text-red-600 hover:text-white hover:bg-red-600 px-1 cursor-pointer font-bold"
          title="Zerar todas as informações da plataforma"
        >
          [ZERAR DADOS]
        </button>

        <span className="text-gray-400">|</span>

        <span className="font-bold bg-[#FFFFCC] px-1.5 border border-black">{time}</span>
      </div>
    </footer>
  );
};
