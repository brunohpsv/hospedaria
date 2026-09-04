import React, { useState } from 'react';
import { Room, GuestReservation } from '../types';

interface BookingCalendarProps {
  rooms: Room[];
  guests: GuestReservation[];
  onSelectGuest: (guestId: string) => void;
  onQuickBookRoom: (roomNumber: string, date: string) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  rooms,
  guests,
  onSelectGuest,
  onQuickBookRoom,
}) => {
  // Year and Month state (Defaulting to September 2026 based on mock data)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed: 8 is September
  const [selectedCellInfo, setSelectedCellInfo] = useState<{
    roomNumber: string;
    dateStr: string;
    guest?: GuestReservation;
    status: string;
  } | null>(null);

  // Month names in Portuguese
  const monthNames = [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedCellInfo(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedCellInfo(null);
  };

  const goToToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(8); // September
    setSelectedCellInfo(null);
  };

  // Helper to determine day of week abbreviation
  const getDayOfWeekName = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    const dayOfWeek = d.getDay();
    const names = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return names[dayOfWeek];
  };

  // Check if a specific date falls within a guest's stay
  const getGuestForRoomAndDate = (roomNumber: string, dateStr: string) => {
    const targetDate = new Date(dateStr + 'T00:00:00');
    return guests.find((g) => {
      if (g.roomNumber !== roomNumber) return false;
      if (g.status === 'Cancelada' || g.status === 'Check-out') return false;
      const start = new Date(g.checkIn + 'T00:00:00');
      const end = new Date(g.checkOut + 'T00:00:00');
      return targetDate >= start && targetDate < end;
    });
  };

  const handleCellClick = (room: Room, day: number) => {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const guest = getGuestForRoomAndDate(room.number, dateStr);

    if (guest) {
      setSelectedCellInfo({
        roomNumber: room.number,
        dateStr,
        guest,
        status: guest.status === 'Hospedado' ? 'OCUPADO' : 'RESERVADO',
      });
    } else if (room.status === 'manutenção') {
      setSelectedCellInfo({
        roomNumber: room.number,
        dateStr,
        status: 'MANUTENÇÃO',
      });
    } else if (room.status === 'limpeza' && day === 4) {
      setSelectedCellInfo({
        roomNumber: room.number,
        dateStr,
        status: 'LIMPEZA',
      });
    } else {
      setSelectedCellInfo({
        roomNumber: room.number,
        dateStr,
        status: 'LIVRE',
      });
    }
  };

  return (
    <div className="p-3 bg-white font-mono text-xs">
      {/* Section Header */}
      <div className="border-b border-black pb-2 mb-3 flex flex-wrap items-center justify-between">
        <h2 className="bg-[#FFFFCC] inline-block px-1 text-xs font-bold border border-black">
          CALENDÁRIO DE RESERVAS & OCUPAÇÃO
        </h2>
      </div>

      {/* Month Navigation & Legend Bar */}
      <div className="border border-black p-2 mb-3 bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={prevMonth}
            className="px-2 h-6 border border-black bg-white hover:bg-[#FFFFCC] font-bold cursor-pointer text-xs"
          >
            [ &lt; ANTERIOR ]
          </button>
          <span className="font-bold text-xs bg-[#FFFFCC] px-3 h-6 flex items-center border border-black">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            className="px-2 h-6 border border-black bg-white hover:bg-[#FFFFCC] font-bold cursor-pointer text-xs"
          >
            [ PRÓXIMO &gt; ]
          </button>
          <button
            onClick={goToToday}
            className="px-2 h-6 border border-black bg-white hover:bg-[#FFFFCC] text-xs cursor-pointer"
          >
            [ Hoje ]
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[10px] flex-wrap">
          <span className="font-bold">LEGENDA:</span>
          <span className="flex items-center space-x-1">
            <span className="inline-block w-4 h-4 border border-black bg-white text-center text-[9px] leading-4 text-gray-400">
              ..
            </span>
            <span>Livre</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="inline-block w-4 h-4 border border-black bg-[#FFFFCC] font-bold text-red-600 text-center text-[9px] leading-4">
              OC
            </span>
            <span>Ocupado</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="inline-block w-4 h-4 border border-black bg-[#FFFFCC] text-center text-[9px] leading-4">
              RS
            </span>
            <span>Reserva</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="inline-block w-4 h-4 border border-black bg-black text-white text-center text-[9px] leading-4">
              LM
            </span>
            <span>Limpeza</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="inline-block w-4 h-4 border border-black bg-gray-200 text-center text-[9px] leading-4">
              MN
            </span>
            <span>Manutenção</span>
          </span>
        </div>
      </div>

      {/* Selected Cell Detail Box */}
      {selectedCellInfo && (
        <div className="border border-black p-2.5 mb-3 bg-[#FFFFCC] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-bold text-xs">
              DETALHES: Quarto {selectedCellInfo.roomNumber} - Data: {selectedCellInfo.dateStr} [
              {selectedCellInfo.status}]
            </div>
            {selectedCellInfo.guest ? (
              <div className="text-[11px]">
                Hóspede: <strong>{selectedCellInfo.guest.name}</strong> | Doc:{' '}
                {selectedCellInfo.guest.document || '---'} | Tel:{' '}
                {selectedCellInfo.guest.phone || '---'} | Período:{' '}
                {selectedCellInfo.guest.checkIn} a {selectedCellInfo.guest.checkOut} | Total:{' '}
                <strong>R$ {selectedCellInfo.guest.totalAmount.toFixed(2)}</strong>
              </div>
            ) : (
              <div className="text-[11px] text-gray-700">
                Este quarto está {selectedCellInfo.status.toLowerCase()} nesta data.
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {selectedCellInfo.guest ? (
              <button
                onClick={() => onSelectGuest(selectedCellInfo.guest!.id)}
                className="px-2 h-6 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs"
              >
                [ ABRIR CADASTRO ]
              </button>
            ) : (
              <button
                onClick={() =>
                  onQuickBookRoom(selectedCellInfo.roomNumber, selectedCellInfo.dateStr)
                }
                className="px-2 h-6 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs"
              >
                [ + RESERVAR NESTA DATA ]
              </button>
            )}
            <button
              onClick={() => setSelectedCellInfo(null)}
              className="px-2 h-6 border border-black bg-white hover:bg-black hover:text-white cursor-pointer text-xs"
            >
              [ Fechar ]
            </button>
          </div>
        </div>
      )}

      {/* Monospace Simple Grid Table with Thin Lines */}
      <div className="border border-black overflow-x-auto bg-white p-2">
        <table className="w-full border-collapse border border-black text-center text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="border border-black px-2 py-1 text-left sticky left-0 bg-[#FFFFCC] z-10 w-32 min-w-[130px] font-bold text-[11px]">
                QUARTO
              </th>
              {dayList.map((day) => {
                const dayOfWeek = getDayOfWeekName(day);
                const isWeekend = dayOfWeek === 'SÁB' || dayOfWeek === 'DOM';
                const isToday = currentYear === 2026 && currentMonth === 8 && day === 4;

                return (
                  <th
                    key={day}
                    className={`border border-black px-0.5 py-1 min-w-[26px] text-center ${
                      isToday
                        ? 'bg-[#FFFFCC] font-bold text-red-600'
                        : isWeekend
                        ? 'bg-gray-100 font-semibold'
                        : 'bg-white'
                    }`}
                  >
                    <div className="text-[10px]">{String(day).padStart(2, '0')}</div>
                    <div className="text-[8px] text-gray-600">{dayOfWeek}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-b border-dotted border-black hover:bg-[#FFFFCC]">
                {/* Room code and label sticky on left */}
                <td className="border border-black px-2 py-1 text-left sticky left-0 bg-white hover:bg-[#FFFFCC] z-10 font-bold whitespace-nowrap text-[11px]">
                  <span>{room.number}</span>
                  <span className="text-[9px] text-gray-500 block font-normal">
                    {room.type.slice(0, 10)}
                  </span>
                </td>

                {/* Day cells */}
                {dayList.map((day) => {
                  const dayStr = String(day).padStart(2, '0');
                  const monthStr = String(currentMonth + 1).padStart(2, '0');
                  const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

                  const guest = getGuestForRoomAndDate(room.number, dateStr);
                  const isMaintenance = room.status === 'manutenção';
                  const isCleaningToday = room.status === 'limpeza' && day === 4;

                  let cellText = '..';
                  let cellClass =
                    'border border-black text-gray-300 cursor-pointer hover:bg-[#FFFFCC]';

                  if (guest) {
                    if (guest.status === 'Hospedado') {
                      cellText = 'OC';
                      cellClass =
                        'border border-black bg-[#FFFFCC] font-bold text-red-600 cursor-pointer hover:bg-black hover:text-white';
                    } else {
                      cellText = 'RS';
                      cellClass =
                        'border border-black bg-[#FFFFCC] text-black cursor-pointer hover:bg-black hover:text-white';
                    }
                  } else if (isCleaningToday) {
                    cellText = 'LM';
                    cellClass = 'border border-black bg-black text-white font-bold cursor-pointer';
                  } else if (isMaintenance) {
                    cellText = 'MN';
                    cellClass =
                      'border border-black bg-gray-200 text-gray-700 cursor-pointer';
                  }

                  const isSelected =
                    selectedCellInfo &&
                    selectedCellInfo.roomNumber === room.number &&
                    selectedCellInfo.dateStr === dateStr;

                  return (
                    <td
                      key={day}
                      onClick={() => handleCellClick(room, day)}
                      title={
                        guest
                          ? `${room.number} - ${guest.name} (${guest.status})`
                          : `Quarto ${room.number} - ${dateStr}: Livre`
                      }
                      className={`h-6 px-0.5 text-center text-[9px] select-none ${cellClass} ${
                        isSelected ? 'outline-2 outline-black font-extrabold' : ''
                      }`}
                    >
                      {cellText}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Action bar below calendar */}
      <div className="mt-3 border border-black p-2 bg-[#FFFFCC] flex flex-wrap items-center justify-between text-[10px]">
        <div>
          <span>Total de Unidades: <strong>{rooms.length}</strong> | </span>
          <span>Dias no Mês: <strong>{daysInMonth}</strong> | </span>
          <span>Data de Referência: <strong>04/09/2026</strong></span>
        </div>
        <div className="text-gray-700">
          Clique no dia livre para abrir o formulário de reserva com a data preenchida
        </div>
      </div>
    </div>
  );
};
