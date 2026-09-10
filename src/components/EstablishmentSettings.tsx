import React, { useState } from 'react';
import { ClientAccount, SubscriptionPlanType, Room, Employee, GuestReservation } from '../types';
import { SUBSCRIPTION_PLANS, validateAccessKey } from '../lib/authConstants';
import { useDialog } from '../lib/dialogContext';

interface EstablishmentSettingsProps {
  currentClient: ClientAccount;
  onUpdateClient: (updatedClient: ClientAccount) => void;
  rooms: Room[];
  employees: Employee[];
  guests: GuestReservation[];
  onLogout?: () => void;
}

export const EstablishmentSettings: React.FC<EstablishmentSettingsProps> = ({
  currentClient,
  onUpdateClient,
  rooms,
  employees,
  guests,
  onLogout,
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Form states initialized with current client account
  const [establishmentName, setEstablishmentName] = useState(
    currentClient.establishmentName || ''
  );
  const [cpfCnpj, setCpfCnpj] = useState(currentClient.cpfCnpj || '');
  const [email, setEmail] = useState(currentClient.email || '');
  const [phone, setPhone] = useState(currentClient.phone || '');
  const [responsibleName, setResponsibleName] = useState(currentClient.responsibleName || '');
  const [responsibleCpf, setResponsibleCpf] = useState(currentClient.responsibleCpf || '');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>(currentClient.plan);
  const [accessKey, setAccessKey] = useState(currentClient.accessKey || '');
  const [showKey, setShowKey] = useState(false);

  // TXT Comprovante modal
  const [txtModalContent, setTxtModalContent] = useState<string | null>(null);
  const [txtCopied, setTxtCopied] = useState(false);

  // Key validation
  const keyValidation = validateAccessKey(accessKey);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!establishmentName.trim()) {
      showAlert('Informe o Nome do Estabelecimento (Hotel, Pousada, etc.).', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!cpfCnpj.trim()) {
      showAlert('Informe o CPF ou CNPJ do estabelecimento.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showAlert('Informe um e-mail de contato válido.', 'E-MAIL INVÁLIDO');
      return;
    }
    if (!phone.trim()) {
      showAlert('Informe o telefone ou WhatsApp de atendimento.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!responsibleName.trim()) {
      showAlert('Informe o nome do responsável pelo cadastro.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!responsibleCpf.trim()) {
      showAlert('Informe o CPF do responsável.', 'CAMPO OBRIGATÓRIO');
      return;
    }

    if (!keyValidation.isValid) {
      showAlert(
        `A Chave de Acesso informada não cumpre os requisitos de segurança:\n\n${keyValidation.errors.join('\n')}`,
        'CHAVE DE ACESSO INVÁLIDA'
      );
      return;
    }

    showConfirm({
      title: 'SALVAR ALTERAÇÕES CADASTRAIS',
      message: 'Confirma a atualização dos dados cadastrais do estabelecimento e chave de acesso?',
      confirmText: '[ Sim, Salvar Alterações ]',
      onConfirm: () => {
        const updated: ClientAccount = {
          ...currentClient,
          establishmentName: establishmentName.trim(),
          cpfCnpj: cpfCnpj.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          responsibleName: responsibleName.trim(),
          responsibleCpf: responsibleCpf.trim(),
          plan: selectedPlan,
          accessKey: accessKey.trim(),
        };

        onUpdateClient(updated);
        showAlert(
          'Dados cadastrais do estabelecimento atualizados e sincronizados com sucesso!',
          'CADASTRO ATUALIZADO'
        );
      },
    });
  };

  // Generate TXT registration certificate
  const handleGenerateCertificateTxt = () => {
    const planInfo = SUBSCRIPTION_PLANS[selectedPlan];
    const text = `======================================================================
COMPROVANTE DE CADASTRO DO ESTABELECIMENTO - HOTEL NOTEPAD
EMISSÃO: ${new Date().toLocaleString('pt-BR')}
======================================================================

[ DADOS DO ESTABELECIMENTO ]
NOME FANTASIA      : ${establishmentName.toUpperCase()}
CPF / CNPJ         : ${cpfCnpj}
E-MAIL COMERCIAL   : ${email}
TELEFONE / WHATSAPP: ${phone}
DATA DE CADASTRO   : ${currentClient.createdAt}

[ RESPONSÁVEL LEGAL ]
NOME COMPLETO      : ${responsibleName.toUpperCase()}
CPF DO RESPONSÁVEL : ${responsibleCpf}

[ PLANO DE ASSINATURA & CAPACIDADE ]
PLANO CONTRATADO   : ${planInfo?.name.toUpperCase()}
LIMITE DE ACOMODAÇÕES: ${planInfo?.roomLimitText}
VALOR MENSAL       : ${planInfo?.priceText}
QUARTOS EM USO     : ${rooms.length} de ${planInfo?.roomLimit === 9999 ? 'Ilimitado' : planInfo?.roomLimit}

[ RECURSOS HUMANOS ]
TOTAL DE FUNCIONÁRIOS CADASTRADOS: ${employees.length}
FUNCIONÁRIOS ATIVOS               : ${employees.filter((e) => e.status === 'ativo').length}
FOLHA SALARIAL ATUAL (R$)         : R$ ${employees
      .reduce((acc, curr) => acc + curr.salary, 0)
      .toFixed(2)}

----------------------------------------------------------------------
CHAVE DE ACESSO ATIVA: ${accessKey}
(Mantenha sua chave de acesso em local seguro para efetuar o login)
======================================================================`;

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
    link.download = `cadastro_${establishmentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const planInfo = SUBSCRIPTION_PLANS[selectedPlan];

  return (
    <div className="h-full flex flex-col font-mono text-xs select-none bg-white overflow-y-auto">
      {/* Top Banner */}
      <div className="border-b border-black p-2 bg-[#FFFFCC] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-3 flex-wrap">
          <span className="font-bold text-sm bg-black text-white px-2 py-0.5">
            DADOS CADASTRAIS DO ESTABELECIMENTO
          </span>
          <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-bold">
            ESTABELECIMENTO: <strong>{establishmentName || 'NÃO DEFINIDO'}</strong>
          </span>
          <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-bold">
            PLANO: <strong>{planInfo?.name.toUpperCase()}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleGenerateCertificateTxt}
            className="px-2.5 py-1 border border-black bg-white hover:bg-[#ffff99] font-bold cursor-pointer text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            title="Exportar comprovante cadastral em arquivo TXT"
          >
            📄 COMPROVANTE CADASTRO .TXT
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1 border border-black bg-red-600 text-white hover:bg-black font-bold cursor-pointer text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              [ SAIR DO SISTEMA ]
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="p-4 max-w-4xl mx-auto w-full space-y-4">
        {/* Quick KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-black p-3 bg-gray-50 space-y-1">
            <span className="text-[10px] font-bold text-gray-600 block">
              QUARTOS CADASTRADOS
            </span>
            <div className="text-lg font-bold">
              {rooms.length} / {planInfo?.roomLimitText}
            </div>
            <div className="text-[10px] text-gray-500">
              {rooms.length <= (planInfo?.roomLimit || 0)
                ? '✓ Limite dentro da franquia'
                : '⚠ Limite excedido para o plano'}
            </div>
          </div>

          <div className="border border-black p-3 bg-gray-50 space-y-1">
            <span className="text-[10px] font-bold text-gray-600 block">
              EQUIPE DE FUNCIONÁRIOS
            </span>
            <div className="text-lg font-bold">
              {employees.length} colaborador(es)
            </div>
            <div className="text-[10px] text-gray-500">
              {employees.filter((e) => e.status === 'ativo').length} ativo(s) na escala
            </div>
          </div>

          <div className="border border-black p-3 bg-gray-50 space-y-1">
            <span className="text-[10px] font-bold text-gray-600 block">
              HÓSPEDES NO SISTEMA
            </span>
            <div className="text-lg font-bold">
              {guests.length} reserva(s)
            </div>
            <div className="text-[10px] text-gray-500">
              {guests.filter((g) => g.status === 'Hospedado').length} hospedados atualmente
            </div>
          </div>
        </div>

        {/* The Editable Form */}
        <form onSubmit={handleSave} className="border-2 border-black bg-white p-4 space-y-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b border-black pb-2 flex items-center justify-between">
            <span className="font-bold text-sm bg-[#FFFFCC] border border-black px-2 py-0.5">
              ALTERAÇÃO DE DADOS CADASTRAIS
            </span>
            <span className="text-[10px] text-gray-600">
              Cadastrado desde: {currentClient.createdAt}
            </span>
          </div>

          {/* Section 1: Establishment Info */}
          <div className="space-y-3">
            <span className="font-bold block text-xs bg-gray-100 border border-black px-2 py-1">
              1. INFORMAÇÕES DO ESTABELECIMENTO
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[11px]" htmlFor="edit-est-name">
                  NOME DO ESTABELECIMENTO (POUSADA / HOTEL / RESORT):*
                </label>
                <input
                  id="edit-est-name"
                  type="text"
                  required
                  value={establishmentName}
                  onChange={(e) => setEstablishmentName(e.target.value)}
                  placeholder="Ex: Pousada Recanto dos Pássaros"
                  className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[11px]" htmlFor="edit-est-cnpj">
                  CPF / CNPJ DO ESTABELECIMENTO:*
                </label>
                <input
                  id="edit-est-cnpj"
                  type="text"
                  required
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[11px]" htmlFor="edit-est-email">
                  E-MAIL DE CONTATO ADMINISTRATIVO:*
                </label>
                <input
                  id="edit-est-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@pousada.com.br"
                  className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[11px]" htmlFor="edit-est-phone">
                  TELEFONE / WHATSAPP DE ATENDIMENTO:*
                </label>
                <input
                  id="edit-est-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Legal Representative Info */}
          <div className="space-y-3 pt-2 border-t border-black">
            <span className="font-bold block text-xs bg-gray-100 border border-black px-2 py-1">
              2. DADOS DO RESPONSÁVEL LEGAL
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[11px]" htmlFor="edit-resp-name">
                  NOME COMPLETO DO RESPONSÁVEL:*
                </label>
                <input
                  id="edit-resp-name"
                  type="text"
                  required
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[11px]" htmlFor="edit-resp-cpf">
                  CPF DO RESPONSÁVEL:*
                </label>
                <input
                  id="edit-resp-cpf"
                  type="text"
                  required
                  value={responsibleCpf}
                  onChange={(e) => setResponsibleCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Subscription Plan */}
          <div className="space-y-3 pt-2 border-t border-black">
            <span className="font-bold block text-xs bg-gray-100 border border-black px-2 py-1">
              3. PLANO DE ASSINATURA DO SISTEMA
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanType[]).map((planKey) => {
                const plan = SUBSCRIPTION_PLANS[planKey];
                const isSelected = selectedPlan === planKey;

                return (
                  <div
                    key={planKey}
                    onClick={() => setSelectedPlan(planKey)}
                    className={`border-2 p-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-black bg-[#FFFFCC] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-gray-400 bg-white hover:border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{plan.name.toUpperCase()}</span>
                      <input
                        type="radio"
                        name="plan-select"
                        checked={isSelected}
                        onChange={() => setSelectedPlan(planKey)}
                        className="cursor-pointer"
                      />
                    </div>
                    <div className="font-bold text-sm text-emerald-950 mb-1">
                      {plan.priceText}
                    </div>
                    <div className="text-[10px] text-gray-700">
                      Capacidade: <strong>{plan.roomLimitText}</strong>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-1">{plan.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Access Key (Senha) */}
          <div className="space-y-3 pt-2 border-t border-black">
            <span className="font-bold block text-xs bg-gray-100 border border-black px-2 py-1">
              4. CHAVE DE ACESSO DO ESTABELECIMENTO (LOGIN)
            </span>

            <div className="max-w-md space-y-2">
              <label className="block font-bold text-[11px]" htmlFor="edit-access-key">
                CHAVE DE ACESSO (EXATAMENTE 8 CARACTERES):*
              </label>

              <div className="flex items-center space-x-1">
                <input
                  id="edit-access-key"
                  type={showKey ? 'text' : 'password'}
                  required
                  maxLength={8}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="flex-1 border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  className="px-2.5 h-8 border border-black bg-white hover:bg-[#FFFFCC] font-bold text-[10px] cursor-pointer"
                >
                  {showKey ? 'OCULTAR' : 'VER'}
                </button>
              </div>

              {/* Password Requirements Checklist */}
              <div className="border border-black p-2 bg-gray-50 text-[10px] space-y-0.5">
                <span className="font-bold block text-gray-700">REQUISITOS DA CHAVE:</span>
                <div className={keyValidation.rules.length ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                  {keyValidation.rules.length ? '✓' : '•'} Exatamente 8 caracteres ({accessKey.length}/8)
                </div>
                <div className={keyValidation.rules.uppercase ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                  {keyValidation.rules.uppercase ? '✓' : '•'} Pelo menos 1 letra maiúscula (A-Z)
                </div>
                <div className={keyValidation.rules.numbers ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                  {keyValidation.rules.numbers ? '✓' : '•'} Pelo menos 3 números (0-9)
                </div>
                <div className={keyValidation.rules.symbol ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                  {keyValidation.rules.symbol ? '✓' : '•'} Pelo menos 1 caractere especial (!@#$%&*)
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t-2 border-black flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-gray-600">
              * As alterações entram em vigor imediatamente e são salvas no banco de dados.
            </span>

            <button
              id="btn-save-establishment"
              type="submit"
              className="px-6 py-2.5 bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              💾 SALVAR ALTERAÇÕES CADASTRAIS
            </button>
          </div>
        </form>
      </div>

      {/* ================= MODAL: COMPROVANTE CADASTRO TXT ================= */}
      {txtModalContent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black w-full max-w-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]">
            <div className="bg-[#FFFFCC] border-b-2 border-black p-2.5 flex items-center justify-between shrink-0">
              <span className="font-bold text-xs">
                📄 COMPROVANTE CADASTRAL - {establishmentName.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => setTxtModalContent(null)}
                className="w-6 h-6 border border-black bg-white hover:bg-red-500 hover:text-white font-bold cursor-pointer flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
              <textarea
                readOnly
                value={txtModalContent}
                className="w-full flex-1 border border-black p-3 bg-white font-mono text-xs leading-relaxed select-all resize-none focus:outline-none"
              />
            </div>

            <div className="border-t border-black p-2.5 bg-gray-100 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <span className="text-[10px] text-gray-600">
                Formato Windows Notepad .TXT padrão
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyTxt}
                  className="px-3 py-1 border border-black bg-white hover:bg-[#FFFFCC] font-bold text-xs cursor-pointer"
                >
                  {txtCopied ? '✓ COPIADO!' : 'COPIAR TEXTO'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-3 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer"
                >
                  BAIXAR .TXT
                </button>

                <button
                  type="button"
                  onClick={() => setTxtModalContent(null)}
                  className="px-3 py-1 border border-black bg-white hover:bg-gray-200 font-bold text-xs cursor-pointer"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
