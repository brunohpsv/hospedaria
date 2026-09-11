import React from 'react';
import { ActiveTab, Room, ClientAccount } from '../types';
import { SUBSCRIPTION_PLANS } from '../lib/authConstants';

interface WindowHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  rooms: Room[];
  onOpenShortcuts: () => void;
  onOpenTxtExport: () => void;
  onNewGuest: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notification: string | null;
  isCloudSynced?: boolean;
  currentClient?: ClientAccount | null;
  onLogout?: () => void;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenShortcuts,
  onOpenTxtExport,
  onNewGuest,
  searchQuery,
  setSearchQuery,
  isCloudSynced = true,
  currentClient,
  onLogout,
}) => {
  const planInfo = currentClient ? SUBSCRIPTION_PLANS[currentClient.plan] : null;

  const tabs: { id: ActiveTab; label: string; shortcut: string }[] = [
    { id: 'hospedes', label: 'HÓSPEDES', shortcut: 'F2' },
    { id: 'quartos', label: 'QUARTOS', shortcut: 'F3' },
    { id: 'valores', label: 'VALORES', shortcut: 'F4' },
    { id: 'calendario', label: 'CALENDÁRIO', shortcut: 'F5' },
    { id: 'funcionarios', label: 'FUNCIONÁRIOS', shortcut: 'F6' },
    { id: 'estoque', label: 'ESTOQUE', shortcut: 'F9' },
    { id: 'empresa', label: 'ESTABELECIMENTO', shortcut: 'F8' },
  ];

  return (
    <header className="bg-white border-b border-black select-none font-mono text-xs shrink-0">
      {/* Top System Bar: Brand, Hotel Identity & Global Utilities */}
      <div className="flex items-center justify-between border-b border-gray-300 px-3 py-1.5 bg-white gap-2 flex-wrap">
        {/* Left: Brand Identity & Active Establishment Name */}
        <div className="flex items-center space-x-2 min-w-0">
          <span className="font-bold bg-black text-white px-2 py-0.5 text-xs tracking-wider border border-black">
            HOTEL NOTEPAD
          </span>

          {currentClient && (
            <div className="flex items-center space-x-1.5 text-xs text-gray-800 truncate">
              <span className="text-gray-400 font-bold">•</span>
              <span className="font-bold text-gray-900 truncate">
                {currentClient.establishmentName || 'MEU ESTABELECIMENTO'}
              </span>
              {planInfo && (
                <span className="text-[10px] text-gray-500 hidden lg:inline-block">
                  ({planInfo.name.toUpperCase()} - {planInfo.roomLimitText})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Search, Shortcuts, Online Status & Logout */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Quick Search Box */}
          <div className="flex items-center border border-black bg-white px-2 h-6">
            <span className="text-[10px] font-bold mr-1.5 text-gray-600">BUSCAR:</span>
            <input
              id="top-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nome, quarto, código..."
              className="w-32 sm:w-44 bg-transparent text-xs focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-black font-bold px-1 hover:bg-gray-200 cursor-pointer text-[11px]"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Shortcuts Modal Trigger */}
          <button
            onClick={onOpenShortcuts}
            className="px-2 py-0.5 border border-black bg-white hover:bg-black hover:text-white cursor-pointer text-[11px] font-bold transition-colors"
            title="Lista de atalhos de teclado (F1)"
          >
            ATALHOS (F1)
          </button>

          {/* Realtime Cloud Sync Status */}
          <div
            className="flex items-center space-x-1.5 px-2 py-0.5 border border-black text-[10px] bg-white"
            title="Sincronização em nuvem ativa"
          >
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                isCloudSynced ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold text-gray-800">
              {isCloudSynced ? 'ONLINE' : 'SINCRONIZANDO'}
            </span>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              id="top-btn-logout"
              onClick={onLogout}
              className="px-2.5 py-0.5 border border-black bg-white text-red-700 hover:bg-red-600 hover:text-white cursor-pointer text-xs font-bold transition-colors"
              title="Encerrar sessão"
            >
              SAIR
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar: Clean Navigation Tabs & Primary Actions */}
      <div className="flex items-center justify-between px-3 py-1 bg-white border-b border-black gap-2 flex-wrap">
        {/* Navigation Tabs - Clean, Ordered, Zero Duplicates */}
        <nav className="flex items-center space-x-1 flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-xs border border-black cursor-pointer font-bold transition-colors ${
                  isActive
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
                title={`Alternar para aba ${tab.label} (${tab.shortcut})`}
              >
                {tab.label} <span className={`text-[10px] ml-0.5 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>({tab.shortcut})</span>
              </button>
            );
          })}
        </nav>

        {/* Primary Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onNewGuest}
            className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs transition-colors"
            title="Cadastrar Novo Hóspede (Ctrl+N)"
          >
            + NOVO HÓSPEDE
          </button>

          <button
            onClick={onOpenTxtExport}
            className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white cursor-pointer text-xs font-bold transition-colors"
            title="Exportar Ficha TXT (F7)"
          >
            FICHA TXT
          </button>
        </div>
      </div>
    </header>
  );
};

