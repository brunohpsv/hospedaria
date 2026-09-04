import React, { useState } from 'react';
import { GuestReservation, Room } from '../types';

interface TxtVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest?: GuestReservation | null;
  guests: GuestReservation[];
  rooms: Room[];
}

export const TxtVoucherModal: React.FC<TxtVoucherModalProps> = ({
  isOpen,
  onClose,
  guest: initialGuest,
  guests,
  rooms,
}) => {
  const [selectedGuestId, setSelectedGuestId] = useState<string>(
    initialGuest?.id || (guests.length > 0 ? guests[0].id : '')
  );
  const [mode, setMode] = useState<'voucher' | 'daily_report'>('voucher');
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (!isOpen) return null;

  const currentGuest = guests.find((g) => g.id === selectedGuestId) || guests[0];
  const currentRoom = currentGuest
    ? rooms.find((r) => r.number === currentGuest.roomNumber)
    : null;

  // Build plain text voucher
  const generateVoucherText = () => {
    if (!currentGuest) return 'Nenhum hóspede selecionado.';

    const now = new Date();
    const timestamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    return `======================================================================
         POUSADA & VILAS RECANTO DAS ÁGUAS - COMPROVANTE DE HOSPEDAGEM
======================================================================
ID DO REGISTRO: ${currentGuest.id}
DATA DE EMISSÃO: ${timestamp}
----------------------------------------------------------------------
DADOS DO HÓSPEDE:
  NOME COMPLETO : ${currentGuest.name.toUpperCase()}
  DOCUMENTO     : ${currentGuest.document || 'NÃO INFORMADO'}
  TELEFONE      : ${currentGuest.phone || 'NÃO INFORMADO'}
  E-MAIL        : ${currentGuest.email || 'NÃO INFORMADO'}
  ORIGEM        : ${currentGuest.city || 'NÃO INFORMADO'}
----------------------------------------------------------------------
DETALHES DA ACOMODAÇÃO:
  UNIDADE/QUARTO: ${currentGuest.roomNumber} - ${currentRoom?.type || 'Standard'}
  LOCALIZAÇÃO   : ${currentRoom?.area || 'Bloco Principal'}
  Nº DE HÓSPEDES: ${currentGuest.numGuests} pessoa(s)
  CHECK-IN      : ${currentGuest.checkIn} (A partir das 14:00)
  CHECK-OUT     : ${currentGuest.checkOut} (Até as 12:00)
----------------------------------------------------------------------
DEMONSTRATIVO FINANCEIRO:
  VALOR DA DIÁRIA  : R$ ${currentGuest.dailyRate.toFixed(2)}
  DESCONTO         : R$ ${currentGuest.discount.toFixed(2)}
  VALOR TOTAL PAGO : R$ ${currentGuest.totalAmount.toFixed(2)}
  FORMA PAGAMENTO  : ${currentGuest.paymentMethod}
  STATUS DA ESTADIA: [${currentGuest.status.toUpperCase()}]
----------------------------------------------------------------------
OBSERVAÇÕES DO REGISTRO:
  ${currentGuest.notes || 'Nenhuma observação informada.'}
======================================================================
TERMOS E CONDIÇÕES:
1. Horário de silêncio a partir das 22h.
2. Café da manhã servido das 07:30 às 10:00 no restaurante principal.
3. Chave do quarto deve ser entregue na recepção no ato do check-out.

Assinatura do Hóspede: _______________________________________________
======================================================================`;
  };

  // Build daily report text
  const generateDailyReport = () => {
    const totalRooms = rooms.length;
    const occupied = rooms.filter((r) => r.status === 'ocupado').length;
    const free = rooms.filter((r) => r.status === 'livre').length;
    const cleaning = rooms.filter((r) => r.status === 'limpeza').length;
    const now = new Date().toLocaleDateString('pt-BR');

    let lines = `======================================================================
          RELATÓRIO DIÁRIO DE OCUPAÇÃO - SISTEMA HOTEL/VILAS (TXT)
======================================================================
DATA: ${now}  |  GERADO POR: RECEPÇÃO GERAL
TOTAL DE UNIDADES: ${totalRooms}  |  OCUPADOS: ${occupied}  |  LIVRES: ${free}  |  LIMPEZA: ${cleaning}
TAXA DE OCUPAÇÃO : ${Math.round((occupied / totalRooms) * 100)}%
----------------------------------------------------------------------
MAPA ATUAL DE QUARTOS:
----------------------------------------------------------------------
Nº     TIPO            STATUS       DIÁRIA     HÓSPEDE ATUAL
----------------------------------------------------------------------\n`;

    rooms.forEach((r) => {
      const numPad = r.number.padEnd(6, ' ');
      const typePad = r.type.slice(0, 14).padEnd(15, ' ');
      const statusPad = `[${r.status.toUpperCase()}]`.padEnd(12, ' ');
      const ratePad = `R$ ${r.dailyRate.toFixed(2)}`.padEnd(10, ' ');
      const guestPad = r.currentGuestName || '--- Vago ---';
      lines += `${numPad} ${typePad} ${statusPad} ${ratePad} ${guestPad}\n`;
    });

    lines += `======================================================================
FIM DO RELATÓRIO OPERACIONAL
======================================================================`;
    return lines;
  };

  const displayText = mode === 'voucher' ? generateVoucherText() : generateDailyReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownloadTxt = () => {
    const filename =
      mode === 'voucher'
        ? `ficha_hospede_${currentGuest?.name.replace(/\s+/g, '_') || 'hospedagem'}.txt`
        : `relatorio_diario_hotel_${new Date().toISOString().split('T')[0]}.txt`;

    const blob = new Blob([displayText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Comprovante TXT</title>
            <style>
              body { font-family: 'Consolas', 'Courier New', monospace; white-space: pre; font-size: 12px; margin: 20px; }
            </style>
          </head>
          <body>${displayText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 font-mono">
      <div className="bg-white border-2 border-black w-full max-w-3xl shadow-none">
        {/* Title Bar Notepad Style */}
        <div className="bg-white text-black border-b border-black px-2 py-1 flex items-center justify-between text-xs font-bold select-none">
          <div className="flex items-center space-x-1.5">
            <span className="material-symbols-outlined text-sm leading-none">description</span>
            <span>EMISSÃO DE DOCUMENTO TXT - BLOCO DE NOTAS [F7]</span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 border border-black hover:bg-black hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-2 border-b border-black bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMode('voucher')}
              className={`h-6 px-2 border border-black cursor-pointer text-xs ${
                mode === 'voucher' ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
              }`}
            >
              Ficha de Hospedagem
            </button>
            <button
              onClick={() => setMode('daily_report')}
              className={`h-6 px-2 border border-black cursor-pointer text-xs ${
                mode === 'daily_report' ? 'bg-[#FFFFCC] font-bold' : 'bg-white hover:bg-[#FFFFCC]'
              }`}
            >
              Relatório Diário
            </button>
          </div>

          {mode === 'voucher' && (
            <div className="flex items-center space-x-1">
              <label htmlFor="select-guest" className="font-bold text-[10px]">
                HÓSPEDE:
              </label>
              <select
                id="select-guest"
                value={selectedGuestId}
                onChange={(e) => setSelectedGuestId(e.target.value)}
                className="border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs max-w-xs"
              >
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.roomNumber} - {g.name} ({g.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Textarea displaying true Notepad TXT */}
        <div className="p-3 bg-white">
          <textarea
            readOnly
            value={displayText}
            rows={18}
            className="w-full border border-black p-2 font-mono text-xs leading-relaxed bg-white focus:bg-[#FFFFCC]/10 focus:outline-none resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-2 border-t border-black bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="h-6 px-3 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-xs"
            >
              {copyFeedback ? '[ COPIADO COM SUCESSO! ]' : '[ COPIAR TEXTO ]'}
            </button>
            <button
              onClick={handleDownloadTxt}
              className="h-6 px-3 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-xs"
            >
              [ BAIXAR ARQUIVO .TXT ]
            </button>
            <button
              onClick={handlePrint}
              className="h-6 px-3 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-xs"
            >
              [ IMPRIMIR ]
            </button>
          </div>

          <button
            onClick={onClose}
            className="h-6 px-3 border border-black bg-white hover:bg-black hover:text-white cursor-pointer font-bold text-xs"
          >
            [ FECHAR (Esc) ]
          </button>
        </div>
      </div>
    </div>
  );
};
