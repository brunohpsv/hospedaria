import React, { useState, useEffect, useRef } from 'react';
import { GuestReservation, Room } from '../types';

interface GuestRegistrationProps {
  guests: GuestReservation[];
  rooms: Room[];
  onSaveGuest: (guest: GuestReservation) => void;
  onCheckOutGuest: (guestId: string) => void;
  onDeleteGuest: (guestId: string) => void;
  onPrintGuestTxt: (guest: GuestReservation) => void;
  searchQuery: string;
  selectedGuestId?: string | null;
  onSelectGuestId?: (id: string | null) => void;
}

export const GuestRegistration: React.FC<GuestRegistrationProps> = ({
  guests,
  rooms,
  onSaveGuest,
  onCheckOutGuest,
  onDeleteGuest,
  onPrintGuestTxt,
  searchQuery,
  selectedGuestId,
  onSelectGuestId,
}) => {
  // Form state
  const [id, setId] = useState<string>('');
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numGuests, setNumGuests] = useState(2);
  const [dailyRate, setDailyRate] = useState(220);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [status, setStatus] = useState<'Hospedado' | 'Confirmada' | 'Check-out' | 'Cancelada'>('Hospedado');
  const [notes, setNotes] = useState('');

  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize dates to today and +2 days if empty
  useEffect(() => {
    if (!checkIn) {
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setCheckIn(today);
      setCheckOut(future);
    }
  }, [checkIn]);

  // If a guest was selected from external or clicked from table
  useEffect(() => {
    if (selectedGuestId) {
      const g = guests.find((item) => item.id === selectedGuestId);
      if (g) {
        populateForm(g);
      }
    }
  }, [selectedGuestId, guests]);

  const populateForm = (g: GuestReservation) => {
    setId(g.id);
    setName(g.name);
    setDocument(g.document);
    setPhone(g.phone);
    setEmail(g.email);
    setCity(g.city);
    setRoomNumber(g.roomNumber);
    setCheckIn(g.checkIn);
    setCheckOut(g.checkOut);
    setNumGuests(g.numGuests);
    setDailyRate(g.dailyRate);
    setDiscount(g.discount || 0);
    setPaymentMethod(g.paymentMethod || 'PIX');
    setStatus(g.status);
    setNotes(g.notes || '');
    setFormFeedback(`[FICHA: ${g.name.toUpperCase()}]`);
    if (onSelectGuestId) onSelectGuestId(g.id);
  };

  const handleClearForm = () => {
    setId('');
    setName('');
    setDocument('');
    setPhone('');
    setEmail('');
    setCity('');
    const firstFree = rooms.find((r) => r.status === 'livre');
    if (firstFree) {
      setRoomNumber(firstFree.number);
      setDailyRate(firstFree.dailyRate);
    } else if (rooms.length > 0) {
      setRoomNumber(rooms[0].number);
      setDailyRate(rooms[0].dailyRate);
    }
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCheckIn(today);
    setCheckOut(future);
    setNumGuests(2);
    setDiscount(0);
    setPaymentMethod('PIX');
    setStatus('Hospedado');
    setNotes('');
    setFormFeedback(null);
    if (onSelectGuestId) onSelectGuestId(null);
    nameInputRef.current?.focus();
  };

  const handleRoomChange = (num: string) => {
    setRoomNumber(num);
    const room = rooms.find((r) => r.number === num);
    if (room) {
      setDailyRate(room.dailyRate);
    }
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights();
  const estimatedTotal = Math.max(0, nights * dailyRate - Number(discount || 0));

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do hóspede!');
      nameInputRef.current?.focus();
      return;
    }
    if (!roomNumber) {
      alert('Selecione um quarto para o hóspede!');
      return;
    }

    const guestData: GuestReservation = {
      id: id || `g-${Date.now()}`,
      name: name.trim(),
      document: document.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      roomNumber,
      checkIn,
      checkOut,
      numGuests: Number(numGuests) || 1,
      dailyRate: Number(dailyRate) || 0,
      discount: Number(discount) || 0,
      totalAmount: estimatedTotal,
      paymentMethod,
      status,
      notes: notes.trim(),
      createdAt: id
        ? guests.find((g) => g.id === id)?.createdAt || checkIn
        : new Date().toISOString().split('T')[0],
    };

    onSaveGuest(guestData);
    setFormFeedback(`[HÓSPEDE SALVO: ${guestData.name.toUpperCase()}]`);
  };

  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.document.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'TODOS' ||
      (filterStatus === 'HOSPEDADO' && g.status === 'Hospedado') ||
      (filterStatus === 'RESERVAS' && g.status === 'Confirmada') ||
      (filterStatus === 'CHECK-OUT' && g.status === 'Check-out');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-3 bg-white font-mono text-xs">
      {/* Top Section Header */}
      <div className="border-b border-black pb-2 mb-3 flex items-center justify-between">
        <h2 className="bg-[#FFFFCC] px-2 py-0.5 text-xs font-bold border border-black">
          CADASTRO DE HÓSPEDES
        </h2>
        <div className="flex items-center space-x-2">
          {formFeedback && (
            <span className="bg-[#FFFFCC] border border-black px-2 py-0.5 text-[10px] font-bold">
              {formFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={handleClearForm}
            className="px-2 py-0.5 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-[11px]"
          >
            [+ Novo Formulário]
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Form */}
        <div className="lg:col-span-6 border border-black p-3 bg-white">
          <div className="border-b border-black pb-1 mb-2 font-bold flex items-center justify-between text-[11px]">
            <span className="bg-[#FFFFCC] px-1 border border-black">
              {id ? `FICHA ATIVA: #${id.slice(-6)}` : 'NOVA ENTRADA'}
            </span>
            <span className="text-[10px] text-gray-700">
              {id ? 'EDITANDO DADOS' : 'PREENCHIMENTO RÁPIDO'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Nome */}
            <div>
              <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-name">
                NOME COMPLETO:*
              </label>
              <input
                id="guest-name"
                ref={nameInputRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do hóspede"
                className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            {/* Documento & Telefone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-doc">
                  CPF / RG:
                </label>
                <input
                  id="guest-doc"
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-phone">
                  TELEFONE / WHATSAPP:
                </label>
                <input
                  id="guest-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Email & Cidade */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-email">
                  E-MAIL:
                </label>
                <input
                  id="guest-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-city">
                  CIDADE / UF:
                </label>
                <input
                  id="guest-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Curitiba/PR"
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Quarto & PAX */}
            <div className="grid grid-cols-3 gap-2 border-t border-black pt-2">
              <div className="col-span-2">
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-room">
                  QUARTO / UNIDADE:*
                </label>
                <select
                  id="guest-room"
                  value={roomNumber}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                >
                  <option value="">-- Selecione o Quarto --</option>
                  {rooms.map((r) => {
                    const statusTag =
                      r.status === 'livre'
                        ? '[LIVRE]'
                        : r.status === 'ocupado'
                        ? `[OCUPADO: ${r.currentGuestName || 'Hóspede'}]`
                        : `[${r.status.toUpperCase()}]`;
                    return (
                      <option key={r.id} value={r.number}>
                        Quarto {r.number} - {r.type} ({statusTag}) - R$ {r.dailyRate}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-people">
                  PAX (PESSOAS):
                </label>
                <input
                  id="guest-people"
                  type="number"
                  min="1"
                  max="12"
                  value={numGuests}
                  onChange={(e) => setNumGuests(Number(e.target.value))}
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Check-in & Check-out */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-checkin">
                  CHECK-IN:*
                </label>
                <input
                  id="guest-checkin"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-checkout">
                  CHECK-OUT:*
                </label>
                <input
                  id="guest-checkout"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Valores e Pagamento */}
            <div className="grid grid-cols-3 gap-2 border-t border-black pt-2">
              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-rate">
                  DIÁRIA (R$):
                </label>
                <input
                  id="guest-rate"
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-discount">
                  DESCONTO (R$):
                </label>
                <input
                  id="guest-discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-payment">
                  FORMA PGTO:
                </label>
                <select
                  id="guest-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Transferência">Transferência</option>
                  <option value="A Faturar">A Faturar</option>
                </select>
              </div>
            </div>

            {/* Status e Total Estimado */}
            <div className="grid grid-cols-2 gap-2 items-center bg-[#FFFFCC] border border-black p-2">
              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-status">
                  STATUS DA ESTADIA:
                </label>
                <select
                  id="guest-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border border-black px-1.5 h-6 bg-white font-bold focus:bg-[#FFFFCC] focus:outline-none text-xs"
                >
                  <option value="Hospedado">[HOSPEDADO] - Quarto Ocupado</option>
                  <option value="Confirmada">[CONFIRMADA] - Reserva Futura</option>
                  <option value="Check-out">[CHECK-OUT] - Encerrado</option>
                  <option value="Cancelada">[CANCELADA] - Cancelado</option>
                </select>
              </div>

              <div className="text-right">
                <span className="text-[10px] block">
                  {nights} diária(s) × R$ {dailyRate.toFixed(2)}
                </span>
                <span className="text-xs font-bold block bg-white border border-black px-1.5 py-0.5 mt-0.5 text-center">
                  TOTAL: R$ {estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block font-bold mb-0.5 text-[10px]" htmlFor="guest-notes">
                OBSERVAÇÕES:
              </label>
              <textarea
                id="guest-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações ou solicitações especiais"
                className="w-full border border-black px-2 py-1 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            {/* Ações do Formulário */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black">
              <button
                type="submit"
                className="px-3 h-6 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-xs"
              >
                [ SALVAR HÓSPEDE ]
              </button>

              <button
                type="button"
                onClick={handleClearForm}
                className="px-3 h-6 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-xs"
              >
                [ Limpar ]
              </button>

              {id && (
                <button
                  type="button"
                  onClick={() => {
                    const g = guests.find((item) => item.id === id);
                    if (g) onPrintGuestTxt(g);
                  }}
                  className="px-3 h-6 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-xs"
                >
                  [ Ficha TXT ]
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Guest List */}
        <div className="lg:col-span-6 border border-black p-3 bg-white flex flex-col">
          <div className="flex flex-wrap items-center justify-between border-b border-black pb-1 mb-2 gap-2">
            <h3 className="font-bold text-xs">
              RESERVAS & HÓSPEDES ({filteredGuests.length})
            </h3>
            <div className="flex items-center space-x-1">
              {['TODOS', 'HOSPEDADO', 'RESERVAS', 'CHECK-OUT'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterStatus(filter)}
                  className={`px-1.5 py-0.5 border border-black text-[10px] cursor-pointer ${
                    filterStatus === filter
                      ? 'bg-[#FFFFCC] font-bold'
                      : 'bg-white hover:bg-[#FFFFCC]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="border-b border-black sticky top-0 bg-white">
                <tr>
                  <th className="py-1 w-10 font-bold">QTO</th>
                  <th className="py-1 font-bold">HÓSPEDE</th>
                  <th className="py-1 font-bold">STATUS</th>
                  <th className="py-1 font-bold">PERÍODO</th>
                  <th className="py-1 text-right font-bold">TOTAL (R$)</th>
                  <th className="py-1 text-center font-bold">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-gray-500 border-b border-dotted border-black"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((g) => {
                    const isSelected = g.id === id;
                    const isOccupied = g.status === 'Hospedado';
                    const isReserved = g.status === 'Confirmada';

                    return (
                      <tr
                        key={g.id}
                        onClick={() => populateForm(g)}
                        className={`cursor-pointer border-b border-dotted border-black hover:bg-[#FFFFCC] ${
                          isSelected ? 'bg-[#FFFFCC] font-semibold' : 'bg-white'
                        }`}
                      >
                        <td className="py-1 font-bold">{g.roomNumber}</td>
                        <td className="py-1">
                          <div className="font-bold">{g.name}</div>
                          <div className="text-[10px] text-gray-600">
                            {g.phone || g.document || g.city}
                          </div>
                        </td>
                        <td className="py-1">
                          {isOccupied ? (
                            <span className="text-red-600 font-bold">OCUPADO</span>
                          ) : isReserved ? (
                            <span className="font-bold">RESERVA</span>
                          ) : (
                            <span className="text-gray-500">[{g.status.toUpperCase()}]</span>
                          )}
                        </td>
                        <td className="py-1 whitespace-nowrap text-[10px]">
                          {g.checkIn.slice(5)} a {g.checkOut.slice(5)}
                        </td>
                        <td className="py-1 text-right font-bold whitespace-nowrap">
                          {g.totalAmount.toFixed(2)}
                        </td>
                        <td
                          className="py-1 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => populateForm(g)}
                              className="px-1 border border-black bg-white hover:bg-[#FFFFCC] text-[10px] cursor-pointer"
                              title="Editar"
                            >
                              [Edit]
                            </button>
                            <button
                              onClick={() => onPrintGuestTxt(g)}
                              className="px-1 border border-black bg-white hover:bg-[#FFFFCC] text-[10px] cursor-pointer"
                              title="Ficha TXT"
                            >
                              [TXT]
                            </button>
                            {g.status === 'Hospedado' && (
                              <button
                                onClick={() => onCheckOutGuest(g.id)}
                                className="px-1 border border-black bg-[#FFFFCC] hover:bg-black hover:text-white font-bold text-[10px] cursor-pointer"
                                title="Check-out"
                              >
                                [Saída]
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Excluir hóspede ${g.name}?`)) {
                                  onDeleteGuest(g.id);
                                }
                              }}
                              className="px-1 border border-black bg-white hover:bg-red-600 hover:text-white text-[10px] cursor-pointer"
                              title="Excluir"
                            >
                              [×]
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 pt-2 border-t border-black text-[10px] text-gray-700 flex justify-between">
            <span>Total: <strong>{filteredGuests.length}</strong> registro(s)</span>
            <span>Hospedados: <strong>{filteredGuests.filter((g) => g.status === 'Hospedado').length}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
