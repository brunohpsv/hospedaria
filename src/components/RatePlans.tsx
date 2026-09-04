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

  const copySimQuote = () => {
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

    navigator.clipboard.writeText(text);
    alert('Orçamento copiado para a área de transferência!');
  };

  return (
    <div className="p-3 bg-white font-mono text-xs">
      {/* Top Header */}
      <div className="border-b border-black pb-2 mb-3 flex items-center justify-between">
        <h2 className="bg-[#FFFFCC] px-2 py-0.5 text-xs font-bold border border-black">
          TABELA DE VALORES & TARIFÁRIO
        </h2>
        {editedNotification && (
          <span className="bg-black text-[#FFFFCC] px-2 py-0.5 text-[10px] font-bold">
            {editedNotification}
          </span>
        )}
      </div>

      {/* Main Rate Table */}
      <div className="border border-black mb-4 overflow-x-auto bg-white p-2">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 font-bold">CATEGORIA</th>
              <th className="py-1 text-right font-bold">BAIXA TEMP. (R$)</th>
              <th className="py-1 text-right font-bold">MÉDIA TEMP. (R$)</th>
              <th className="py-1 text-right font-bold">ALTA TEMP. (R$)</th>
              <th className="py-1 text-right font-bold">FERIADOS (R$)</th>
              <th className="py-1 text-right font-bold">PAX EXTRA (R$)</th>
              <th className="py-1 text-center font-bold">MÍN. DIÁRIAS</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-b border-dotted border-black hover:bg-[#FFFFCC]">
                <td className="py-1.5 font-bold">{p.roomType.toUpperCase()}</td>

                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    value={p.lowSeasonRate}
                    onChange={(e) =>
                      handleFieldChange(p.id, 'lowSeasonRate', Number(e.target.value))
                    }
                    className="w-20 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                  />
                </td>

                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    value={p.midSeasonRate}
                    onChange={(e) =>
                      handleFieldChange(p.id, 'midSeasonRate', Number(e.target.value))
                    }
                    className="w-20 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                  />
                </td>

                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    value={p.highSeasonRate}
                    onChange={(e) =>
                      handleFieldChange(p.id, 'highSeasonRate', Number(e.target.value))
                    }
                    className="w-20 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                  />
                </td>

                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    value={p.holidayRate}
                    onChange={(e) =>
                      handleFieldChange(p.id, 'holidayRate', Number(e.target.value))
                    }
                    className="w-20 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] font-bold text-xs"
                  />
                </td>

                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    value={p.extraPersonRate}
                    onChange={(e) =>
                      handleFieldChange(p.id, 'extraPersonRate', Number(e.target.value))
                    }
                    className="w-16 border border-black px-1 h-5 text-right bg-white focus:bg-[#FFFFCC] text-xs"
                  />
                </td>

                <td className="py-1.5 text-center">
                  <input
                    type="number"
                    min="1"
                    value={p.minNights}
                    onChange={(e) =>
                      handleFieldChange(p.id, 'minNights', Number(e.target.value))
                    }
                    className="w-12 border border-black px-1 h-5 text-center bg-white focus:bg-[#FFFFCC] text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simulator Section */}
      <div className="border border-black p-3 bg-white">
        <div className="border-b border-black pb-1 mb-2 font-bold">
          <span className="bg-[#FFFFCC] px-1 border border-black">SIMULADOR DE ORÇAMENTO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end mb-3">
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

        <div className="border border-black p-3 bg-[#FFFFCC] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs">
              Estadia: <strong>{nights} noite(s)</strong> | Diária:{' '}
              <strong>R$ {baseNightRate.toFixed(2)}</strong> | Subtotal:{' '}
              <strong>R$ {baseSubtotal.toFixed(2)}</strong>
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

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] text-gray-600 block font-bold">TOTAL ORÇADO</span>
              <span className="text-sm font-bold bg-white border border-black px-2 py-0.5 block">
                R$ {simTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={copySimQuote}
              className="px-3 h-7 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer text-xs"
            >
              [ COPIAR TXT ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
