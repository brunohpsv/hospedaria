import React, { useState, useEffect } from 'react';
import { Room, RoomStatus } from '../types';

interface RoomControlProps {
  rooms: Room[];
  categories: string[];
  onUpdateRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  onUpdateRoomRate: (roomId: string, newRate: number) => void;
  onAddNewRoom: (room: Room) => void;
  onDeleteRoom?: (roomId: string) => void;
  onUpdateRoomCategory?: (roomId: string, newCategory: string) => void;
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => boolean | void;
  onQuickCheckIn: (roomNumber: string) => void;
  onQuickCheckOut: (roomId: string) => void;
  searchQuery: string;
}

export const RoomControl: React.FC<RoomControlProps> = ({
  rooms,
  categories,
  onUpdateRoomStatus,
  onUpdateRoomRate,
  onAddNewRoom,
  onDeleteRoom,
  onUpdateRoomCategory,
  onAddCategory,
  onDeleteCategory,
  onQuickCheckIn,
  onQuickCheckOut,
  searchQuery,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterCategory, setFilterCategory] = useState<string>('TODOS');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // New room state
  const [newNumber, setNewNumber] = useState('');
  const [newType, setNewType] = useState<string>(() => categories[0] || 'Standard');
  const [newArea, setNewArea] = useState('Principal');
  const [newRate, setNewRate] = useState(220);
  const [newCapacity, setNewCapacity] = useState(2);

  // Inline Category creation inside room form
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');

  // Modal Category creation
  const [modalCategoryName, setModalCategoryName] = useState('');

  // Quick inline edit rate
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<number>(0);

  // Keep newType valid if categories change
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(newType)) {
      setNewType(categories[0]);
    }
  }, [categories, newType]);

  // Keep filterCategory valid if a category was deleted
  useEffect(() => {
    if (filterCategory !== 'TODOS' && !categories.includes(filterCategory)) {
      setFilterCategory('TODOS');
    }
  }, [categories, filterCategory]);

  const total = rooms.length;
  const libres = rooms.filter((r) => r.status === 'livre').length;
  const ocupados = rooms.filter((r) => r.status === 'ocupado').length;
  const limpeza = rooms.filter((r) => r.status === 'limpeza').length;
  const manutencao = rooms.filter((r) => r.status === 'manutenção').length;

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.currentGuestName && r.currentGuestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.area.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'TODOS' ||
      (filterStatus === 'LIVRE' && r.status === 'livre') ||
      (filterStatus === 'OCUPADO' && r.status === 'ocupado') ||
      (filterStatus === 'LIMPEZA' && r.status === 'limpeza') ||
      (filterStatus === 'MANUTENÇÃO' && r.status === 'manutenção');

    const matchesCategory =
      filterCategory === 'TODOS' || r.type.toLowerCase() === filterCategory.toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) {
      alert('Informe o número ou código do quarto!');
      return;
    }
    if (rooms.some((r) => r.number.toLowerCase() === newNumber.trim().toLowerCase())) {
      alert('Já existe um quarto cadastrado com esse número!');
      return;
    }

    const created: Room = {
      id: `r-${Date.now()}`,
      number: newNumber.trim().toUpperCase(),
      type: newType || categories[0] || 'Standard',
      area: newArea.trim() || 'Principal',
      status: 'livre',
      dailyRate: Number(newRate) || 200,
      capacity: Number(newCapacity) || 2,
    };

    onAddNewRoom(created);
    setNewNumber('');
    setShowAddForm(false);
  };

  const handleCreateInlineCategory = () => {
    const trimmed = inlineCategoryName.trim();
    if (!trimmed) {
      alert('Digite o nome da nova categoria!');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }
    onAddCategory(trimmed);
    setNewType(trimmed);
    setInlineCategoryName('');
    setShowInlineAddCategory(false);
  };

  const handleCreateModalCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = modalCategoryName.trim();
    if (!trimmed) {
      alert('Digite o nome da categoria!');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }
    onAddCategory(trimmed);
    setModalCategoryName('');
  };

  const handleDeleteCategoryPrompt = (catName: string) => {
    if (categories.length <= 1) {
      alert('O hotel precisa de pelo menos uma categoria ativa!');
      return;
    }
    const countRoomsWithCategory = rooms.filter(
      (r) => r.type.toLowerCase() === catName.toLowerCase()
    ).length;

    if (countRoomsWithCategory > 0) {
      const remaining = categories.filter((c) => c !== catName)[0] || 'Standard';
      const confirmed = window.confirm(
        `A categoria "${catName}" possui ${countRoomsWithCategory} quarto(s) vinculado(s).\n\nAo excluir, estes quartos serão reclassificados para "${remaining}".\n\nDeseja confirmar a exclusão?`
      );
      if (confirmed) {
        onDeleteCategory(catName);
      }
    } else {
      const confirmed = window.confirm(`Excluir a categoria "${catName}"?`);
      if (confirmed) {
        onDeleteCategory(catName);
      }
    }
  };

  return (
    <div className="p-3 bg-white font-mono text-xs">
      {/* Top Header */}
      <div className="border-b border-black pb-2 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="bg-[#FFFFCC] px-2 py-0.5 text-xs font-bold border border-black">
          CONTROLE DE QUARTOS
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-2 py-0.5 border border-black bg-white hover:bg-[#FFFFCC] font-bold cursor-pointer text-[11px]"
          >
            [ GERENCIAR CATEGORIAS ({categories.length}) ]
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2 py-0.5 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-[11px]"
          >
            {showAddForm ? '[-] Fechar' : '[+] Novo Quarto'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="border border-black p-2 mb-3 bg-white space-y-2">
        {/* Status Filter */}
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="font-bold text-[10px]">STATUS:</span>
          <button
            onClick={() => setFilterStatus('TODOS')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-[10px] ${
              filterStatus === 'TODOS' ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            TODOS ({total})
          </button>
          <button
            onClick={() => setFilterStatus('LIVRE')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-[10px] ${
              filterStatus === 'LIVRE' ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            LIVRES ({libres})
          </button>
          <button
            onClick={() => setFilterStatus('OCUPADO')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-[10px] ${
              filterStatus === 'OCUPADO' ? 'bg-[#FFFFCC] font-bold text-red-600' : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            OCUPADOS ({ocupados})
          </button>
          <button
            onClick={() => setFilterStatus('LIMPEZA')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-[10px] ${
              filterStatus === 'LIMPEZA' ? 'bg-[#FFFFCC] font-bold text-blue-600' : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            LIMPEZA ({limpeza})
          </button>
          <button
            onClick={() => setFilterStatus('MANUTENÇÃO')}
            className={`px-2 py-0.5 border border-black cursor-pointer text-[10px] ${
              filterStatus === 'MANUTENÇÃO' ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            MANUTENÇÃO ({manutencao})
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-1.5 flex-wrap pt-1 border-t border-dotted border-black">
          <span className="font-bold text-[10px]">CATEGORIA:</span>
          <button
            onClick={() => setFilterCategory('TODOS')}
            className={`px-1.5 py-0.5 border border-black cursor-pointer text-[10px] ${
              filterCategory === 'TODOS' ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
            }`}
          >
            TODAS
          </button>
          {categories.map((cat) => {
            const count = rooms.filter((r) => r.type.toLowerCase() === cat.toLowerCase()).length;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-1.5 py-0.5 border border-black cursor-pointer text-[10px] ${
                  filterCategory === cat ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
                }`}
              >
                {cat.toUpperCase()} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Cadastro do Quarto Form */}
      {showAddForm && (
        <div className="border border-black p-3 mb-3 bg-white">
          <div className="border-b border-black pb-1 mb-2 font-bold flex items-center justify-between text-[11px]">
            <span className="bg-[#FFFFCC] px-1 border border-black">CADASTRO DE QUARTO</span>
          </div>

          <form onSubmit={handleCreateRoom} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
            <div>
              <label className="block font-bold mb-0.5 text-[10px]" htmlFor="new-room-num">
                Nº / CÓDIGO:*
              </label>
              <input
                id="new-room-num"
                type="text"
                required
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="Ex: 204"
                className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-0.5">
                <label className="block font-bold text-[10px]" htmlFor="new-room-type">
                  CATEGORIA:*
                </label>
                <button
                  type="button"
                  onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                  className="text-[9px] bg-[#FFFFCC] px-1 border border-black font-bold hover:bg-[#ffff99] cursor-pointer"
                >
                  {showInlineAddCategory ? '[-] Fechar' : '[+] Nova'}
                </button>
              </div>

              <select
                id="new-room-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-0.5 text-[10px]" htmlFor="new-room-area">
                ÁREA:
              </label>
              <input
                id="new-room-area"
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Ex: Térreo"
                className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-bold mb-0.5 text-[10px]" htmlFor="new-room-rate">
                DIÁRIA (R$):*
              </label>
              <input
                id="new-room-rate"
                type="number"
                required
                value={newRate}
                onChange={(e) => setNewRate(Number(e.target.value))}
                className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-bold mb-0.5 text-[10px]" htmlFor="new-room-cap">
                CAPACIDADE:
              </label>
              <input
                id="new-room-cap"
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            {showInlineAddCategory && (
              <div className="col-span-full border border-black p-2 bg-[#FFFFCC] flex flex-wrap items-center gap-2">
                <span className="font-bold text-[10px]">NOVA CATEGORIA:</span>
                <input
                  type="text"
                  value={inlineCategoryName}
                  onChange={(e) => setInlineCategoryName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="border border-black px-2 h-6 bg-white text-xs flex-1 min-w-[200px] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateInlineCategory();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="h-6 px-3 border border-black bg-black text-white hover:bg-gray-800 font-bold text-[10px] cursor-pointer"
                >
                  [+ CRIAR]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInlineAddCategory(false);
                    setInlineCategoryName('');
                  }}
                  className="h-6 px-2 border border-black bg-white hover:bg-[#FFFFCC] text-[10px] cursor-pointer"
                >
                  [Cancelar]
                </button>
              </div>
            )}

            <div className="col-span-full flex justify-end space-x-2 pt-2 border-t border-dotted border-black">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-black px-3 h-6 bg-white hover:bg-[#FFFFCC] text-xs cursor-pointer"
              >
                [ Cancelar ]
              </button>
              <button
                type="submit"
                className="border border-black px-4 h-6 bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-xs"
              >
                [ SALVAR QUARTO ]
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table */}
      <div className="border border-black overflow-x-auto bg-white p-2">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 w-12 font-bold">NUM</th>
              <th className="py-1 font-bold">CATEGORIA</th>
              <th className="py-1 font-bold">ÁREA</th>
              <th className="py-1 font-bold">STATUS</th>
              <th className="py-1 font-bold">HÓSPEDE</th>
              <th className="py-1 font-bold">PERÍODO</th>
              <th className="py-1 text-right font-bold">DIÁRIA (R$)</th>
              <th className="py-1 text-center font-bold">ALTERAR STATUS</th>
              <th className="py-1 text-center font-bold">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-4 text-center text-gray-500 border-b border-dotted border-black"
                >
                  Nenhum quarto encontrado.
                </td>
              </tr>
            ) : (
              filteredRooms.map((r) => {
                const isOccupied = r.status === 'ocupado';
                const isFree = r.status === 'livre';
                const isCleaning = r.status === 'limpeza';
                const isMaintenance = r.status === 'manutenção';

                return (
                  <tr key={r.id} className="border-b border-dotted border-black hover:bg-[#FFFFCC]">
                    <td className="py-1 font-bold">{r.number}</td>

                    <td className="py-1 whitespace-nowrap">
                      {onUpdateRoomCategory ? (
                        <div className="flex items-center space-x-1">
                          <select
                            value={r.type}
                            onChange={(e) => onUpdateRoomCategory(r.id, e.target.value)}
                            className="border border-black px-1 h-5 bg-white focus:bg-[#FFFFCC] text-[10px] font-bold cursor-pointer"
                            title="Alterar categoria"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-gray-600">({r.capacity}p)</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold">{r.type.toUpperCase()}</span>
                          <span className="text-[10px] text-gray-600 block">({r.capacity}p)</span>
                        </div>
                      )}
                    </td>

                    <td className="py-1 text-gray-700">{r.area}</td>

                    <td className="py-1 whitespace-nowrap">
                      {isOccupied && <span className="text-red-600 font-bold">OCUPADO</span>}
                      {isFree && <span className="text-black">LIVRE</span>}
                      {isCleaning && <span className="text-blue-600 font-bold">LIMPEZA</span>}
                      {isMaintenance && <span className="text-gray-700 font-bold">MANUTENÇÃO</span>}
                    </td>

                    <td className="py-1">
                      {r.currentGuestName ? (
                        <span className="font-bold">{r.currentGuestName}</span>
                      ) : (
                        <span className="text-gray-400">---</span>
                      )}
                    </td>

                    <td className="py-1 text-[10px] whitespace-nowrap">
                      {r.checkInDate && r.checkOutDate ? (
                        <span>
                          {r.checkInDate.slice(5)} a {r.checkOutDate.slice(5)}
                        </span>
                      ) : (
                        <span className="text-gray-400">---</span>
                      )}
                    </td>

                    <td className="py-1 text-right font-bold whitespace-nowrap">
                      {editingRateId === r.id ? (
                        <div className="flex items-center justify-end space-x-1">
                          <input
                            type="number"
                            value={tempRate}
                            onChange={(e) => setTempRate(Number(e.target.value))}
                            className="w-16 border border-black px-1 h-5 text-right bg-[#FFFFCC]"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              onUpdateRoomRate(r.id, tempRate);
                              setEditingRateId(null);
                            }}
                            className="px-1 border border-black bg-[#FFFFCC] text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingRateId(r.id);
                            setTempRate(r.dailyRate);
                          }}
                          className="cursor-pointer hover:bg-[#FFFFCC] px-1"
                          title="Clique para editar valor"
                        >
                          {r.dailyRate.toFixed(2)}
                        </div>
                      )}
                    </td>

                    <td className="py-1 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onUpdateRoomStatus(r.id, 'livre')}
                          className={`px-1 border border-black text-[10px] cursor-pointer ${
                            isFree ? 'bg-black text-white font-bold' : 'bg-white hover:bg-[#FFFFCC]'
                          }`}
                        >
                          Livre
                        </button>
                        <button
                          onClick={() => onUpdateRoomStatus(r.id, 'ocupado')}
                          className={`px-1 border border-black text-[10px] cursor-pointer ${
                            isOccupied ? 'bg-[#FFFFCC] font-bold text-red-600' : 'bg-white hover:bg-[#FFFFCC]'
                          }`}
                        >
                          Ocupar
                        </button>
                        <button
                          onClick={() => onUpdateRoomStatus(r.id, 'limpeza')}
                          className={`px-1 border border-black text-[10px] cursor-pointer ${
                            isCleaning ? 'bg-black text-white font-bold' : 'bg-white hover:bg-[#FFFFCC]'
                          }`}
                        >
                          Limpar
                        </button>
                        <button
                          onClick={() => onUpdateRoomStatus(r.id, 'manutenção')}
                          className={`px-1 border border-black text-[10px] cursor-pointer ${
                            isMaintenance ? 'bg-black text-white font-bold' : 'bg-white hover:bg-[#FFFFCC]'
                          }`}
                        >
                          Manut.
                        </button>
                      </div>
                    </td>

                    <td className="py-1 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        {isFree && (
                          <button
                            onClick={() => onQuickCheckIn(r.number)}
                            className="px-1.5 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-[10px]"
                          >
                            [Check-in]
                          </button>
                        )}
                        {isOccupied && (
                          <button
                            onClick={() => onQuickCheckOut(r.id)}
                            className="px-1.5 border border-black bg-white hover:bg-[#FFFFCC] font-bold cursor-pointer text-[10px]"
                          >
                            [Saída]
                          </button>
                        )}
                        {isCleaning && (
                          <button
                            onClick={() => onUpdateRoomStatus(r.id, 'livre')}
                            className="px-1.5 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-[10px]"
                          >
                            [Liberar]
                          </button>
                        )}
                        {isMaintenance && (
                          <button
                            onClick={() => onUpdateRoomStatus(r.id, 'limpeza')}
                            className="px-1.5 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-[10px]"
                          >
                            [Liberar]
                          </button>
                        )}

                        {isFree && onDeleteRoom && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir o quarto ${r.number}?`)) {
                                onDeleteRoom(r.id);
                              }
                            }}
                            className="px-1 border border-black bg-white hover:bg-red-600 hover:text-white text-gray-500 cursor-pointer text-[10px]"
                            title={`Excluir quarto ${r.number}`}
                          >
                            [×]
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 font-mono">
          <div className="bg-white border-2 border-black max-w-xl w-full text-black">
            <div className="bg-[#FFFFCC] border-b border-black p-2 flex items-center justify-between font-bold text-xs">
              <span>GERENCIADOR DE CATEGORIAS</span>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-1.5 border border-black bg-white hover:bg-black hover:text-white text-xs cursor-pointer"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-3">
              {/* Add Category */}
              <form onSubmit={handleCreateModalCategory} className="border border-black p-2 bg-[#FFFFCC]">
                <label className="block font-bold text-[10px] mb-1" htmlFor="modal-cat-name">
                  NOVA CATEGORIA:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="modal-cat-name"
                    type="text"
                    value={modalCategoryName}
                    onChange={(e) => setModalCategoryName(e.target.value)}
                    placeholder="Ex: Suíte Família, Bangalô Mar..."
                    className="border border-black px-2 h-7 bg-white text-xs flex-1 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="h-7 px-3 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    [ + CRIAR ]
                  </button>
                </div>
              </form>

              {/* Categories Table */}
              <div className="border border-black p-2 bg-white max-h-64 overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-black bg-white">
                      <th className="py-1 font-bold">CATEGORIA</th>
                      <th className="py-1 font-bold text-center">QUARTOS</th>
                      <th className="py-1 font-bold text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => {
                      const count = rooms.filter(
                        (r) => r.type.toLowerCase() === cat.toLowerCase()
                      ).length;

                      return (
                        <tr
                          key={cat}
                          className="border-b border-dotted border-black hover:bg-[#FFFFCC]"
                        >
                          <td className="py-1 font-bold">{cat}</td>
                          <td className="py-1 text-center font-bold">{count}</td>
                          <td className="py-1 text-right">
                            <button
                              onClick={() => handleDeleteCategoryPrompt(cat)}
                              disabled={categories.length <= 1}
                              className={`px-2 py-0.5 border border-black text-[10px] cursor-pointer ${
                                categories.length <= 1
                                  ? 'opacity-40 cursor-not-allowed bg-gray-200'
                                  : 'bg-white hover:bg-red-600 hover:text-white'
                              }`}
                            >
                              [× Excluir]
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 h-6 border border-black bg-white hover:bg-[#FFFFCC] text-xs cursor-pointer font-bold"
                >
                  [ Fechar ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
