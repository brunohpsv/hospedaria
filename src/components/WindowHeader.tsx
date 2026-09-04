import React from 'react';
import { ActiveTab, Room } from '../types';

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
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenShortcuts,
  onOpenTxtExport,
  onNewGuest,
  searchQuery,
  setSearchQuery,
  notification,
  isCloudSynced = true,
}) => {
  return (
    <header className="bg-white border-b border-black select-none font-mono text-xs">
      {/* Primary Top Header: Title, Navigation & Search */}
      <div className="flex flex-wrap items-center justify-between border-b border-black px-2 py-1 bg-white gap-2">
        {/* Brand & Main Navigation Tabs */}
        <div className="flex items-center space-x-1 flex-wrap">
          <span className="font-bold bg-black text-white px-1.5 py-0.5 text-[11px] mr-2">
            HOTEL NOTEPAD
          </span>

          <button
            onClick={() => setActiveTab('hospedes')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-xs ${
              activeTab === 'hospedes'
                ? 'bg-[#FFFFCC] font-bold'
                : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            HÓSPEDES (F2)
          </button>

          <button
            onClick={() => setActiveTab('quartos')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-xs ${
              activeTab === 'quartos'
                ? 'bg-[#FFFFCC] font-bold'
                : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            QUARTOS (F4)
          </button>

          <button
            onClick={() => setActiveTab('valores')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-xs ${
              activeTab === 'valores'
                ? 'bg-[#FFFFCC] font-bold'
                : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            VALORES
          </button>

          <button
            onClick={() => setActiveTab('calendario')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-xs ${
              activeTab === 'calendario'
                ? 'bg-[#FFFFCC] font-bold'
                : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            CALENDÁRIO
          </button>
        </div>

        {/* Quick Actions, Search & Cloud Status */}
        <div className="flex items-center space-x-2 text-xs flex-wrap">
          {/* Quick Actions */}
          <button
            onClick={onNewGuest}
            className="px-2 py-0.5 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-[11px]"
            title="Novo Hóspede (F1)"
          >
            + NOVO HÓSPEDE
          </button>

          <button
            onClick={onOpenTxtExport}
            className="px-2 py-0.5 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-[11px]"
            title="Exportar ou Gerar Ficha TXT (F7)"
          >
            FICHA TXT
          </button>

          <button
            onClick={onOpenShortcuts}
            className="px-2 py-0.5 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-[11px]"
            title="Lista de atalhos de teclado (Esc)"
          >
            ATALHOS
          </button>

          {/* Search Box */}
          <div className="flex items-center border border-black bg-white px-1.5 h-6">
            <span className="text-[10px] font-bold mr-1 text-gray-700">BUSCA:</span>
            <input
              id="top-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nome, quarto, doc..."
              className="w-32 bg-transparent text-xs focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-black font-bold px-1 hover:bg-[#FFFFCC] cursor-pointer"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Cloud Sync Status Indicator */}
          <div
            className="flex items-center space-x-1 px-1.5 py-0.5 border border-black text-[10px] bg-white"
            title="Dados sincronizados em nuvem via Firebase Firestore"
          >
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                isCloudSynced ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">
              {isCloudSynced ? 'FIREBASE ON' : 'SINCRONIZANDO'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating or Inline Notification Bar (only displayed when active) */}
      {notification && (
        <div className="bg-[#FFFFCC] border-b border-black px-3 py-1 text-xs font-bold flex items-center justify-between">
          <span>{notification}</span>
          <span className="text-[10px] text-gray-600 font-normal">SISTEMA ATUALIZADO</span>
        </div>
      )}
    </header>
  );
};
