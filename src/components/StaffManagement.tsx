import React, { useState, useEffect } from 'react';
import { Employee, EmployeeStatus } from '../types';
import { useDialog } from '../lib/dialogContext';

interface StaffManagementProps {
  employees: Employee[];
  workplaces: string[];
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onAddWorkplace: (workplaceName: string) => void;
  onDeleteWorkplace: (workplaceName: string) => boolean | void;
  searchQuery: string;
  establishmentName?: string;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  employees,
  workplaces,
  onSaveEmployee,
  onDeleteEmployee,
  onAddWorkplace,
  onDeleteWorkplace,
  searchQuery,
  establishmentName = 'ESTABELECIMENTO',
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Selected employee for editing (null means new registration)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [workplace, setWorkplace] = useState<string>(() => workplaces[0] || 'Recepção');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [salary, setSalary] = useState<number>(2200);
  const [hireDate, setHireDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('ativo');
  const [notes, setNotes] = useState('');

  // Filtering states
  const [filterWorkplace, setFilterWorkplace] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  // Inline workplace quick addition
  const [showInlineAddWorkplace, setShowInlineAddWorkplace] = useState(false);
  const [inlineWorkplaceName, setInlineWorkplaceName] = useState('');

  // Manage workplaces modal
  const [showWorkplacesModal, setShowWorkplacesModal] = useState(false);
  const [modalWorkplaceName, setModalWorkplaceName] = useState('');

  // TXT Report / Dossier modal
  const [txtModalData, setTxtModalData] = useState<{ title: string; content: string } | null>(null);
  const [txtCopied, setTxtCopied] = useState(false);

  // Keep workplace valid if workplaces list changes
  useEffect(() => {
    if (workplaces.length > 0 && !workplaces.includes(workplace)) {
      setWorkplace(workplaces[0]);
    }
  }, [workplaces, workplace]);

  // Keep filterWorkplace valid
  useEffect(() => {
    if (filterWorkplace !== 'TODOS' && !workplaces.includes(filterWorkplace)) {
      setFilterWorkplace('TODOS');
    }
  }, [workplaces, filterWorkplace]);

  // Load employee into form when selected
  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setName(emp.name);
    setRole(emp.role);
    setWorkplace(emp.workplace);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setSalary(emp.salary);
    setHireDate(emp.hireDate);
    setDocumentNumber(emp.document || '');
    setStatus(emp.status);
    setNotes(emp.notes || '');
  };

  // Clear form for new entry
  const handleClearForm = () => {
    setSelectedEmployeeId(null);
    setName('');
    setRole('');
    setWorkplace(workplaces[0] || 'Recepção');
    setPhone('');
    setEmail('');
    setSalary(2200);
    setHireDate(new Date().toISOString().split('T')[0]);
    setDocumentNumber('');
    setStatus('ativo');
    setNotes('');
  };

  // Form submission: save or update
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedRole = role.trim();

    if (!trimmedName) {
      showAlert('Por favor, informe o Nome Completo do funcionário.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!trimmedRole) {
      showAlert('Por favor, informe a Função / Cargo do funcionário.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!workplace) {
      showAlert('Por favor, selecione ou digite o Local de Trabalho.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (salary < 0 || isNaN(salary)) {
      showAlert('Informe um valor de salário válido.', 'SALÁRIO INVÁLIDO');
      return;
    }
    if (!hireDate) {
      showAlert('Informe a data de admissão do funcionário.', 'DATA INVÁLIDA');
      return;
    }

    const employeeToSave: Employee = {
      id: selectedEmployeeId || `emp-${Date.now()}`,
      name: trimmedName,
      role: trimmedRole,
      workplace: workplace,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      salary: Number(salary),
      hireDate: hireDate,
      document: documentNumber.trim(),
      status: status,
      notes: notes.trim(),
    };

    onSaveEmployee(employeeToSave);
    showAlert(
      selectedEmployeeId
        ? `Cadastro do funcionário "${trimmedName}" atualizado com sucesso!`
        : `Novo funcionário "${trimmedName}" cadastrado com sucesso!`,
      'FUNCIONÁRIO SALVO'
    );

    handleClearForm();
  };

  // Delete employee confirmation
  const handleDeleteSelected = (emp: Employee) => {
    showConfirm({
      title: 'EXCLUIR FUNCIONÁRIO',
      message:
        `Confirma a exclusão do cadastro do funcionário:\n\n` +
        `• Nome: ${emp.name}\n` +
        `• Cargo: ${emp.role}\n` +
        `• Local: ${emp.workplace}\n` +
        `• Salário: R$ ${emp.salary.toFixed(2)}\n\n` +
        `Esta operação não pode ser desfeita.`,
      type: 'danger',
      confirmText: '[ Sim, Excluir Funcionário ]',
      onConfirm: () => {
        onDeleteEmployee(emp.id);
        if (selectedEmployeeId === emp.id) {
          handleClearForm();
        }
        showAlert(`Funcionário "${emp.name}" removido com sucesso.`, 'REGISTRO EXCLUÍDO');
      },
    });
  };

  // Add new workplace inline
  const handleAddInlineWorkplace = () => {
    const trimmed = inlineWorkplaceName.trim();
    if (!trimmed) {
      showAlert('Digite o nome do local de trabalho (ex: Cozinha, Recepção).', 'CAMPO VAZIO');
      return;
    }
    if (workplaces.some((w) => w.toLowerCase() === trimmed.toLowerCase())) {
      showAlert(`O local de trabalho "${trimmed}" já está cadastrado!`, 'LOCAL JÁ EXISTE');
      return;
    }

    onAddWorkplace(trimmed);
    setWorkplace(trimmed);
    setInlineWorkplaceName('');
    setShowInlineAddWorkplace(false);
    showAlert(`Local de trabalho "${trimmed}" cadastrado e selecionado!`, 'LOCAL ADICIONADO');
  };

  // Add new workplace via modal
  const handleAddModalWorkplace = () => {
    const trimmed = modalWorkplaceName.trim();
    if (!trimmed) {
      showAlert('Digite o nome do local de trabalho.', 'CAMPO VAZIO');
      return;
    }
    if (workplaces.some((w) => w.toLowerCase() === trimmed.toLowerCase())) {
      showAlert(`O local de trabalho "${trimmed}" já está cadastrado!`, 'LOCAL JÁ EXISTE');
      return;
    }

    onAddWorkplace(trimmed);
    setModalWorkplaceName('');
    showAlert(`Local de trabalho "${trimmed}" adicionado à lista!`, 'SUCESSO');
  };

  // Delete workplace with validation
  const handleDeleteWorkplaceClick = async (wp: string) => {
    const assigned = employees.filter((e) => e.workplace === wp);
    if (assigned.length > 0) {
      showAlert(
        `Não é possível excluir o local "${wp}" pois existem ${assigned.length} funcionário(s) vinculados a ele:\n\n` +
          assigned.map((e) => `• ${e.name} (${e.role})`).join('\n') +
          `\n\nReatribua o local destes funcionários antes de excluir.`,
        'LOCAL EM USO'
      );
      return;
    }

    showConfirm({
      title: 'EXCLUIR LOCAL DE TRABALHO',
      message: `Deseja realmente excluir o local de trabalho "${wp}"?`,
      type: 'danger',
      confirmText: '[ Sim, Excluir Local ]',
      onConfirm: () => {
        onDeleteWorkplace(wp);
        showAlert(`Local de trabalho "${wp}" removido.`, 'CONCLUÍDO');
      },
    });
  };

  // Generate TXT Dossier for single employee
  const handleGenerateIndividualTxt = (emp: Employee) => {
    const hireDateObj = new Date(emp.hireDate + 'T00:00:00');
    const hireDateFormatted = !isNaN(hireDateObj.getTime())
      ? hireDateObj.toLocaleDateString('pt-BR')
      : emp.hireDate;

    // Calculate time of service
    const now = new Date();
    const diffMs = now.getTime() - hireDateObj.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const serviceTimeText =
      years > 0
        ? `${years} ano(s) e ${months} mês(es)`
        : `${months} mês(es) e ${diffDays % 30} dia(s)`;

    const text = `======================================================================
FICHA CADASTRAL DE FUNCIONÁRIO - BLOCO DE NOTAS
ESTABELECIMENTO: ${establishmentName.toUpperCase()}
EMISSÃO: ${new Date().toLocaleString('pt-BR')}
======================================================================

[ 1. DADOS DO COLABORADOR ]
ID DE REGISTRO    : ${emp.id}
NOME COMPLETO     : ${emp.name.toUpperCase()}
DOCUMENTO / CPF   : ${emp.document || 'NÃO INFORMADO'}
STATUS CADASTRAL  : ${emp.status.toUpperCase()}

[ 2. FUNÇÃO & LOTAÇÃO DE TRABALHO ]
FUNÇÃO / CARGO    : ${emp.role.toUpperCase()}
LOCAL DE TRABALHO : ${emp.workplace.toUpperCase()}
DATA DE ADMISSÃO  : ${hireDateFormatted} (Tempo de Casa: ${serviceTimeText})
SALÁRIO MENSAL    : R$ ${emp.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

[ 3. INFORMAÇÕES DE CONTATO ]
TELEFONE / WHATSAPP: ${emp.phone || 'NÃO INFORMADO'}
E-MAIL PROFISSIONAL: ${emp.email || 'NÃO INFORMADO'}

[ 4. OBSERVAÇÕES & ROTINA ]
${emp.notes || 'Nenhuma observação complementar registrada.'}

----------------------------------------------------------------------
DECLARAÇÃO DO EMPREGADOR & CIÊNCIA:
Confirmo que as informações cadastrais e salariais acima conferem
com o registro oficial e o quadro de colaboradores da empresa.

Data: ____/____/________

__________________________________        __________________________________
Assinatura do Responsável                 Assinatura do Funcionário
======================================================================`;

    setTxtModalData({
      title: `FICHA DE FUNCIONÁRIO - ${emp.name.toUpperCase()}`,
      content: text,
    });
    setTxtCopied(false);
  };

  // Generate TXT Full Staff Payroll Report
  const handleGenerateFullStaffTxt = () => {
    const totalPayroll = employees.reduce((acc, curr) => acc + curr.salary, 0);
    const activeCount = employees.filter((e) => e.status === 'ativo').length;

    let text = `================================================================================
RELAÇÃO GERAL DE FUNCIONÁRIOS & FOLHA SALARIAL
ESTABELECIMENTO: ${establishmentName.toUpperCase()}
DATA DE EMISSÃO: ${new Date().toLocaleString('pt-BR')}
TOTAL DE FUNCIONÁRIOS: ${employees.length}  |  ATIVOS: ${activeCount}
FOLHA SALARIAL MENSAL: R$ ${totalPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
================================================================================

`;

    text += `NOME                          CARGO / FUNÇÃO          LOCAL          SALÁRIO (R$)  ADMISSÃO    STATUS\n`;
    text += `--------------------------------------------------------------------------------\n`;

    employees.forEach((emp) => {
      const pName = emp.name.padEnd(29).substring(0, 29);
      const pRole = emp.role.padEnd(23).substring(0, 23);
      const pWork = emp.workplace.padEnd(14).substring(0, 14);
      const pSal = `R$ ${emp.salary.toFixed(2)}`.padEnd(13).substring(0, 13);
      const pDate = emp.hireDate.padEnd(11).substring(0, 11);
      const pStat = emp.status.toUpperCase();
      text += `${pName} ${pRole} ${pWork} ${pSal} ${pDate} ${pStat}\n`;
    });

    text += `--------------------------------------------------------------------------------\n`;
    text += `DISTRIBUIÇÃO POR LOCAL DE TRABALHO:\n`;

    workplaces.forEach((wp) => {
      const count = employees.filter((e) => e.workplace === wp).length;
      const subtotal = employees
        .filter((e) => e.workplace === wp)
        .reduce((sum, e) => sum + e.salary, 0);
      text += `• ${wp.padEnd(25)}: ${count.toString().padStart(2)} colaborador(es) - Total R$ ${subtotal.toFixed(2)}\n`;
    });

    text += `\n================================================================================\n`;
    text += `DOCUMENTO GERADO PELO SISTEMA HOTEL NOTEPAD - ARQUIVO OFICIAL EM FORMATO TXT\n`;
    text += `================================================================================\n`;

    setTxtModalData({
      title: 'RELAÇÃO COMPLETA DE FUNCIONÁRIOS E FOLHA SALARIAL (TXT)',
      content: text,
    });
    setTxtCopied(false);
  };

  // Copy TXT modal content to clipboard
  const handleCopyTxt = () => {
    if (txtModalData) {
      navigator.clipboard.writeText(txtModalData.content);
      setTxtCopied(true);
      setTimeout(() => setTxtCopied(false), 2000);
    }
  };

  // Download TXT modal content
  const handleDownloadTxt = () => {
    if (!txtModalData) return;
    const blob = new Blob([txtModalData.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${txtModalData.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.workplace.toLowerCase().includes(q) ||
      (emp.phone && emp.phone.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.document && emp.document.toLowerCase().includes(q));

    const matchesWorkplace =
      filterWorkplace === 'TODOS' ||
      emp.workplace.toLowerCase() === filterWorkplace.toLowerCase();

    const matchesStatus =
      filterStatus === 'TODOS' || emp.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesWorkplace && matchesStatus;
  });

  // Aggregate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'ativo').length;
  const totalSalary = employees.reduce((acc, curr) => acc + (curr.salary || 0), 0);
  const avgSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;

  return (
    <div className="h-full flex flex-col font-mono text-xs select-none bg-white">
      {/* Top Bar: Summary, Filter & Action Buttons */}
      <div className="border-b border-black p-2 bg-[#FFFFCC] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-3 flex-wrap">
          <span className="font-bold text-sm bg-black text-white px-2 py-0.5">
            GESTÃO DE FUNCIONÁRIOS
          </span>

          <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-bold">
            TOTAL: <strong>{totalEmployees}</strong>
          </span>

          <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-bold text-emerald-800">
            ATIVOS: <strong>{activeEmployees}</strong>
          </span>

          <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-bold">
            FOLHA SALARIAL:{' '}
            <strong>
              R$ {totalSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </span>

          <span className="border border-black bg-white px-2 py-0.5 text-[11px] font-bold hidden md:inline-block">
            MÉDIA:{' '}
            <strong>
              R$ {avgSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowWorkplacesModal(true)}
            className="px-2.5 py-1 border border-black bg-white hover:bg-[#ffff99] font-bold cursor-pointer text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            title="Cadastrar e gerenciar locais de trabalho (ex: Cozinha, Recepção, etc.)"
          >
            ⚙ GERENCIAR LOCAIS ({workplaces.length})
          </button>

          <button
            type="button"
            onClick={handleGenerateFullStaffTxt}
            className="px-2.5 py-1 border border-black bg-white hover:bg-[#ffff99] font-bold cursor-pointer text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            title="Exportar relatório completo da equipe e folha em formato Bloco de Notas .TXT"
          >
            📄 RELAÇÃO EM .TXT
          </button>

          <button
            type="button"
            onClick={handleClearForm}
            className="px-2.5 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold cursor-pointer text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            title="Cadastrar novo funcionário"
          >
            + NOVO FUNCIONÁRIO
          </button>
        </div>
      </div>

      {/* Workspace: 2 Panels (Left: Staff Table & Filters | Right: Registration / Edit Form) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Employee List & Filters */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-black min-h-0 overflow-hidden bg-white">
          {/* Sub-header Filter Bar */}
          <div className="border-b border-black p-2 bg-gray-50 flex items-center justify-between gap-2 flex-wrap text-[11px]">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-bold">FILTRAR LOCAL:</span>
              <select
                id="filter-workplace"
                value={filterWorkplace}
                onChange={(e) => setFilterWorkplace(e.target.value)}
                className="border border-black px-1.5 py-0.5 bg-white text-xs cursor-pointer font-bold focus:bg-[#FFFFCC]"
              >
                <option value="TODOS">TODOS OS LOCAIS ({workplaces.length})</option>
                {workplaces.map((wp) => (
                  <option key={wp} value={wp}>
                    {wp}
                  </option>
                ))}
              </select>

              <span className="font-bold ml-2">STATUS:</span>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-black px-1.5 py-0.5 bg-white text-xs cursor-pointer font-bold focus:bg-[#FFFFCC]"
              >
                <option value="TODOS">TODOS</option>
                <option value="ativo">ATIVO</option>
                <option value="férias">EM FÉRIAS</option>
                <option value="afastado">AFASTADO</option>
                <option value="desligado">DESLIGADO</option>
              </select>
            </div>

            <span className="text-[10px] text-gray-600 font-bold">
              {filteredEmployees.length} de {employees.length} funcionário(s)
            </span>
          </div>

          {/* Table of Employees */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-bold space-y-2">
                <p className="text-sm">NENHUM FUNCIONÁRIO ENCONTRADO.</p>
                <p className="text-xs font-normal">
                  Preencha o formulário ao lado para cadastrar colaboradores da sua equipe.
                </p>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-3 py-1 bg-[#FFFFCC] border border-black font-bold text-xs hover:bg-black hover:text-white cursor-pointer"
                >
                  [ CADASTRAR PRIMEIRO FUNCIONÁRIO ]
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 border-b border-black sticky top-0 z-10 text-[10px]">
                  <tr>
                    <th className="p-1.5 border-r border-black">NOME DO FUNCIONÁRIO</th>
                    <th className="p-1.5 border-r border-black">FUNÇÃO / CARGO</th>
                    <th className="p-1.5 border-r border-black">LOCAL DE TRABALHO</th>
                    <th className="p-1.5 border-r border-black">CONTATO</th>
                    <th className="p-1.5 border-r border-black text-right">SALÁRIO (R$)</th>
                    <th className="p-1.5 border-r border-black text-center">ADMISSÃO</th>
                    <th className="p-1.5 border-r border-black text-center">STATUS</th>
                    <th className="p-1.5 text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedEmployeeId === emp.id;
                    const hireDateDisplay = emp.hireDate.split('-').reverse().join('/');

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#FFFFCC] font-bold text-black border-l-4 border-l-black'
                            : 'hover:bg-amber-50'
                        }`}
                      >
                        <td className="p-1.5 border-r border-black">
                          <div className="font-bold truncate max-w-[170px]">{emp.name}</div>
                          {emp.document && (
                            <div className="text-[9px] text-gray-500 font-normal">
                              CPF: {emp.document}
                            </div>
                          )}
                        </td>

                        <td className="p-1.5 border-r border-black truncate max-w-[140px]">
                          {emp.role}
                        </td>

                        <td className="p-1.5 border-r border-black">
                          <span className="inline-block px-1.5 py-0.5 bg-white border border-black text-[10px] font-bold">
                            📍 {emp.workplace}
                          </span>
                        </td>

                        <td className="p-1.5 border-r border-black text-[10px]">
                          <div className="truncate max-w-[130px]">{emp.phone || '-'}</div>
                          <div className="truncate max-w-[130px] text-gray-500">
                            {emp.email || ''}
                          </div>
                        </td>

                        <td className="p-1.5 border-r border-black text-right font-bold">
                          R$ {emp.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="p-1.5 border-r border-black text-center text-[10px]">
                          {hireDateDisplay}
                        </td>

                        <td className="p-1.5 border-r border-black text-center">
                          <span
                            className={`px-1.5 py-0.5 border border-black text-[9px] font-bold uppercase ${
                              emp.status === 'ativo'
                                ? 'bg-emerald-200 text-emerald-950'
                                : emp.status === 'férias'
                                ? 'bg-blue-200 text-blue-950'
                                : emp.status === 'afastado'
                                ? 'bg-amber-200 text-amber-950'
                                : 'bg-red-200 text-red-950'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>

                        <td
                          className="p-1.5 text-center space-x-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectEmployee(emp)}
                            className="px-1.5 py-0.5 border border-black bg-white hover:bg-black hover:text-white cursor-pointer text-[9px] font-bold"
                            title="Editar cadastro"
                          >
                            EDITAR
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGenerateIndividualTxt(emp)}
                            className="px-1.5 py-0.5 border border-black bg-white hover:bg-[#FFFFCC] cursor-pointer text-[9px] font-bold"
                            title="Gerar ficha individual em .TXT"
                          >
                            TXT
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSelected(emp)}
                            className="px-1.5 py-0.5 border border-black bg-white hover:bg-red-600 hover:text-white cursor-pointer text-[9px] font-bold"
                            title="Excluir funcionário"
                          >
                            EXCLUIR
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Registration & Edit Form */}
        <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-white min-h-0 overflow-y-auto border-t lg:border-t-0">
          <div className="border-b border-black p-2 bg-gray-100 flex items-center justify-between">
            <span className="font-bold text-xs bg-[#FFFFCC] border border-black px-1.5 py-0.5">
              {selectedEmployeeId
                ? 'EDITAR DADOS DO FUNCIONÁRIO'
                : 'CADASTRAR NOVO FUNCIONÁRIO'}
            </span>

            {selectedEmployeeId && (
              <button
                type="button"
                onClick={handleClearForm}
                className="text-[10px] font-bold text-gray-700 hover:text-black underline cursor-pointer"
              >
                [ Cancelar Edição ]
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitForm} className="p-3 space-y-3 flex-1">
            {/* Name */}
            <div>
              <label
                className="block font-bold mb-0.5 text-[10px]"
                htmlFor="staff-name"
              >
                NOME COMPLETO DO FUNCIONÁRIO:*
              </label>
              <input
                id="staff-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Aparecida Santos"
                className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
              />
            </div>

            {/* Role / Job function */}
            <div>
              <label
                className="block font-bold mb-0.5 text-[10px]"
                htmlFor="staff-role"
              >
                FUNÇÃO / CARGO:*
              </label>
              <input
                id="staff-role"
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Cozinheira Chefe, Recepcionista, Camareira..."
                className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            {/* Workplace Selector with Inline Quick Addition */}
            <div className="border border-black p-2 bg-gray-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="block font-bold text-[10px]"
                  htmlFor="staff-workplace"
                >
                  LOCAL DE TRABALHO / SETOR:*
                </label>
                <button
                  type="button"
                  onClick={() => setShowInlineAddWorkplace((prev) => !prev)}
                  className="text-[10px] font-bold text-black hover:underline cursor-pointer bg-[#FFFFCC] border border-black px-1.5 py-0.2"
                >
                  {showInlineAddWorkplace ? '[- FECHAR ]' : '[ + DIGITAR NOVO LOCAL ]'}
                </button>
              </div>

              {/* Inline Input to Type and Digitalize a New Workplace */}
              {showInlineAddWorkplace && (
                <div className="p-1.5 bg-white border border-black space-y-1">
                  <span className="block text-[9px] font-bold text-gray-700">
                    DIGITE O NOVO LOCAL DE TRABALHO (EX: COZINHA, RECEPÇÃO, MANUTENÇÃO):
                  </span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={inlineWorkplaceName}
                      onChange={(e) => setInlineWorkplaceName(e.target.value)}
                      placeholder="Nome do local (ex: Cozinha)"
                      className="flex-1 border border-black px-1.5 h-6 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineWorkplace}
                      className="px-2 h-6 bg-black text-white hover:bg-gray-800 font-bold text-[10px] cursor-pointer"
                    >
                      CADASTRAR
                    </button>
                  </div>
                </div>
              )}

              {/* Select from existing Digitalized Workplaces */}
              <select
                id="staff-workplace"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold cursor-pointer"
              >
                {workplaces.map((wp) => (
                  <option key={wp} value={wp}>
                    {wp}
                  </option>
                ))}
              </select>
              <span className="block text-[9px] text-gray-600 italic">
                * Os locais cadastrados ficam disponíveis no menu de seleção acima.
              </span>
            </div>

            {/* Salary and Hire Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  className="block font-bold mb-0.5 text-[10px]"
                  htmlFor="staff-salary"
                >
                  SALÁRIO MENSAL (R$):*
                </label>
                <input
                  id="staff-salary"
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label
                  className="block font-bold mb-0.5 text-[10px]"
                  htmlFor="staff-hiredate"
                >
                  DATA DE ADMISSÃO:*
                </label>
                <input
                  id="staff-hiredate"
                  type="date"
                  required
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                />
              </div>
            </div>

            {/* Contact: Phone & Email */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  className="block font-bold mb-0.5 text-[10px]"
                  htmlFor="staff-phone"
                >
                  TELEFONE / WHATSAPP:
                </label>
                <input
                  id="staff-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label
                  className="block font-bold mb-0.5 text-[10px]"
                  htmlFor="staff-email"
                >
                  E-MAIL:
                </label>
                <input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="funcionario@hotel.com"
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Document and Status */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  className="block font-bold mb-0.5 text-[10px]"
                  htmlFor="staff-document"
                >
                  CPF / DOCUMENTO:
                </label>
                <input
                  id="staff-document"
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
                />
              </div>

              <div>
                <label
                  className="block font-bold mb-0.5 text-[10px]"
                  htmlFor="staff-status"
                >
                  SITUAÇÃO / STATUS:
                </label>
                <select
                  id="staff-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                  className="w-full border border-black px-2 h-7 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold cursor-pointer"
                >
                  <option value="ativo">ATIVO</option>
                  <option value="férias">EM FÉRIAS</option>
                  <option value="afastado">AFASTADO</option>
                  <option value="desligado">DESLIGADO</option>
                </select>
              </div>
            </div>

            {/* Notes / Work shift */}
            <div>
              <label
                className="block font-bold mb-0.5 text-[10px]"
                htmlFor="staff-notes"
              >
                OBSERVAÇÕES, HORÁRIOS & TURNO DE TRABALHO:
              </label>
              <textarea
                id="staff-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Turno das 07h às 15h20. Escala 6x1. Responsável pelo café da manhã..."
                className="w-full border border-black p-2 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-black space-y-2">
              <button
                id="staff-btn-submit"
                type="submit"
                className="w-full py-2 bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
              >
                {selectedEmployeeId
                  ? '💾 SALVAR ALTERAÇÕES DO FUNCIONÁRIO'
                  : '➕ CADASTRAR FUNCIONÁRIO'}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex-1 py-1.5 border border-black bg-white hover:bg-[#FFFFCC] font-bold text-xs cursor-pointer"
                >
                  LIMPAR FORMULÁRIO
                </button>

                {selectedEmployeeId && (
                  <button
                    type="button"
                    onClick={() => {
                      const emp = employees.find((e) => e.id === selectedEmployeeId);
                      if (emp) handleDeleteSelected(emp);
                    }}
                    className="py-1.5 px-3 border border-black bg-red-600 text-white hover:bg-red-700 font-bold text-xs cursor-pointer"
                  >
                    EXCLUIR
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ================= MODAL: GERENCIAR LOCAIS DE TRABALHO ================= */}
      {showWorkplacesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]">
            {/* Modal Title */}
            <div className="bg-[#FFFFCC] border-b-2 border-black p-2.5 flex items-center justify-between shrink-0">
              <span className="font-bold text-sm">
                ⚙ GERENCIAR LOCAIS DE TRABALHO / SETORES
              </span>
              <button
                type="button"
                onClick={() => setShowWorkplacesModal(false)}
                className="w-6 h-6 border border-black bg-white hover:bg-red-500 hover:text-white font-bold cursor-pointer flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="border border-black p-3 bg-gray-50 space-y-2">
                <span className="font-bold block text-xs">
                  DIGITAR NOVO LOCAL DE TRABALHO:
                </span>
                <p className="text-[11px] text-gray-700">
                  Cadastre aqui setores como <strong>Cozinha</strong>, <strong>Recepção</strong>,{' '}
                  <strong>Governança</strong>, <strong>Manutenção</strong>, <strong>Restaurante</strong>, etc.
                  Eles ficarão automaticamente disponíveis para seleção no cadastro de funcionários.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={modalWorkplaceName}
                    onChange={(e) => setModalWorkplaceName(e.target.value)}
                    placeholder="Ex: Cozinha, Recepção, Bar da Piscina..."
                    className="flex-1 border border-black px-2 h-8 bg-white focus:bg-[#FFFFCC] focus:outline-none text-xs font-bold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddModalWorkplace();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddModalWorkplace}
                    className="px-4 h-8 bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0"
                  >
                    + ADICIONAR
                  </button>
                </div>
              </div>

              {/* List of Registered Workplaces */}
              <div className="space-y-2">
                <span className="font-bold block text-xs">
                  LOCAIS CADASTRADOS ({workplaces.length}):
                </span>
                <div className="border border-black divide-y divide-gray-200 max-h-60 overflow-y-auto">
                  {workplaces.map((wp) => {
                    const countAssigned = employees.filter((e) => e.workplace === wp).length;

                    return (
                      <div
                        key={wp}
                        className="p-2 flex items-center justify-between hover:bg-[#FFFFCC]"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs">📍 {wp}</span>
                          <span className="text-[10px] bg-gray-200 border border-black px-1.5 py-0.2">
                            {countAssigned} funcionário(s)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWorkplaceClick(wp)}
                          className="px-2 py-0.5 border border-black bg-white hover:bg-red-600 hover:text-white text-[10px] font-bold cursor-pointer"
                          title="Excluir este local de trabalho"
                        >
                          EXCLUIR
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-black p-2 bg-gray-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowWorkplacesModal(false)}
                className="px-4 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer"
              >
                CONCLUÍDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TXT REPORT / FICHA INDIVIDUAL ================= */}
      {txtModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black w-full max-w-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
            <div className="bg-[#FFFFCC] border-b-2 border-black p-2.5 flex items-center justify-between shrink-0">
              <span className="font-bold text-xs truncate max-w-lg">
                📄 {txtModalData.title}
              </span>
              <button
                type="button"
                onClick={() => setTxtModalData(null)}
                className="w-6 h-6 border border-black bg-white hover:bg-red-500 hover:text-white font-bold cursor-pointer flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
              <textarea
                readOnly
                value={txtModalData.content}
                className="w-full flex-1 border border-black p-3 bg-white font-mono text-xs leading-relaxed select-all resize-none focus:outline-none"
              />
            </div>

            <div className="border-t border-black p-2.5 bg-gray-100 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <div className="text-[11px] text-gray-700">
                Arquivo de texto puro compatível com Bloco de Notas (Notepad do Windows).
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyTxt}
                  className="px-3 py-1 border border-black bg-white hover:bg-[#FFFFCC] font-bold text-xs cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  {txtCopied ? '✓ COPIADO COM SUCESSO!' : 'COPIAR TEXTO'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-3 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  BAIXAR ARQUIVO .TXT
                </button>

                <button
                  type="button"
                  onClick={() => setTxtModalData(null)}
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
