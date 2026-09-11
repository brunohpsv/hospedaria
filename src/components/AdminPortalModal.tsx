import React, { useState, useEffect, useMemo } from 'react';
import { ClientAccount, SubscriptionPlanType } from '../types';
import { SUBSCRIPTION_PLANS } from '../lib/authConstants';
import {
  deleteClientFromFirestore,
  updateClientStatusInFirestore,
  getAllClientsFromFirestore,
  verifyAdminPasswordWithFirebase,
  updateAdminPasswordInFirebase,
} from '../lib/hotelFirebaseService';
import { useDialog } from '../lib/dialogContext';
import {
  Shield,
  X,
  Search,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  Trash2,
  FileText,
  LogIn,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientAccount[];
  onUpdateClientsList: (updatedList: ClientAccount[]) => void;
  onLoginAsClient: (client: ClientAccount) => void;
}

const getPlanInfo = (planKey?: string) => {
  const normalized = (planKey || '').toLowerCase() as SubscriptionPlanType;
  return (
    SUBSCRIPTION_PLANS[normalized] ||
    SUBSCRIPTION_PLANS.profissional || {
      type: 'profissional' as SubscriptionPlanType,
      name: 'Profissional',
      roomLimit: 30,
      roomLimitText: 'Até 30 quartos',
      pricePerMonth: 149,
      priceText: 'R$ 149/mês',
      description: 'Plano hoteleiro padrão',
    }
  );
};

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  clients,
  onUpdateClientsList,
  onLoginAsClient,
}) => {
  const { showConfirm, showAlert } = useDialog();

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminKeyInput, setAdminKeyInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState<boolean>(false);

  // Filter & Search
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'suspensos'>('todos');

  // Loading / syncing state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Detail Modal state
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<ClientAccount | null>(null);

  // Change Admin Key state
  const [isChangingKey, setIsChangingKey] = useState<boolean>(false);
  const [newAdminKey, setNewAdminKey] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);

  // Handle Admin Login submission via Firebase
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (!adminKeyInput.trim()) return;

    setIsVerifyingAdmin(true);
    try {
      const isValid = await verifyAdminPasswordWithFirebase(adminKeyInput.trim());
      if (isValid) {
        setIsAdminAuthenticated(true);
        setAdminKeyInput('');
      } else {
        setAdminAuthError('Senha de Administrador incorreta.');
      }
    } catch (err) {
      console.error('Erro na autenticação de adm:', err);
      setAdminAuthError('Falha ao conectar com o serviço de autenticação.');
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  // Refresh client accounts from Firestore
  const handleRefreshFromCloud = async () => {
    setIsRefreshing(true);
    try {
      const cloudClients = await getAllClientsFromFirestore();
      if (cloudClients && cloudClients.length > 0) {
        // Merge with existing
        const merged = [...cloudClients];
        for (const c of clients) {
          if (!merged.some((m) => m.id === c.id || m.accessKey === c.accessKey)) {
            merged.push(c);
          }
        }
        onUpdateClientsList(merged);
        showAlert(`Sincronização concluída! ${merged.length} cadastros carregados.`, 'SINCRONIZAÇÃO CLOUD');
      } else {
        showAlert('Nenhum cadastro adicional encontrado no banco de dados.', 'SINCRONIZAÇÃO');
      }
    } catch (err) {
      console.error(err);
      showAlert('Falha ao conectar com o banco de dados.', 'ERRO DE CONEXÃO');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle Suspend / Activate
  const handleToggleSuspend = (client: ClientAccount) => {
    if (!client) return;
    const isCurrentlySuspended = client.status === 'suspenso';
    const newStatus = isCurrentlySuspended ? 'ativo' : 'suspenso';
    const actionWord = isCurrentlySuspended ? 'ATIVAR' : 'SUSPENDER';
    const estName = client.establishmentName || 'Estabelecimento';
    const respName = client.responsibleName || 'Responsável';

    showConfirm({
      title: `${actionWord} CADASTRO`,
      message: `Deseja realmente ${actionWord} o acesso do estabelecimento:\n\n"${estName.toUpperCase()}"\nResponsável: ${respName}\n\n${
        isCurrentlySuspended
          ? 'O cliente voltará a ter acesso normal ao sistema.'
          : 'O cliente NÃO conseguirá fazer login até ser reativado.'
      }`,
      type: isCurrentlySuspended ? 'confirm' : 'danger',
      confirmText: isCurrentlySuspended ? '[ SIM, REATIVAR ]' : '[ SIM, SUSPENDER ]',
      cancelText: '[ CANCELAR ]',
      onConfirm: async () => {
        // Local update
        const updated = clients.map((c) => (c.id === client.id ? { ...c, status: newStatus } : c));
        onUpdateClientsList(updated);

        if (selectedClientForDetails && selectedClientForDetails.id === client.id) {
          setSelectedClientForDetails({ ...selectedClientForDetails, status: newStatus });
        }

        try {
          await updateClientStatusInFirestore(client.id, newStatus);
          showAlert(
            `Cadastro "${estName}" foi ${isCurrentlySuspended ? 'ATIVADO' : 'SUSPENSO'} com sucesso.`,
            'STATUS ATUALIZADO'
          );
        } catch (err) {
          console.error(err);
          showAlert('Erro ao atualizar no banco de dados. Atualizado localmente.', 'AVISO');
        }
      },
    });
  };

  // Delete Client Account
  const handleDeleteClient = (client: ClientAccount) => {
    if (!client) return;
    const estName = client.establishmentName || 'Estabelecimento';
    const respName = client.responsibleName || 'Responsável';

    showConfirm({
      title: 'EXCLUIR CADASTRO DEFINITIVAMENTE',
      message: `ATENÇÃO: AÇÃO IRREVERSÍVEL!\n\nDeseja excluir definitivamente o cadastro do cliente:\n\n"${estName.toUpperCase()}"\nCNPJ/CPF: ${client.cpfCnpj || 'NÃO INFORMADO'}\nResponsável: ${respName}\nChave: ${client.accessKey || 'N/A'}\n\nTodos os dados deste cliente serão removidos da plataforma.`,
      type: 'danger',
      confirmText: '[ SIM, EXCLUIR DEFINITIVAMENTE ]',
      cancelText: '[ CANCELAR ]',
      onConfirm: async () => {
        // Local remove
        const updated = clients.filter((c) => c.id !== client.id);
        onUpdateClientsList(updated);

        if (selectedClientForDetails?.id === client.id) {
          setSelectedClientForDetails(null);
        }

        try {
          await deleteClientFromFirestore(client.id);
          showAlert(`Cadastro de "${estName}" excluído com sucesso!`, 'CADASTRO EXCLUÍDO');
        } catch (err) {
          console.error(err);
          showAlert('Erro ao remover no Firebase. Cadastro removido localmente.', 'AVISO');
        }
      },
    });
  };

  // Copy Access Key helper
  const handleCopyAccessKey = (key: string, id: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => {
      setCopiedKeyId(null);
    }, 2000);
  };

  // Download TXT Client Dossier (Notepad format)
  const handleDownloadClientTxt = (client: ClientAccount) => {
    if (!client) return;
    const plan = getPlanInfo(client.plan);
    const now = new Date().toLocaleString('pt-BR');
    const estName = client.establishmentName || 'ESTABELECIMENTO';
    const respName = client.responsibleName || 'RESPONSÁVEL';

    const content = `========================================================================
             FICHA COMPLETA DO CLIENTE / CADASTRO DE ASSINATURA
                   SISTEMA DE GESTÃO HOTELEIRA - BLOCO DE NOTAS
========================================================================

ID DO REGISTRO: ${client.id || 'N/A'}
DATA DO CADASTRO: ${client.createdAt || 'NÃO REGISTRADA'}
DATA DA CONSULTA: ${now}
STATUS DO ACESSO: ${(client.status || 'ativo').toUpperCase()}

------------------------------------------------------------------------
1. DADOS DO ESTABELECIMENTO
------------------------------------------------------------------------
NOME FANTASIA / HOTEL: ${estName.toUpperCase()}
CNPJ OU CPF:           ${client.cpfCnpj || 'NÃO INFORMADO'}
E-MAIL DE CONTATO:     ${client.email || 'NÃO INFORMADO'}
TELEFONE / WHATSAPP:   ${client.phone || 'NÃO INFORMADO'}

------------------------------------------------------------------------
2. DADOS DO RESPONSÁVEL
------------------------------------------------------------------------
NOME DO RESPONSÁVEL:   ${respName.toUpperCase()}
CPF DO RESPONSÁVEL:    ${client.responsibleCpf || client.cpfCnpj || 'NÃO INFORMADO'}

------------------------------------------------------------------------
3. CREDENCIAIS DE ACESSO
------------------------------------------------------------------------
CHAVE DE ACESSO / SENHA: ${client.accessKey || 'N/A'}

------------------------------------------------------------------------
4. PLANO CONTRATADO & VALORES
------------------------------------------------------------------------
PLANO:                 ${(plan.name || 'PADRÃO').toUpperCase()}
LIMITE DE ACOMODAÇÕES: ${plan.roomLimitText || ''}
VALOR MENSAL:          ${plan.priceText || ''}
DESCRIÇÃO:             ${plan.description || ''}

========================================================================
            DOCUMENTO CONFIDENCIAL - USO INTERNO DO ADMINISTRADOR
========================================================================
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeFileName = estName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    link.download = `CADASTRO_${safeFileName}_${client.accessKey || 'CHAVE'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Change Master Admin Password in Firebase
  const handleSaveNewAdminKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAdminKey.trim();
    if (!trimmed || trimmed.length < 4) {
      showAlert('A nova senha de administrador deve conter ao menos 4 caracteres.', 'SENHA MUITO CURTA');
      return;
    }
    setIsSavingKey(true);
    try {
      await updateAdminPasswordInFirebase(trimmed);
      setIsChangingKey(false);
      setNewAdminKey('');
      showAlert('Senha do administrador alterada e salva no Firebase com sucesso!', 'SENHA ATUALIZADA');
    } catch (err) {
      console.error(err);
      showAlert('Falha ao salvar nova senha no Firebase. Verifique a conexão.', 'ERRO');
    } finally {
      setIsSavingKey(false);
    }
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus =
        statusFilter === 'todos'
          ? true
          : statusFilter === 'ativos'
          ? (c.status || 'ativo') === 'ativo'
          : c.status === 'suspenso';

      if (!matchesStatus) return false;

      if (!searchFilter.trim()) return true;

      const q = searchFilter.toLowerCase();
      return (
        (c.establishmentName || '').toLowerCase().includes(q) ||
        (c.responsibleName || '').toLowerCase().includes(q) ||
        (c.cpfCnpj || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.accessKey || '').toLowerCase().includes(q) ||
        (getPlanInfo(c.plan)?.name || '').toLowerCase().includes(q)
      );
    });
  }, [clients, searchFilter, statusFilter]);

  // Statistics
  const totalCount = clients.length;
  const activeCount = clients.filter((c) => (c.status || 'ativo') === 'ativo').length;
  const suspendedCount = clients.filter((c) => c.status === 'suspenso').length;
  const estimatedRevenue = clients.reduce((sum, c) => {
    if (c.status === 'suspenso') return sum;
    const price = getPlanInfo(c.plan)?.pricePerMonth || 0;
    return sum + price;
  }, 0);

  if (!isOpen) return null;

  return (
    <>
      <div
        id="admin-portal-overlay"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 font-mono select-none"
      >
      <div className="bg-white border-2 border-black w-full max-w-6xl max-h-[92vh] flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-150">
        {/* Window Title Bar */}
        <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#FFFFCC]" />
            <span>Painel_do_Administrador_Geral - Bloco de Notas</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => setIsAdminAuthenticated(false)}
                className="text-[11px] text-gray-300 hover:text-white px-2 py-0.5 border border-gray-600 hover:border-white cursor-pointer"
                title="Bloquear painel"
              >
                [ Bloquear ]
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:bg-red-600 px-2 py-0.5 border border-white cursor-pointer text-xs"
              title="Fechar Janela"
            >
              [ X ]
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-[#FBFBFB] flex flex-col min-h-0 text-xs text-black">
          {!isAdminAuthenticated ? (
            /* Admin Password Challenge Screen */
            <div className="my-auto max-w-md w-full mx-auto border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 border-b-2 border-black pb-3 mb-4">
                <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">ACESSO RESTRITO - SUPER ADM</h2>
                  <p className="text-[10px] text-gray-600">ÁREA EXCLUSIVA PARA GESTÃO DE CLIENTES E ASSINATURAS</p>
                </div>
              </div>

              <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
                <div>
                  <label className="block font-bold text-xs mb-1">
                    DIGITE A SENHA MESTRA DO ADMINISTRADOR:
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={adminKeyInput}
                    onChange={(e) => setAdminKeyInput(e.target.value)}
                    placeholder="Senha de administrador"
                    className="w-full border-2 border-black p-2 bg-white focus:bg-[#FFFFCC] focus:outline-none text-sm font-bold tracking-wider"
                  />
                  {adminAuthError && (
                    <div className="mt-1.5 text-red-600 font-bold text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{adminAuthError}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-1">
                    * Autenticação de Administrador protegida e sincronizada via Firebase
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 border border-black bg-white hover:bg-gray-100 cursor-pointer text-xs"
                  >
                    [ Cancelar ]
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingAdmin}
                    className="px-5 py-1.5 border-2 border-black bg-[#FFFFCC] hover:bg-black hover:text-white font-bold cursor-pointer text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isVerifyingAdmin ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>VALIDANDO NO FIREBASE...</span>
                      </>
                    ) : (
                      <span>[ ENTRAR NO PAINEL ADM ]</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Full Admin Dashboard */
            <div className="flex flex-col h-full space-y-3">
              {/* Top Control Bar & Stats */}
              <div className="border border-black bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2">
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <span>GESTÃO GLOBAL DE CLIENTES CADASTRADOS</span>
                      <span className="text-[10px] bg-black text-white px-2 py-0.5">MODO ADMINISTRADOR</span>
                    </h3>
                    <p className="text-[10px] text-gray-600">
                      Verifique senhas, planos de assinatura, datas de entrada, suspenda ou exclua contas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingKey(!isChangingKey)}
                      className="px-2 py-1 border border-black bg-white hover:bg-gray-100 text-[11px] cursor-pointer"
                    >
                      [{isChangingKey ? 'Fechar Senha Adm' : 'Mudar Senha Adm'}]
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshFromCloud}
                      disabled={isRefreshing}
                      className="px-2.5 py-1 border border-black bg-[#FFFFCC] hover:bg-black hover:text-white text-[11px] font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>{isRefreshing ? 'Sincronizando...' : 'Recarregar do Firebase'}</span>
                    </button>
                  </div>
                </div>

                {/* Form to change admin key if toggled */}
                {isChangingKey && (
                  <form
                    onSubmit={handleSaveNewAdminKey}
                    className="p-2 border border-black bg-[#FFFFCC] flex items-center gap-2 text-xs"
                  >
                    <span className="font-bold">Nova Senha Adm:</span>
                    <input
                      type="text"
                      value={newAdminKey}
                      onChange={(e) => setNewAdminKey(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="border border-black px-2 py-0.5 bg-white text-xs font-bold"
                    />
                    <button
                      type="submit"
                      disabled={isSavingKey}
                      className="px-3 py-0.5 border border-black bg-black text-white hover:bg-gray-800 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isSavingKey ? 'Salvando no Firebase...' : 'Salvar no Firebase'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangingKey(false)}
                      className="px-2 py-0.5 border border-black bg-white text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </form>
                )}

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="border border-black p-2 bg-gray-50">
                    <div className="text-[10px] text-gray-500 font-bold">TOTAL DE CADASTROS:</div>
                    <div className="text-base font-bold">{totalCount} estabelecimentos</div>
                  </div>
                  <div className="border border-black p-2 bg-emerald-50">
                    <div className="text-[10px] text-emerald-700 font-bold">CONTAS ATIVAS:</div>
                    <div className="text-base font-bold text-emerald-800">{activeCount}</div>
                  </div>
                  <div className="border border-black p-2 bg-red-50">
                    <div className="text-[10px] text-red-700 font-bold">CONTAS SUSPENSAS:</div>
                    <div className="text-base font-bold text-red-800">{suspendedCount}</div>
                  </div>
                  <div className="border border-black p-2 bg-amber-50">
                    <div className="text-[10px] text-amber-800 font-bold">RECEITA MENSAL ESTIMADA:</div>
                    <div className="text-base font-bold text-amber-900">
                      {estimatedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[10px] text-gray-600">FILTRAR:</span>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('todos')}
                      className={`px-2 py-0.5 border border-black text-[11px] cursor-pointer ${
                        statusFilter === 'todos' ? 'bg-black text-white font-bold' : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      Todos ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ativos')}
                      className={`px-2 py-0.5 border border-black text-[11px] cursor-pointer ${
                        statusFilter === 'ativos'
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      Ativos ({activeCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('suspensos')}
                      className={`px-2 py-0.5 border border-black text-[11px] cursor-pointer ${
                        statusFilter === 'suspensos' ? 'bg-red-700 text-white font-bold' : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      Suspensos ({suspendedCount})
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-500" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar por hotel, responsável, CPF/CNPJ, chave..."
                      className="w-full border border-black pl-7 pr-2 py-1 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                    />
                    {searchFilter && (
                      <button
                        type="button"
                        onClick={() => setSearchFilter('')}
                        className="absolute right-2 top-1.5 text-gray-500 hover:text-black font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Clients Table / List */}
              <div className="flex-1 overflow-auto border border-black bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-black text-white sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2 border-r border-gray-700">ESTABELECIMENTO / CONTATO</th>
                      <th className="p-2 border-r border-gray-700">CNPJ / CPF</th>
                      <th className="p-2 border-r border-gray-700">SENHA / CHAVE</th>
                      <th className="p-2 border-r border-gray-700">PLANO</th>
                      <th className="p-2 border-r border-gray-700">ENTROU EM</th>
                      <th className="p-2 border-r border-gray-700 text-center">STATUS</th>
                      <th className="p-2 text-center">AÇÕES ADMINISTRATIVAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 font-bold">
                          Nenhum cadastro encontrado para os critérios de busca.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => {
                        const planInfo = getPlanInfo(client.plan);
                        const isSuspended = client.status === 'suspenso';
                        const isCopied = copiedKeyId === client.id;

                        return (
                          <tr
                            key={client.id}
                            className={`border-b border-gray-300 hover:bg-[#FFFFEE] transition-colors ${
                              isSuspended ? 'bg-red-50/40 text-gray-700' : ''
                            }`}
                          >
                            {/* Estabelecimento & Responsável */}
                            <td className="p-2 border-r border-gray-200">
                              <div className="font-bold text-black flex items-center gap-1.5">
                                <span>{client.establishmentName}</span>
                                {client.id === 'client-demo-default' && (
                                  <span className="text-[9px] bg-gray-200 text-gray-700 px-1 border border-gray-400">
                                    DEMO
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-600">
                                Resp: <span className="font-bold">{client.responsibleName}</span>
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {client.email} • {client.phone}
                              </div>
                            </td>

                            {/* CPF / CNPJ */}
                            <td className="p-2 border-r border-gray-200 font-mono text-[11px]">
                              <div>{client.cpfCnpj}</div>
                              {client.responsibleCpf && client.responsibleCpf !== client.cpfCnpj && (
                                <div className="text-[9px] text-gray-500">
                                  CPF Resp: {client.responsibleCpf}
                                </div>
                              )}
                            </td>

                            {/* Senha / Chave de Acesso */}
                            <td className="p-2 border-r border-gray-200">
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold bg-[#FFFFCC] border border-black px-1.5 py-0.5 text-xs select-all">
                                  {client.accessKey}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyAccessKey(client.accessKey, client.id)}
                                  title="Copiar senha do cliente"
                                  className="p-1 border border-gray-400 bg-white hover:bg-gray-100 cursor-pointer text-gray-700"
                                >
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Plano de Assinatura */}
                            <td className="p-2 border-r border-gray-200">
                              <div className="font-bold text-[11px] text-black uppercase">
                                {planInfo.name}
                              </div>
                              <div className="text-[10px] text-gray-600 font-bold">
                                {planInfo.priceText}
                              </div>
                              <div className="text-[9px] text-gray-500">
                                {planInfo.roomLimitText}
                              </div>
                            </td>

                            {/* Quando entraram */}
                            <td className="p-2 border-r border-gray-200 text-[11px] whitespace-nowrap">
                              <div className="font-bold">{client.createdAt || 'Antes de 2026'}</div>
                            </td>

                            {/* Status */}
                            <td className="p-2 border-r border-gray-200 text-center">
                              {isSuspended ? (
                                <span className="inline-block px-2 py-0.5 bg-red-100 text-red-800 border border-red-400 font-bold text-[10px]">
                                  [ SUSPENSO ]
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-400 font-bold text-[10px]">
                                  [ ATIVO ]
                                </span>
                              )}
                            </td>

                            {/* Ações Administrativas */}
                            <td className="p-2">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {/* Botão Ver Detalhes */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedClientForDetails(client)}
                                  className="px-2 py-1 border border-black bg-white hover:bg-[#FFFFCC] text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                  title="Ver todos os dados cadastrados deste cliente"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>[ Detalhes ]</span>
                                </button>

                                {/* Botão Suspender / Ativar */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspend(client)}
                                  className={`px-2 py-1 border border-black text-[10px] font-bold cursor-pointer flex items-center gap-1 ${
                                    isSuspended
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                  }`}
                                  title={isSuspended ? 'Ativar acesso do cliente' : 'Suspender acesso do cliente'}
                                >
                                  {isSuspended ? (
                                    <>
                                      <Unlock className="w-3 h-3" />
                                      <span>[ Ativar ]</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3" />
                                      <span>[ Suspender ]</span>
                                    </>
                                  )}
                                </button>

                                {/* Botão Excluir */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClient(client)}
                                  className="px-2 py-1 border border-black bg-red-100 text-red-900 hover:bg-red-600 hover:text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                  title="Excluir cadastro permanentemente"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>[ Excluir ]</span>
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
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="bg-gray-100 border-t border-black px-3 py-1.5 text-[10px] text-gray-700 flex flex-wrap items-center justify-between gap-2">
          <span>PAINEL ADMINISTRATIVO MESTRE • TOTAL DE ESTABELECIMENTOS: {totalCount}</span>
          <span>ACESSO CONFIDENCIAL • GESTÃO DE CHAVES & ASSINATURAS</span>
        </div>
      </div>
    </div>

    {/* DETAILED CLIENT DOSSIER MODAL */}
    {selectedClientForDetails && (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-2 md:p-4 font-mono select-none">
        <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {/* Title */}
          <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
            <span className="truncate mr-2">Detalhes_do_Cliente - {selectedClientForDetails.establishmentName || 'Hotel'}.txt</span>
            <button
              type="button"
              onClick={() => setSelectedClientForDetails(null)}
              className="text-white hover:bg-red-600 px-2 py-0.5 border border-white cursor-pointer shrink-0"
            >
              [ X ]
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4 text-xs">
            <div className="border border-black p-3 bg-[#FFFFEE] space-y-1">
              <div className="font-bold text-sm text-black flex items-center justify-between">
                <span>{(selectedClientForDetails.establishmentName || 'ESTABELECIMENTO').toUpperCase()}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 border font-bold ${
                    selectedClientForDetails.status === 'suspenso'
                      ? 'bg-red-100 text-red-800 border-red-500'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-500'
                  }`}
                >
                  STATUS: {(selectedClientForDetails.status || 'ativo').toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] text-gray-600">
                ID do Cliente: <span className="font-bold text-black select-all">{selectedClientForDetails.id || 'N/A'}</span>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-black p-2.5 bg-white space-y-1">
                <div className="text-[10px] text-gray-500 font-bold">DADOS DA EMPRESA / HOTEL</div>
                <div>
                  <span className="text-gray-600">CNPJ / CPF:</span>{' '}
                  <span className="font-bold">{selectedClientForDetails.cpfCnpj || 'Não Informado'}</span>
                </div>
                <div>
                  <span className="text-gray-600">E-mail:</span>{' '}
                  <span className="font-bold">{selectedClientForDetails.email || 'Não Informado'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Telefone:</span>{' '}
                  <span className="font-bold">{selectedClientForDetails.phone || 'Não Informado'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Data de Entrada:</span>{' '}
                  <span className="font-bold">{selectedClientForDetails.createdAt || 'N/A'}</span>
                </div>
              </div>

              <div className="border border-black p-2.5 bg-white space-y-1">
                <div className="text-[10px] text-gray-500 font-bold">RESPONSÁVEL LEGAL</div>
                <div>
                  <span className="text-gray-600">Nome:</span>{' '}
                  <span className="font-bold">{selectedClientForDetails.responsibleName || 'Não Informado'}</span>
                </div>
                <div>
                  <span className="text-gray-600">CPF:</span>{' '}
                  <span className="font-bold">{selectedClientForDetails.responsibleCpf || selectedClientForDetails.cpfCnpj || 'Não Informado'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status Acesso:</span>{' '}
                  <span className="font-bold uppercase">
                    {selectedClientForDetails.status || 'ativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Access Key & Plan */}
            <div className="border border-black p-3 bg-gray-50 space-y-2">
              <div className="text-[10px] text-gray-500 font-bold">CREDENCIAL E PLANO DE ASSINATURA</div>

              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 border border-black">
                <div>
                  <span className="text-xs text-gray-600 block">SENHA / CHAVE DE ACESSO DO CLIENTE:</span>
                  <span className="text-base font-bold font-mono text-black bg-[#FFFFCC] px-2 py-0.5 border border-black select-all">
                    {selectedClientForDetails.accessKey || 'N/A'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyAccessKey(selectedClientForDetails.accessKey || '', 'detail-modal')}
                  className="px-2.5 py-1 border border-black bg-white hover:bg-gray-100 text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  {copiedKeyId === 'detail-modal' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Chave</span>
                    </>
                  )}
                </button>
              </div>

              {/* Plan Info Card */}
              {(() => {
                const p = getPlanInfo(selectedClientForDetails.plan);
                return (
                  <div className="border border-black bg-white p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-black">PLANO {(p?.name || 'PADRÃO').toUpperCase()}</span>
                      <span className="font-bold text-black">{p?.priceText || ''}</span>
                    </div>
                    <div className="text-xs text-gray-700">
                      Capacidade: <span className="font-bold">{p?.roomLimitText || ''}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 italic">
                      {p?.description || ''}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer with actions */}
          <div className="p-3 bg-gray-100 border-t border-black flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Download TXT */}
              <button
                type="button"
                onClick={() => handleDownloadClientTxt(selectedClientForDetails)}
                className="px-3 py-1.5 border border-black bg-white hover:bg-gray-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>[ Baixar Ficha TXT ]</span>
              </button>

              {/* Login as client (support / inspect) */}
              <button
                type="button"
                onClick={() => {
                  onLoginAsClient(selectedClientForDetails);
                  setSelectedClientForDetails(null);
                  onClose();
                }}
                className="px-3 py-1.5 border border-black bg-[#FFFFCC] hover:bg-black hover:text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                title="Acessar o painel deste hotel diretamente"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>[ Acessar Como Este Hotel ]</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Suspender / Ativar directly from details */}
              <button
                type="button"
                onClick={() => handleToggleSuspend(selectedClientForDetails)}
                className={`px-3 py-1.5 border border-black font-bold text-xs cursor-pointer flex items-center gap-1.5 ${
                  selectedClientForDetails.status === 'suspenso'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                {selectedClientForDetails.status === 'suspenso' ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>[ Reativar Conta ]</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>[ Suspender Conta ]</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedClientForDetails(null)}
                className="px-4 py-1.5 border border-black bg-white hover:bg-gray-200 font-bold text-xs cursor-pointer"
              >
                [ Fechar ]
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
};
