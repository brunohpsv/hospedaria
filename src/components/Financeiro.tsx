import React, { useState, useMemo } from 'react';
import { GuestReservation, ClientAccount, FinancialRecord } from '../types';
import { useDialog } from '../lib/dialogContext';

interface FinanceiroProps {
  guests: GuestReservation[];
  financialRecords?: FinancialRecord[];
  currentClient?: ClientAccount | null;
  onSaveFinancialRecord?: (record: FinancialRecord) => void;
  onDeleteFinancialRecord?: (recordId: string) => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_ABBR = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

export const Financeiro: React.FC<FinanceiroProps> = ({
  guests,
  financialRecords = [],
  currentClient,
  onSaveFinancialRecord,
  onDeleteFinancialRecord,
}) => {
  const { showAlert, showConfirm } = useDialog();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'todos'>('todos');

  // New manual extra entry modal/form
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryCategory, setEntryCategory] = useState<string>('Diárias de Hospedagem');
  const [entryDescription, setEntryDescription] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<string>('PIX');
  const [entryGuestName, setEntryGuestName] = useState<string>('');
  const [entryRoomNumber, setEntryRoomNumber] = useState<string>('');

  // TXT export report modal
  const [txtModalContent, setTxtModalContent] = useState<string | null>(null);
  const [txtCopied, setTxtCopied] = useState<boolean>(false);

  // Available years from guests and records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear]);
    guests.forEach((g) => {
      const y = parseInt(g.checkIn?.split('-')[0] || g.createdAt?.split('-')[0] || '', 10);
      if (!isNaN(y)) yearsSet.add(y);
    });
    financialRecords.forEach((r) => {
      const y = parseInt(r.date?.split('-')[0] || '', 10);
      if (!isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [guests, financialRecords, currentYear]);

  // Combine guest reservations and manual financial records into a unified revenue item list
  interface RevenueItem {
    id: string;
    source: 'hospede' | 'avulso';
    date: string; // YYYY-MM-DD
    monthIndex: number; // 0 - 11
    year: number;
    title: string;
    guestName: string;
    roomNumber: string;
    category: string;
    paymentMethod: string;
    grossAmount: number;
    discount: number;
    netAmount: number;
    status: string;
  }

  const allRevenueItems = useMemo<RevenueItem[]>(() => {
    const items: RevenueItem[] = [];

    // Add guests who are not cancelled and have revenue
    guests.forEach((g) => {
      if (g.status === 'Cancelada') return;
      const refDate = g.checkIn || g.createdAt || new Date().toISOString().split('T')[0];
      const [yStr, mStr] = refDate.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1; // 0-indexed

      if (isNaN(y) || isNaN(m)) return;

      const gross = g.dailyRate ? (g.totalAmount + (g.discount || 0)) : g.totalAmount;
      items.push({
        id: `guest-${g.id}`,
        source: 'hospede',
        date: refDate,
        monthIndex: m,
        year: y,
        title: `Estadia Quarto ${g.roomNumber || '(S/Q)'} - ${g.name}`,
        guestName: g.name,
        roomNumber: g.roomNumber || '-',
        category: 'Diárias de Hospedagem',
        paymentMethod: g.paymentMethod || 'Não informado',
        grossAmount: gross,
        discount: g.discount || 0,
        netAmount: Number(g.totalAmount) || 0,
        status: g.status,
      });
    });

    // Add manual financial records
    financialRecords.forEach((r) => {
      const [yStr, mStr] = (r.date || '').split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (isNaN(y) || isNaN(m)) return;

      items.push({
        id: `rec-${r.id}`,
        source: 'avulso',
        date: r.date,
        monthIndex: m,
        year: y,
        title: r.description,
        guestName: r.guestName || '-',
        roomNumber: r.roomNumber || '-',
        category: r.category || 'Receita Avulsa',
        paymentMethod: r.paymentMethod || 'Outro',
        grossAmount: Number(r.amount) || 0,
        discount: 0,
        netAmount: Number(r.amount) || 0,
        status: 'Recebido',
      });
    });

    // Sort descending by date
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [guests, financialRecords]);

  // Filtered by selected year
  const yearItems = useMemo(() => {
    return allRevenueItems.filter((item) => item.year === selectedYear);
  }, [allRevenueItems, selectedYear]);

  // Monthly breakdown for selected year (12 months)
  const monthlyBreakdown = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, index) => {
      const itemsInMonth = yearItems.filter((i) => i.monthIndex === index);
      const totalAmount = itemsInMonth.reduce((acc, curr) => acc + curr.netAmount, 0);
      const count = itemsInMonth.length;
      return {
        monthIndex: index,
        name: MONTH_NAMES[index],
        abbr: MONTH_ABBR[index],
        totalAmount,
        count,
        items: itemsInMonth,
      };
    });

    const maxMonthly = Math.max(...data.map((d) => d.totalAmount), 1);

    return data.map((d) => ({
      ...d,
      percentOfMax: Math.round((d.totalAmount / maxMonthly) * 100),
    }));
  }, [yearItems]);

  // Overall totals for the selected year
  const yearTotalRevenue = useMemo(() => {
    return yearItems.reduce((acc, curr) => acc + curr.netAmount, 0);
  }, [yearItems]);

  const yearTotalTransactions = yearItems.length;

  const averageMonthlyRevenue = useMemo(() => {
    // Count active months that had at least 1 entry or up to current month if current year
    return yearTotalRevenue / 12;
  }, [yearTotalRevenue]);

  const averageTicket = useMemo(() => {
    if (yearTotalTransactions === 0) return 0;
    return yearTotalRevenue / yearTotalTransactions;
  }, [yearTotalRevenue, yearTotalTransactions]);

  // Items currently displayed based on month selection
  const displayedItems = useMemo(() => {
    if (selectedMonth === 'todos') {
      return yearItems;
    }
    return yearItems.filter((item) => item.monthIndex === selectedMonth);
  }, [yearItems, selectedMonth]);

  const displayedTotal = useMemo(() => {
    return displayedItems.reduce((acc, curr) => acc + curr.netAmount, 0);
  }, [displayedItems]);

  // Payment method breakdown for selected view
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; total: number }> = {};
    displayedItems.forEach((item) => {
      const pm = item.paymentMethod.trim() || 'Outros';
      if (!breakdown[pm]) {
        breakdown[pm] = { count: 0, total: 0 };
      }
      breakdown[pm].count += 1;
      breakdown[pm].total += item.netAmount;
    });
    return Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
  }, [displayedItems]);

  // Handle manual record save
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(entryAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert('Informe um valor monetário válido maior que zero.', 'VALOR INVÁLIDO');
      return;
    }
    if (!entryDescription.trim()) {
      showAlert('Informe uma descrição para o lançamento.', 'CAMPO OBRIGATÓRIO');
      return;
    }

    const newRec: FinancialRecord = {
      id: `fin-${Date.now()}`,
      date: entryDate,
      type: 'receita',
      category: entryCategory,
      description: entryDescription.trim(),
      amount: amountNum,
      paymentMethod: entryPaymentMethod,
      guestName: entryGuestName.trim() || undefined,
      roomNumber: entryRoomNumber.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveFinancialRecord?.(newRec);
    showAlert('Receita lançada com sucesso no balancete financeiro!', 'LANÇAMENTO SALVO');

    // Reset modal form
    setEntryDescription('');
    setEntryAmount('');
    setEntryGuestName('');
    setEntryRoomNumber('');
    setShowAddModal(false);
  };

  // Generate ASCII / TXT formatted Financial Balance Sheet
  const handleGenerateTxtReport = () => {
    const estName = currentClient?.establishmentName?.toUpperCase() || 'ESTABELECIMENTO';
    const periodLabel =
      selectedMonth === 'todos'
        ? `ANO COMPLETO DE ${selectedYear}`
        : `${MONTH_NAMES[selectedMonth].toUpperCase()} DE ${selectedYear}`;

    let text = `================================================================================
RELATÓRIO FINANCEIRO & DEMONSTRATIVO DE RECEITAS - HOTEL NOTEPAD
ESTABELECIMENTO: ${estName}
PERÍODO        : ${periodLabel}
EMISSÃO        : ${new Date().toLocaleString('pt-BR')}
================================================================================

[ RESUMO EXECUTIVO DO PERÍODO ]
TOTAL RECEBIDO NO PERÍODO: R$ ${displayedTotal.toFixed(2)}
TOTAL DE ENTRADAS/RECIBOS: ${displayedItems.length}
TICKET MÉDIO POR ESTADIA : R$ ${(displayedItems.length > 0 ? displayedTotal / displayedItems.length : 0).toFixed(2)}

--------------------------------------------------------------------------------
[ QUANTO ENTROU EM CADA MÊS DE ${selectedYear} ]
--------------------------------------------------------------------------------
MÊS        | TOTAL RECEBIDO (R$) | QTD ENTRADAS | BARRA VISUAL
--------------------------------------------------------------------------------
`;

    monthlyBreakdown.forEach((m) => {
      const barsCount = Math.round((m.percentOfMax / 100) * 15);
      const barStr = '█'.repeat(barsCount) + '░'.repeat(15 - barsCount);
      const isCurrentFilter = selectedMonth === m.monthIndex ? ' [SELECIONADO]' : '';
      text += `${m.name.padEnd(11, ' ')}| R$ ${m.totalAmount.toFixed(2).padStart(17, ' ')} | ${String(m.count).padStart(12, ' ')} | [${barStr}] ${String(m.percentOfMax).padStart(3, ' ')}%${isCurrentFilter}\n`;
    });

    text += `--------------------------------------------------------------------------------
FATURAMENTO TOTAL ANUAL (${selectedYear}): R$ ${yearTotalRevenue.toFixed(2)}
MÉDIA MENSAL DO ANO               : R$ ${averageMonthlyRevenue.toFixed(2)}
--------------------------------------------------------------------------------

[ DISTRIBUIÇÃO POR FORMA DE PAGAMENTO ]
`;

    paymentBreakdown.forEach(([method, data]) => {
      const pct = displayedTotal > 0 ? ((data.total / displayedTotal) * 100).toFixed(1) : '0.0';
      text += `${method.padEnd(25, ' ')}: R$ ${data.total.toFixed(2).padStart(12, ' ')} (${pct}%) - ${data.count} lançamento(s)\n`;
    });

    text += `\n--------------------------------------------------------------------------------
[ DETALHAMENTO DE TODAS AS ENTRADAS DO PERÍODO (${displayedItems.length}) ]
--------------------------------------------------------------------------------
DATA       | QTO  | HÓSPEDE / DESCRIÇÃO                    | FORMA PAGTO     | VALOR (R$)
--------------------------------------------------------------------------------
`;

    displayedItems.forEach((item) => {
      const cleanDesc = (item.guestName !== '-' ? item.guestName : item.title).slice(0, 36);
      text += `${item.date} | ${item.roomNumber.padEnd(4, ' ')} | ${cleanDesc.padEnd(38, ' ')} | ${item.paymentMethod.slice(0, 15).padEnd(15, ' ')} | R$ ${item.netAmount.toFixed(2).padStart(9, ' ')}\n`;
    });

    text += `--------------------------------------------------------------------------------
TOTAL GERAL DO PERÍODO: R$ ${displayedTotal.toFixed(2)}
================================================================================
RELATÓRIO GERADO AUTOMATICAMENTE PELO SISTEMA HOTEL NOTEPAD`;

    setTxtModalContent(text);
    setTxtCopied(false);
  };

  const handleCopyTxt = () => {
    if (txtModalContent) {
      navigator.clipboard.writeText(txtModalContent);
      setTxtCopied(true);
      setTimeout(() => setTxtCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!txtModalContent) return;
    const blob = new Blob([txtModalContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financeiro_${selectedYear}_${selectedMonth === 'todos' ? 'anual' : MONTH_ABBR[selectedMonth].toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white p-2 font-mono text-xs overflow-hidden select-text">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-black pb-2 mb-2 gap-2 shrink-0">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="font-bold text-xs bg-black text-white border border-black px-2 py-0.5 tracking-wide">
            CONTROLE FINANCEIRO & RECEITAS MENSAIS
          </span>

          {/* Year Selector */}
          <div className="flex items-center border border-black bg-white px-2 h-7 space-x-1">
            <span className="text-[10px] font-bold text-gray-600">ANO:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedMonth('todos');
              }}
              className="bg-transparent font-bold text-xs focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector Dropdown / Shortcuts */}
          <div className="flex items-center border border-black bg-white px-2 h-7 space-x-1">
            <span className="text-[10px] font-bold text-gray-600">MÊS:</span>
            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === 'todos' ? 'todos' : Number(e.target.value))
              }
              className="bg-transparent font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos os Meses (Ano Completo)</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {String(idx + 1).padStart(2, '0')} - {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-2.5 h-7 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs transition-colors"
            title="Adicionar receita avulsa, frigobar ou taxa extra"
          >
            + LANÇAR RECEITA AVULSA
          </button>

          <button
            onClick={handleGenerateTxtReport}
            className="px-2.5 h-7 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs transition-colors"
            title="Emitir balancete em formato Bloco de Notas .TXT"
          >
            📄 BALANCETE TXT
          </button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 shrink-0">
        <div className="border border-black p-2 bg-gray-50">
          <span className="text-[10px] font-bold text-gray-600 block">
            FATURAMENTO ANUAL ({selectedYear})
          </span>
          <div className="text-base sm:text-lg font-bold text-emerald-800">
            R$ {yearTotalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-500">Total acumulado no ano</span>
        </div>

        <div className="border border-black p-2 bg-gray-100">
          <span className="text-[10px] font-bold text-gray-700 block">
            {selectedMonth === 'todos'
              ? 'RECEITA TOTAL FILTRADA'
              : `RECEITA EM ${MONTH_NAMES[selectedMonth].toUpperCase()}`}
          </span>
          <div className="text-base sm:text-lg font-bold text-black">
            R$ {displayedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-600">
            {displayedItems.length} entrada(s) registradas
          </span>
        </div>

        <div className="border border-black p-2 bg-gray-50">
          <span className="text-[10px] font-bold text-gray-600 block">
            MÉDIA MENSAL ({selectedYear})
          </span>
          <div className="text-base sm:text-lg font-bold text-gray-900">
            R$ {averageMonthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-500">Média por mês no exercício</span>
        </div>

        <div className="border border-black p-2 bg-gray-50">
          <span className="text-[10px] font-bold text-gray-600 block">TICKET MÉDIO</span>
          <div className="text-base sm:text-lg font-bold text-gray-900">
            R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-gray-500">Média por estadia/receita</span>
        </div>
      </div>

      {/* Main Split Content: Monthly Chart & Entries List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Quanto Entrou em Cada Mês (12 Months Breakdown) */}
        <div className="lg:col-span-5 border border-black p-2 bg-white flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-black pb-1 mb-2 shrink-0">
            <h3 className="font-bold text-xs">
              QUANTO ENTROU EM CADA MÊS DE {selectedYear}
            </h3>
            {selectedMonth !== 'todos' && (
              <button
                onClick={() => setSelectedMonth('todos')}
                className="text-[10px] underline font-bold hover:text-blue-700 cursor-pointer"
              >
                [Ver Todos]
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 space-y-1 pr-1 border border-black p-1 bg-gray-50">
            {monthlyBreakdown.map((m) => {
              const isSelected = selectedMonth === m.monthIndex;
              const hasEntries = m.totalAmount > 0;

              return (
                <div
                  key={m.monthIndex}
                  onClick={() => setSelectedMonth(m.monthIndex)}
                  className={`p-1.5 border border-black cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#FFFFCC] font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold w-16">{m.name}:</span>
                      <span className="text-[10px] text-gray-600">
                        ({m.count} {m.count === 1 ? 'estadia' : 'estadias'})
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        hasEntries ? 'text-emerald-800' : 'text-gray-400'
                      }`}
                    >
                      R$ {m.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Visual Bar Graphic (Retro ASCII/Solid block) */}
                  <div className="flex items-center space-x-2 text-[10px]">
                    <div className="flex-1 bg-gray-200 border border-gray-400 h-2.5 overflow-hidden">
                      <div
                        className={`h-full ${
                          isSelected ? 'bg-black' : hasEntries ? 'bg-emerald-600' : 'bg-transparent'
                        }`}
                        style={{ width: `${Math.max(m.percentOfMax, 2)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-500 font-mono">
                      {m.percentOfMax}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Payment Method Summary at Bottom of Left Column */}
          <div className="border-t border-black pt-2 mt-2 shrink-0">
            <span className="text-[10px] font-bold block mb-1">
              FORMAS DE PAGAMENTO ({selectedMonth === 'todos' ? selectedYear : MONTH_ABBR[selectedMonth]}):
            </span>
            <div className="flex flex-wrap gap-1">
              {paymentBreakdown.slice(0, 4).map(([method, val]) => (
                <div
                  key={method}
                  className="border border-black px-1.5 py-0.5 text-[10px] bg-white flex items-center space-x-1"
                >
                  <span className="font-bold">{method}:</span>
                  <span>R$ {val.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Entries List for the Selected Period */}
        <div className="lg:col-span-7 border border-black p-2 bg-white flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-black pb-1 mb-2 shrink-0">
            <h3 className="font-bold text-xs">
              ENTRADAS DETALHADAS -{' '}
              {selectedMonth === 'todos'
                ? `ANO DE ${selectedYear} (${displayedItems.length})`
                : `${MONTH_NAMES[selectedMonth].toUpperCase()} DE ${selectedYear} (${displayedItems.length})`}
            </h3>
            <span className="font-bold text-xs text-emerald-800">
              Total: R$ {displayedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Entries Table with Internal Scroll */}
          <div className="overflow-x-auto flex-1 min-h-0 overflow-y-auto border border-black">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="border-b border-black sticky top-0 bg-[#FFFFCC] z-10">
                <tr>
                  <th className="py-1 px-1.5 font-bold w-20">DATA</th>
                  <th className="py-1 px-1.5 font-bold w-12 text-center">QTO</th>
                  <th className="py-1 px-1.5 font-bold">HÓSPEDE / DESCRIÇÃO</th>
                  <th className="py-1 px-1.5 font-bold">PAGAMENTO</th>
                  <th className="py-1 px-1.5 text-right font-bold w-24">VALOR (R$)</th>
                  <th className="py-1 px-1.5 text-center font-bold w-12">AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-gray-500 border-b border-dotted border-black"
                    >
                      Nenhuma entrada ou receita registrada neste período.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-dotted border-black hover:bg-[#FFFFCC] transition-colors"
                    >
                      <td className="py-1 px-1.5 whitespace-nowrap text-[10px]">
                        {item.date}
                      </td>
                      <td className="py-1 px-1.5 text-center font-bold">
                        {item.roomNumber}
                      </td>
                      <td className="py-1 px-1.5">
                        <div className="font-bold truncate max-w-xs">{item.title}</div>
                        <div className="text-[9px] text-gray-600">
                          {item.category} • {item.status}
                          {item.discount > 0 && ` (Desconto: R$ ${item.discount})`}
                        </div>
                      </td>
                      <td className="py-1 px-1.5 text-[10px] whitespace-nowrap">
                        {item.paymentMethod}
                      </td>
                      <td className="py-1 px-1.5 text-right font-bold whitespace-nowrap text-emerald-900">
                        R$ {item.netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-1.5 text-center whitespace-nowrap">
                        {item.source === 'avulso' && onDeleteFinancialRecord && (
                          <button
                            onClick={() => {
                              showConfirm({
                                title: 'EXCLUIR LANÇAMENTO',
                                message: `Deseja excluir a receita de R$ ${item.netAmount.toFixed(2)} (${item.title})?`,
                                confirmText: '[ Sim, Excluir ]',
                                onConfirm: () => {
                                  const rawId = item.id.replace('rec-', '');
                                  onDeleteFinancialRecord(rawId);
                                },
                              });
                            }}
                            className="text-red-600 hover:text-black font-bold text-xs cursor-pointer"
                            title="Excluir lançamento avulso"
                          >
                            ✕
                          </button>
                        )}
                        {item.source === 'hospede' && (
                          <span className="text-gray-400 text-[10px]">Hósp.</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Extra Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 font-mono">
          <div className="bg-white border-2 border-black w-full max-w-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-[#FFFFCC] border-b border-black px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
              <span>+ NOVO LANÇAMENTO DE RECEITA / ENTRADA</span>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-5 h-5 border border-black hover:bg-black hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveManualEntry} className="p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-date">
                    DATA DO RECEBIMENTO:*
                  </label>
                  <input
                    id="entry-date"
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-amount">
                    VALOR RECEBIDO (R$):*
                  </label>
                  <input
                    id="entry-amount"
                    type="text"
                    required
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-cat">
                  CATEGORIA DA RECEITA:
                </label>
                <select
                  id="entry-cat"
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                >
                  <option value="Diárias de Hospedagem">Diárias de Hospedagem</option>
                  <option value="Consumo / Frigobar">Consumo / Frigobar</option>
                  <option value="Restaurante & Café">Restaurante & Café</option>
                  <option value="Passeios & Experiências">Passeios & Experiências</option>
                  <option value="Taxa de Serviços / Lavanderia">Taxa de Serviços / Lavanderia</option>
                  <option value="Eventos & Locações">Eventos & Locações</option>
                  <option value="Outras Receitas">Outras Receitas</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-desc">
                  DESCRIÇÃO DA ENTRADA:*
                </label>
                <input
                  id="entry-desc"
                  type="text"
                  required
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  placeholder="Ex: Pagamento 50% diária antecipada, consumo frigobar..."
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-pm">
                    FORMA DE PAGAMENTO:
                  </label>
                  <select
                    id="entry-pm"
                    value={entryPaymentMethod}
                    onChange={(e) => setEntryPaymentMethod(e.target.value)}
                    className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro em Espécie</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-room">
                    QUARTO (OPCIONAL):
                  </label>
                  <input
                    id="entry-room"
                    type="text"
                    value={entryRoomNumber}
                    onChange={(e) => setEntryRoomNumber(e.target.value)}
                    placeholder="Ex: 101"
                    className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-0.5 text-[10px]" htmlFor="entry-guest">
                  HÓSPEDE / PAGADOR (OPCIONAL):
                </label>
                <input
                  id="entry-guest"
                  type="text"
                  value={entryGuestName}
                  onChange={(e) => setEntryGuestName(e.target.value)}
                  placeholder="Nome do hóspede ou cliente pagador"
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-black">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 h-7 border border-black bg-white hover:bg-gray-100 cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 h-7 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  [ Salvar Lançamento ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TXT Report Modal */}
      {txtModalContent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 font-mono">
          <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-[#FFFFCC] border-b border-black px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none shrink-0">
              <span>📄 BALANCETE FINANCEIRO - BLOCO DE NOTAS .TXT</span>
              <button
                onClick={() => setTxtModalContent(null)}
                className="w-5 h-5 border border-black hover:bg-black hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-3 flex-1 min-h-0 flex flex-col overflow-hidden">
              <textarea
                readOnly
                value={txtModalContent}
                className="w-full flex-1 border border-black p-2 font-mono text-[11px] leading-relaxed bg-[#FFFFCC]/30 resize-none focus:outline-none overflow-y-auto"
              />

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-black shrink-0">
                <span className="text-[10px] text-gray-600">
                  {txtCopied ? '✓ Copiado para a Área de Transferência!' : 'Pronto para copiar ou salvar em arquivo TXT'}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyTxt}
                    className="px-3 h-7 border border-black bg-white hover:bg-[#FFFFCC] font-bold cursor-pointer text-xs"
                  >
                    [ COPIAR TEXTO ]
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="px-3 h-7 border border-black bg-[#FFFFCC] hover:bg-[#ffff99] font-bold cursor-pointer text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  >
                    💾 BAIXAR .TXT
                  </button>
                  <button
                    onClick={() => setTxtModalContent(null)}
                    className="px-3 h-7 border border-black bg-white hover:bg-gray-100 cursor-pointer text-xs"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
