import React, { useState, useEffect } from 'react';
import { ClientAccount, SubscriptionPlanType } from '../types';
import { SUBSCRIPTION_PLANS, validateAccessKey, DEMO_CLIENT } from '../lib/authConstants';
import { saveClientToFirestore, getAllClientsFromFirestore } from '../lib/hotelFirebaseService';
import { useDialog } from '../lib/dialogContext';

interface AuthPortalProps {
  onLoginSuccess: (client: ClientAccount) => void;
  registeredClients: ClientAccount[];
  onSaveClient: (client: ClientAccount) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  onLoginSuccess,
  registeredClients,
  onSaveClient,
}) => {
  const { showAlert } = useDialog();
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginAccessKey, setLoginAccessKey] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [establishmentName, setEstablishmentName] = useState<string>('');
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [responsibleCpf, setResponsibleCpf] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('profissional');
  const [accessKey, setAccessKey] = useState<string>('');
  const [confirmAccessKey, setConfirmAccessKey] = useState<string>('');
  const [showRegisterPassword, setShowRegisterPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Key validation status
  const keyValidation = validateAccessKey(accessKey);

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const inputKey = loginAccessKey.trim();
    if (!inputKey) {
      setLoginError('Por favor, digite a Chave de Acesso.');
      return;
    }

    // Check in registered clients (local and cloud)
    const found = registeredClients.find(
      (c) => c.accessKey === inputKey || c.accessKey.trim().toLowerCase() === inputKey.toLowerCase()
    );

    if (found) {
      onLoginSuccess(found);
      return;
    }

    // Check demo client default key
    if (inputKey === DEMO_CLIENT.accessKey) {
      onLoginSuccess(DEMO_CLIENT);
      return;
    }

    setLoginError('Chave de Acesso não encontrada ou incorreta. Verifique os 8 caracteres ou cadastre-se.');
  };

  // Quick login with Demo account
  const handleQuickDemoLogin = () => {
    onLoginSuccess(DEMO_CLIENT);
  };

  // Handle Register submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!establishmentName.trim()) {
      showAlert('Informe o nome do estabelecimento (pousada, hotel, resort, etc.).', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!cpfCnpj.trim()) {
      showAlert('Informe o CPF ou CNPJ da empresa/estabelecimento.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showAlert('Informe um e-mail de contato válido.', 'E-MAIL INVÁLIDO');
      return;
    }
    if (!phone.trim()) {
      showAlert('Informe o telefone ou WhatsApp para contato.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!responsibleName.trim()) {
      showAlert('Informe o nome completo do responsável pelo cadastro.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!responsibleCpf.trim()) {
      showAlert('Informe o CPF do responsável pelo cadastro.', 'CAMPO OBRIGATÓRIO');
      return;
    }

    // Check password rules
    if (!keyValidation.isValid) {
      showAlert(
        `A Chave de Acesso não atende aos requisitos:\n${keyValidation.errors.join('\n')}`,
        'SENHA INVÁLIDA'
      );
      return;
    }

    if (accessKey !== confirmAccessKey) {
      showAlert('A confirmação da Chave de Acesso não coincide com a senha digitada.', 'SENHAS NÃO COINCIDEM');
      return;
    }

    // Check if key already registered
    const keyExists = registeredClients.some((c) => c.accessKey === accessKey.trim());
    if (keyExists) {
      showAlert(
        'Esta Chave de Acesso já foi utilizada por outro cadastro. Por favor, crie uma chave diferente.',
        'CHAVE EM USO'
      );
      return;
    }

    setIsSubmitting(true);

    const newClient: ClientAccount = {
      id: `client-${Date.now()}`,
      establishmentName: establishmentName.trim(),
      cpfCnpj: cpfCnpj.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      responsibleName: responsibleName.trim(),
      responsibleCpf: responsibleCpf.trim(),
      plan: selectedPlan,
      accessKey: accessKey.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      await saveClientToFirestore(newClient);
    } catch (err) {
      console.warn('Registro salvo localmente (modo offline):', err);
    }

    onSaveClient(newClient);
    setIsSubmitting(false);

    // Entra diretamente no sistema conforme solicitado ("cadastrando entra no sistema")
    onLoginSuccess(newClient);
  };

  return (
    <div className="h-screen w-screen bg-[#E5E5E5] flex flex-col justify-between p-2 md:p-4 font-mono text-xs select-none overflow-hidden">
      {/* Top Header Notepad Window Bar */}
      <div className="max-w-4xl w-full mx-auto bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Title Bar */}
        <div className="bg-[#FFFFCC] border-b border-black px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs tracking-wider">
              [BLOCO DE NOTAS - PORTAL DE ACESSO DO CLIENTE]
            </span>
          </div>
          <span className="text-[10px] text-gray-700 font-bold">VERSÃO 1.0</span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-white border-b border-black px-3 py-1 flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveMode('login');
              setLoginError(null);
            }}
            className={`px-3 py-1 border border-black font-bold text-xs cursor-pointer transition-colors ${
              activeMode === 'login'
                ? 'bg-[#FFFFCC] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            [1. ENTRAR COM CHAVE DE ACESSO]
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('register');
              setLoginError(null);
            }}
            className={`px-3 py-1 border border-black font-bold text-xs cursor-pointer transition-colors ${
              activeMode === 'register'
                ? 'bg-[#FFFFCC] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            [2. NOVO CADASTRO & ASSINATURA]
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 bg-white">
          {/* ===================== LOGIN VIEW ===================== */}
          {activeMode === 'login' && (
            <div className="max-w-md mx-auto py-6 space-y-4">
              <div className="border border-black p-3 bg-[#FFFFCC]">
                <div className="font-bold text-xs mb-1">AUTENTICAÇÃO DO CLIENTE</div>
                <p className="text-[11px] text-gray-800 leading-relaxed">
                  Digite abaixo a sua <strong>Chave de Acesso</strong> cadastrada (8 caracteres) para entrar no sistema de gestão hoteleira.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="border border-black p-4 bg-white space-y-3">
                <div>
                  <label className="block font-bold mb-1 text-[11px]" htmlFor="login-key">
                    CHAVE DE ACESSO (8 DÍGITOS):*
                  </label>
                  <div className="relative">
                    <input
                      id="login-key"
                      type={showLoginPassword ? 'text' : 'password'}
                      maxLength={8}
                      value={loginAccessKey}
                      onChange={(e) => setLoginAccessKey(e.target.value)}
                      placeholder="Ex: Hosp123!"
                      autoFocus
                      className="w-full border border-black px-2.5 h-8 bg-white focus:bg-[#FFFFCC] text-sm tracking-widest font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 hover:text-black font-bold px-1"
                    >
                      [{showLoginPassword ? 'OCULTAR' : 'VER'}]
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-1 block">
                    * Senha configurada no momento do cadastro do seu estabelecimento.
                  </span>
                </div>

                {loginError && (
                  <div className="border border-red-600 bg-red-50 text-red-700 p-2 text-[11px] font-bold">
                    {loginError}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-1.5 border border-black bg-[#FFFFCC] hover:bg-black hover:text-white font-bold cursor-pointer text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  >
                    [ ENTRAR NO SISTEMA &gt; ]
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMode('register')}
                    className="text-[11px] text-blue-700 hover:underline cursor-pointer"
                  >
                    Não tem cadastro? Assine aqui.
                  </button>
                </div>
              </form>

              {/* Demo Account & Registered Establishments Quick Access Card */}
              <div className="border border-dotted border-black p-3 bg-gray-50 text-[11px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Chave de Demonstração / Teste:</span>
                    <span className="bg-white border border-black px-1.5 py-0.5 font-bold tracking-wider inline-block mt-0.5">
                      Hosp123!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="px-2 py-1 border border-black bg-white hover:bg-[#FFFFCC] font-bold cursor-pointer text-[10px]"
                  >
                    [ Usar Chave Demo ]
                  </button>
                </div>

                {registeredClients.filter((c) => c.accessKey !== DEMO_CLIENT.accessKey).length > 0 && (
                  <div className="pt-2 border-t border-gray-300">
                    <span className="font-bold block text-[10px] text-gray-700 mb-1">
                      CLIENTES / ESTABELECIMENTOS CADASTRADOS:
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {registeredClients
                        .filter((c) => c.accessKey !== DEMO_CLIENT.accessKey)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between bg-white border border-black px-2 py-1 text-[10px]"
                          >
                            <div className="truncate mr-2">
                              <strong>{c.establishmentName || c.responsibleName}</strong>
                              {c.establishmentName && (
                                <span className="text-gray-600 ml-1">({c.responsibleName})</span>
                              )}{' '}
                              <span className="font-bold text-gray-800">
                                [{SUBSCRIPTION_PLANS[c.plan]?.name.toUpperCase()}]
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setLoginAccessKey(c.accessKey);
                                onLoginSuccess(c);
                              }}
                              className="px-1.5 py-0.5 bg-[#FFFFCC] hover:bg-black hover:text-white border border-black font-bold cursor-pointer text-[9px] shrink-0"
                            >
                              [ Entrar ]
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== REGISTRATION VIEW ===================== */}
          {activeMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* Form Intro */}
              <div className="border border-black p-2.5 bg-[#FFFFCC] flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs">CADASTRO DE CLIENTE & PLANO DE GESTÃO</span>
                  <p className="text-[10px] text-gray-700">
                    Preencha os dados abaixo, escolha sua assinatura e defina sua chave de acesso de 8 dígitos.
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-white border border-black px-2 py-0.5">
                  100% SEGURO
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Left: General & Responsible Details */}
                <div className="lg:col-span-6 border border-black p-3 bg-white space-y-2.5">
                  <div className="border-b border-black pb-1 font-bold text-xs bg-[#FFFFCC] px-1 border border-black inline-block">
                    1. DADOS DO ESTABELECIMENTO & CONTATO
                  </div>

                  <div>
                    <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-establishment-name">
                      NOME DO ESTABELECIMENTO (HOTEL / POUSADA / CHALÉ):*
                    </label>
                    <input
                      id="reg-establishment-name"
                      type="text"
                      required
                      value={establishmentName}
                      onChange={(e) => setEstablishmentName(e.target.value)}
                      placeholder="Ex: Pousada Recanto dos Pássaros"
                      className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-cnpj">
                      CPF / CNPJ DO ESTABELECIMENTO:*
                    </label>
                    <input
                      id="reg-cnpj"
                      type="text"
                      required
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      placeholder="Ex: 00.000.000/0001-00 ou CPF"
                      className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-email">
                        E-MAIL DE CONTATO:*
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@pousada.com"
                        className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-phone">
                        TELEFONE / WHATSAPP:*
                      </label>
                      <input
                        id="reg-phone"
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div className="border-t border-black pt-2 space-y-2">
                    <div className="font-bold text-[11px] text-gray-800">
                      RESPONSÁVEL PELO CADASTRO:
                    </div>

                    <div>
                      <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-resp-name">
                        NOME COMPLETO DO RESPONSÁVEL:*
                      </label>
                      <input
                        id="reg-resp-name"
                        type="text"
                        required
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                        placeholder="Nome do proprietário ou gerente"
                        className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-resp-cpf">
                        CPF DO RESPONSÁVEL:*
                      </label>
                      <input
                        id="reg-resp-cpf"
                        type="text"
                        required
                        value={responsibleCpf}
                        onChange={(e) => setResponsibleCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Plan Choice & Access Key */}
                <div className="lg:col-span-6 border border-black p-3 bg-white flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="border-b border-black pb-1 font-bold text-xs bg-[#FFFFCC] px-1 border border-black inline-block mb-2">
                      2. ESCOLHA SUA ASSINATURA (4 TIPOS)
                    </div>

                    {/* 4 Plan Radio Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanType[]).map((planKey) => {
                        const plan = SUBSCRIPTION_PLANS[planKey];
                        const isSelected = selectedPlan === planKey;

                        return (
                          <div
                            key={planKey}
                            onClick={() => setSelectedPlan(planKey)}
                            className={`border border-black p-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#FFFFCC] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase">[{plan.name}]</span>
                              <span className="text-[10px] bg-white border border-black px-1">
                                {plan.priceText}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-700 mt-1">
                              Capacidade: <strong>{plan.roomLimitText}</strong>
                            </div>
                            <div className="text-[9px] text-gray-500 mt-0.5">
                              {plan.description}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Access Key Definition */}
                  <div className="border-t border-black pt-2 space-y-2">
                    <div className="border-b border-black pb-1 font-bold text-xs bg-[#FFFFCC] px-1 border border-black inline-block">
                      3. CHAVE DE ACESSO (SENHA DE 8 DÍGITOS)
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-key">
                          SENHA / CHAVE DE ACESSO:*
                        </label>
                        <div className="relative">
                          <input
                            id="reg-key"
                            type={showRegisterPassword ? 'text' : 'password'}
                            maxLength={8}
                            required
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value)}
                            placeholder="Ex: Pous123!"
                            className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold tracking-wider"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold mb-0.5 text-[10px]" htmlFor="reg-key-confirm">
                          CONFIRMAR CHAVE:*
                        </label>
                        <input
                          id="reg-key-confirm"
                          type={showRegisterPassword ? 'text' : 'password'}
                          maxLength={8}
                          required
                          value={confirmAccessKey}
                          onChange={(e) => setConfirmAccessKey(e.target.value)}
                          placeholder="Repita a chave"
                          className="w-full border border-black px-2 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold tracking-wider"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="text-gray-700 hover:text-black font-bold"
                      >
                        [{showRegisterPassword ? 'Ocultar caracteres' : 'Exibir caracteres'}]
                      </button>

                      <span className="text-gray-500">
                        {accessKey.length}/8 caracteres
                      </span>
                    </div>

                    {/* Live Rule Checkers */}
                    <div className="border border-black p-2 bg-gray-50 text-[10px] space-y-0.5">
                      <div className="font-bold text-gray-700">REQUISITOS OBRIGATÓRIOS DA CHAVE:</div>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className={keyValidation.rules.length ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                          {keyValidation.rules.length ? '[✓]' : '[ ]'} Exatamente 8 dígitos
                        </div>
                        <div className={keyValidation.rules.uppercase ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                          {keyValidation.rules.uppercase ? '[✓]' : '[ ]'} 1 letra Maiúscula
                        </div>
                        <div className={keyValidation.rules.numbers ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                          {keyValidation.rules.numbers ? '[✓]' : '[ ]'} 3 números
                        </div>
                        <div className={keyValidation.rules.symbol ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                          {keyValidation.rules.symbol ? '[✓]' : '[ ]'} 1 símbolo (!@#$...)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission and Confirmation Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-black">
                    <button
                      type="button"
                      onClick={() => setActiveMode('login')}
                      className="px-3 py-1 border border-black bg-white hover:bg-gray-100 cursor-pointer text-xs"
                    >
                      [ Voltar ao Login ]
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 border border-black bg-[#FFFFCC] hover:bg-black hover:text-white font-bold cursor-pointer text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                    >
                      {isSubmitting ? '[ CADASTRANDO... ]' : '[ CONCLUIR CADASTRO & ENTRAR ]'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-gray-100 border-t border-black px-3 py-1 text-[10px] text-gray-600 flex items-center justify-between shrink-0">
          <span>SISTEMA DE GESTÃO ULTRA-MINIMALISTA • NOTEPAD STYLE</span>
          <span>DADOS PROTEGIDOS POR CRIPTOGRAFIA</span>
        </div>
      </div>
    </div>
  );
};
