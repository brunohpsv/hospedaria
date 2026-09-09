import React, { useState } from 'react';
import { RatePlan, RoomType } from '../types';

interface RatePlansProps {
  ratePlans: RatePlan[];
  onUpdateRatePlan: (updated: RatePlan) => void;
  onSelectTypeForBooking?: (type: RoomType) => void;
}

export const RatePlans: React.FC<RatePlansProps> = ({
  ratePlans,
  onUpdateRatePlan,
}) => {
  const [plans, setPlans] = useState<RatePlan[]>(ratePlans);
  const [editedNotification, setEditedNotification] = useState<string | null>(null);

  // Simulator state
  const [simRoomType, setSimRoomType] = useState<RoomType>(() => ratePlans[0]?.roomType || 'Standard');
  const [simSeason, setSimSeason] = useState<'low' | 'mid' | 'high' | 'holiday'>('low');
  const [simCheckIn, setSimCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [simCheckOut, setSimCheckOut] = useState(() => {
    return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  });
  const [simExtraGuests, setSimExtraGuests] = useState<number>(0);
  const [simDiscount, setSimDiscount] = useState<number>(0);

  React.useEffect(() => {
    setPlans(ratePlans);
    if (!ratePlans.some((p) => p.roomType === simRoomType) && ratePlans.length > 0) {
      setSimRoomType(ratePlans[0].roomType);
    }
  }, [ratePlans, simRoomType]);

  const handleFieldChange = (
    id: string,
    field: keyof Omit<RatePlan, 'id' | 'roomType'>,
    value: number
  ) => {
    const nextPlans = plans.map((p) => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        onUpdateRatePlan(updated);
        return updated;
      }
      return p;
    });
    setPlans(nextPlans);
    setEditedNotification('Tarifa salva!');
    setTimeout(() => setEditedNotification(null), 2000);
  };

  const calcNights = () => {
    if (!simCheckIn || !simCheckOut) return 1;
    const start = new Date(simCheckIn);
    const end = new Date(simCheckOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const fallbackPlan: RatePlan = {
    id: 'fallback',
    roomType: simRoomType || 'Geral',
    lowSeasonRate: 200,
    midSeasonRate: 250,
    highSeasonRate: 320,
    holidayRate: 420,
    extraPersonRate: 70,
    minNights: 1,
  };
  const selectedPlan = plans.find((p) => p.roomType === simRoomType) || plans[0] || fallbackPlan;
  const nights = calcNights();

  let baseNightRate = selectedPlan.lowSeasonRate;
  if (simSeason === 'mid') baseNightRate = selectedPlan.midSeasonRate;
  if (simSeason === 'high') baseNightRate = selectedPlan.highSeasonRate;
  if (simSeason === 'holiday') baseNightRate = selectedPlan.holidayRate;

  const extraPaxTotal = simExtraGuests * selectedPlan.extraPersonRate * nights;
  const baseSubtotal = baseNightRate * nights;
  const simTotal = Math.max(0, baseSubtotal + extraPaxTotal - Number(simDiscount || 0));

  const copySimQuote = async () => {
    const seasonLabel =
      simSeason === 'low'
        ? 'Baixa Temporada'
        : simSeason === 'mid'
        ? 'Média Temporada'
        : simSeason === 'high'
        ? 'Alta Temporada'
        : 'Feriados / Réveillon';

    const text = `============================================================
ORÇAMENTO DE HOSPEDAGEM
============================================================
Acomodação:       ${simRoomType.toUpperCase()}
Temporada:        ${seasonLabel}
Check-in:         ${simCheckIn}
Check-out:        ${simCheckOut}
Total de Diárias: ${nights} noites
Valor da Diária:  R$ ${baseNightRate.toFixed(2)}
Subtotal Diárias: R$ ${baseSubtotal.toFixed(2)}
Hóspedes Extras:  ${simExtraGuests} (+ R$ ${extraPaxTotal.toFixed(2)})
Desconto:         R$ ${Number(simDiscount || 0).toFixed(2)}
------------------------------------------------------------
VALOR TOTAL:      R$ ${simTotal.toFixed(2)}
============================================================`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    }
    setEditedNotification('Orçamento copiado para a área de transferência!');
    setTimeout(() => setEditedNotification(null), 3000);
  };

  return (
    <div className="h-full flex flex-col p-2 bg-white font-mono text-xs overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-black pb-1.5 mb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <h2 className="bg-[#FFFFCC] px-2 py-0.5 text-xs font-bold border border-black">
            TABELA DE VALORES & TARIFÁRIO
          </h2>
          <span className="text-[10px] text-gray-700">
            Categorias: <strong>{plans.length}</strong>
          </span>
        </div>
        {editedNotification && (
          <span className="bg-black text-[#FFFFCC] px-2 py-0.5 text-[10px] font-bold">
            {editedNotification}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Rate Plans Table */}
        <div className="lg:col-span-7 border border-black p-2 bg-white flex flex-col h-full overflow-hidden">
          <div className="border-b border-black pb-1 mb-2 font-bold flex items-center justify-between text-[11px] shrink-0">
            <span className="bg-[#FFFFCC] px-1 border border-black">
              TARIFAS VIGENTES (EDIÇÃO DIRETA)
            </span>
            <span className="text-[10px] text-gray-600">Autossalvo</span>
          </div>

          <div className="border border-black overflow-x-auto overflow-y-auto flex-1 min-h-0 bg-white">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-[#FFFFCC] z-10 border-b border-black">
                <tr>
                  <th className="py-1 px-1.5 font-bold">CATEGORIA</th>
                  <th className="py-1 px-1 text-right font-bold">BAIXA (R$)</th>
                  <th className="py-1 px-1 text-right font-bold">MÉDIA (R$)</th>
                  <th className="py-1 px-1 text-right font-bold">ALTA (R$)</th>
                  <th className="py-1 px-1 text-right font-bold">FERIADO (R$)</th>
                  <th className="py-1 px-1 text-right font-bold">EXTRA (R$)</th>
                  <th className="py-1 px-1 text-center font-bold">MÍN. NOITES</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-dotted border-black hover:bg-[#FFFFCC]">
                    <td className="py-1.5 px-1.5 font-bold">{p.roomType.toUpperCase()}</td>

                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        value={p.lowSeasonRate}
                        onChange={(e) =>
                          handleFieldChange(p.id, 'lowSeasonRate', Number(e.target.value))
                        }
                        className="w-16 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                      />
                    </td>

                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        value={p.midSeasonRate}
                        onChange={(e) =>
                          handleFieldChange(p.id, 'midSeasonRate', Number(e.target.value))
                        }
                        className="w-16 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                      />
                    </td>

                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        value={p.highSeasonRate}
                        onChange={(e) =>
                          handleFieldChange(p.id, 'highSeasonRate', Number(e.target.value))
                        }
                        className="w-16 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                      />
                    </td>

                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        value={p.holidayRate}
                        onChange={(e) =>
                          handleFieldChange(p.id, 'holidayRate', Number(e.target.value))
                        }
                        className="w-16 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                      />
                    </td>

                    <td className="py-1.5 px-1 text-right">
                      <input
                        type="number"
                        value={p.extraPersonRate}
                        onChange={(e) =>
                          handleFieldChange(p.id, 'extraPersonRate', Number(e.target.value))
                        }
                        className="w-14 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] text-xs"
                      />
                    </td>

                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="number"
                        min="1"
                        value={p.minNights}
                        onChange={(e) =>
                          handleFieldChange(p.id, 'minNights', Number(e.target.value))
                        }
                        className="w-10 border border-black px-1 h-5 text-center bg-white focus:bg-[#FFFFCC] text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-1 pt-1 border-t border-black text-[10px] text-gray-600 flex justify-between shrink-0">
            <span>* Alterações refletem imediatamente no simulador e no sistema.</span>
          </div>
        </div>

        {/* Right Column: Simulator Section */}
        <div className="lg:col-span-5 border border-black p-2 bg-white flex flex-col h-full overflow-y-auto">
          <div className="border-b border-black pb-1 mb-2 font-bold flex items-center justify-between text-[11px] shrink-0">
            <span className="bg-[#FFFFCC] px-1 border border-black">
              SIMULADOR DE ORÇAMENTO & PROPOSTAS
            </span>
            <span className="text-[10px] text-gray-700">PRATICIDADE</span>
          </div>

          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5 text-[10px]">CATEGORIA:</label>
                  <select
                    value={simRoomType}
                    onChange={(e) => setSimRoomType(e.target.value as RoomType)}
                    className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs font-bold"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.roomType}>
                        {p.roomType}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-[10px]">TEMPORADA:</label>
                  <select
                    value={simSeason}
                    onChange={(e) => setSimSeason(e.target.value as any)}
                    className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs"
                  >
                    <option value="low">Baixa Temporada</option>
                    <option value="mid">Média Temporada</option>
                    <option value="high">Alta Temporada</option>
                    <option value="holiday">Feriados</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5 text-[10px]">CHECK-IN:</label>
                  <input
                    type="date"
                    value={simCheckIn}
                    onChange={(e) => setSimCheckIn(e.target.value)}
                    className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-[10px]">CHECK-OUT:</label>
                  <input
                    type="date"
                    value={simCheckOut}
                    onChange={(e) => setSimCheckOut(e.target.value)}
                    className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-0.5 text-[10px]">PAX EXTRA:</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={simExtraGuests}
                    onChange={(e) => setSimExtraGuests(Number(e.target.value))}
                    className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-[10px]">DESCONTO (R$):</label>
                  <input
                    type="number"
                    min="0"
                    value={simDiscount}
                    onChange={(e) => setSimDiscount(Number(e.target.value))}
                    className="w-full border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Calculation Output Card */}
            <div className="border border-black p-2 bg-[#FFFFCC] space-y-2 mt-2 shrink-0">
              <div className="text-xs space-y-0.5">
                <div>
                  Estadia: <strong>{nights} noite(s)</strong> | Diária:{' '}
                  <strong>R$ {baseNightRate.toFixed(2)}</strong>
                </div>
                <div>
                  Subtotal Diárias: <strong>R$ {baseSubtotal.toFixed(2)}</strong>
                </div>
                {simExtraGuests > 0 && (
                  <div className="text-[10px] text-gray-700">
                    + {simExtraGuests} hóspede(s) adicional(is) = R$ {extraPaxTotal.toFixed(2)}
                  </div>
                )}
                {simDiscount > 0 && (
                  <div className="text-[10px] text-gray-700">
                    - Desconto = R$ {Number(simDiscount).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-black">
                <div>
                  <span className="text-[9px] text-gray-600 block font-bold">TOTAL ESTIMADO</span>
                  <span className="text-sm font-bold bg-white border border-black px-2 py-0.5 block">
                    R$ {simTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={copySimQuote}
                  className="px-3 h-7 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs"
                  title="Copiar texto formatado para enviar no WhatsApp ou Bloco de Notas"
                >
                  [ COPIAR TXT ]
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
