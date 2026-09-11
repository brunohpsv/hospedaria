import React, { useState, useMemo } from 'react';
import { InventoryItem, StockExitRecord, Employee, Room } from '../types';
import { useDialog } from '../lib/dialogContext';
import {
  Package,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Edit2,
  FileText,
  RotateCcw,
  CheckCircle2,
  Boxes,
} from 'lucide-react';

interface InventoryManagementProps {
  items: InventoryItem[];
  stockExits: StockExitRecord[];
  employees: Employee[];
  rooms: Room[];
  establishmentName?: string;
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onRegisterExit: (exit: StockExitRecord, updatedItemQuantity: number) => void;
  onCancelExit: (exitId: string, itemId: string, returnQuantity: number) => void;
  searchQuery?: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  items,
  stockExits,
  employees,
  rooms,
  establishmentName = 'HOTEL / ESTABELECIMENTO',
  onSaveItem,
  onDeleteItem,
  onRegisterExit,
  onCancelExit,
  searchQuery = '',
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Sub-tabs: 'items' (Itens em Estoque) or 'saidas' (Saída de Estoque)
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'saidas'>('items');

  // Filter states
  const [internalSearch, setInternalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'normal'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [preselectedItemIdForExit, setPreselectedItemIdForExit] = useState<string>('');

  // Form states for Item (Novo / Edição) - Quantidade Mínima absoluta (sem porcentagem e sem quantidade alvo)
  const [itemForm, setItemForm] = useState({
    code: '',
    product: '',
    brandModel: '',
    quantity: 10,
    minQuantity: 5,
    lastPurchasePrice: 0,
    unit: 'un',
    category: 'Geral',
    notes: '',
  });

  // Form states for Saída
  const [exitForm, setExitForm] = useState({
    itemId: '',
    quantity: 1,
    destination: '',
    responsibleName: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    notes: '',
  });

  // Reset item form
  const handleOpenNewItemModal = () => {
    setEditingItem(null);
    setItemForm({
      code: `PROD-${String(items.length + 1).padStart(3, '0')}`,
      product: '',
      brandModel: '',
      quantity: 10,
      minQuantity: 5,
      lastPurchasePrice: 0,
      unit: 'un',
      category: 'Frigobar & Bebidas',
      notes: '',
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      product: item.product,
      brandModel: item.brandModel,
      quantity: item.quantity,
      minQuantity: item.minQuantity ?? 5,
      lastPurchasePrice: item.lastPurchasePrice,
      unit: item.unit || 'un',
      category: item.category || 'Geral',
      notes: item.notes || '',
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemForm.code.trim()) {
      showAlert('Informe o código do produto.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!itemForm.product.trim()) {
      showAlert('Informe o nome do produto.', 'CAMPO OBRIGATÓRIO');
      return;
    }
    if (!itemForm.brandModel.trim()) {
      showAlert('Informe a marca e o modelo do produto.', 'CAMPO OBRIGATÓRIO');
      return;
    }

    const saved: InventoryItem = {
      id: editingItem ? editingItem.id : `inv-${Date.now()}`,
      code: itemForm.code.trim().toUpperCase(),
      product: itemForm.product.trim(),
      brandModel: itemForm.brandModel.trim(),
      quantity: Math.max(0, Number(itemForm.quantity) || 0),
      minQuantity: Math.max(0, Number(itemForm.minQuantity) || 0),
      lastPurchasePrice: Math.max(0, Number(itemForm.lastPurchasePrice) || 0),
      unit: itemForm.unit.trim() || 'un',
      category: itemForm.category.trim() || 'Geral',
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      notes: itemForm.notes.trim(),
    };

    onSaveItem(saved);
    setIsItemModalOpen(false);
    showAlert(
      `Produto "${saved.product}" (${saved.code}) salvo com sucesso!`,
      editingItem ? 'PRODUTO ATUALIZADO' : 'NOVO PRODUTO CADASTRADO'
    );
  };

  const handleDeleteItemClick = (item: InventoryItem) => {
    showConfirm({
      title: 'EXCLUIR PRODUTO DO ESTOQUE',
      message: `Deseja realmente excluir o produto do estoque:\n\nCódigo: ${item.code}\nProduto: ${item.product}\nMarca/Modelo: ${item.brandModel}\nQuantidade Atual: ${item.quantity} ${item.unit || 'un'}\n\nEsta ação não poderá ser desfeita.`,
      type: 'danger',
      confirmText: '[ SIM, EXCLUIR ]',
      cancelText: '[ CANCELAR ]',
      onConfirm: () => {
        onDeleteItem(item.id);
        showAlert(`Produto "${item.product}" excluído do estoque.`, 'ITEM EXCLUÍDO');
      },
    });
  };

  // Open Saída modal
  const handleOpenExitModal = (itemId?: string) => {
    const selectedId = itemId || (items.length > 0 ? items[0].id : '');
    setPreselectedItemIdForExit(selectedId);
    setExitForm({
      itemId: selectedId,
      quantity: 1,
      destination: rooms.length > 0 ? `Quarto ${rooms[0].number}` : 'Recepção',
      responsibleName: employees.length > 0 ? employees[0].name : '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      notes: '',
    });
    setIsExitModalOpen(true);
  };

  const handleRegisterExitSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetItem = items.find((i) => i.id === exitForm.itemId);
    if (!targetItem) {
      showAlert('Selecione um produto válido para dar saída.', 'ERRO');
      return;
    }

    const qtyToExit = Number(exitForm.quantity);
    if (isNaN(qtyToExit) || qtyToExit <= 0) {
      showAlert('Informe uma quantidade de saída maior que zero.', 'QUANTIDADE INVÁLIDA');
      return;
    }

    if (qtyToExit > targetItem.quantity) {
      showAlert(
        `A quantidade informada (${qtyToExit} ${targetItem.unit || 'un'}) é maior que a disponível em estoque (${targetItem.quantity} ${targetItem.unit || 'un'}).\n\nPor favor, ajuste o valor para continuar.`,
        'ESTOQUE INSUFICIENTE'
      );
      return;
    }

    if (!exitForm.destination.trim()) {
      showAlert('Informe o destino ou motivo da saída (ex: Quarto 102, Cozinha, etc.).', 'DESTINO OBRIGATÓRIO');
      return;
    }

    if (!exitForm.responsibleName.trim()) {
      showAlert('Informe o responsável pela retirada da mercadoria.', 'RESPONSÁVEL OBRIGATÓRIO');
      return;
    }

    const newQuantity = targetItem.quantity - qtyToExit;
    const nowIso = new Date().toISOString();

    const exitRecord: StockExitRecord = {
      id: `exit-${Date.now()}`,
      itemId: targetItem.id,
      itemCode: targetItem.code,
      productName: targetItem.product,
      brandModel: targetItem.brandModel,
      quantity: qtyToExit,
      destination: exitForm.destination.trim(),
      responsibleName: exitForm.responsibleName.trim(),
      date: exitForm.date,
      time: exitForm.time,
      notes: exitForm.notes.trim(),
      createdAt: nowIso,
    };

    onRegisterExit(exitRecord, newQuantity);
    setIsExitModalOpen(false);

    // Check if new quantity fell at or below minQuantity alert threshold
    const minQty = targetItem.minQuantity ?? 0;
    const isNowCritical = newQuantity <= minQty;

    if (isNowCritical) {
      showAlert(
        `Saída de ${qtyToExit} ${targetItem.unit || 'un'} registrada!\n\nATENÇÃO: O item "${targetItem.product}" atingiu nível crítico (${newQuantity} ${targetItem.unit || 'un'}, no limite mínimo de ${minQty} ${targetItem.unit || 'un'}).\nEle foi movido para o topo da lista em destaque vermelho claro.`,
        '⚠️ ESTOQUE CRÍTICO'
      );
    } else {
      showAlert(
        `Saída de ${qtyToExit} ${targetItem.unit || 'un'} de "${targetItem.product}" registrada com sucesso para "${exitRecord.destination}".`,
        'SAÍDA REGISTRADA'
      );
    }
  };

  // Cancel / Revert a stock exit
  const handleCancelExitClick = (exit: StockExitRecord) => {
    showConfirm({
      title: 'ESTORNAR SAÍDA DE ESTOQUE',
      message: `Deseja realmente estornar esta saída:\n\nProduto: ${exit.productName} (${exit.itemCode})\nQuantidade: ${exit.quantity}\nDestino: ${exit.destination}\nData: ${exit.date} ${exit.time}\n\nA quantidade baixada (${exit.quantity}) será devolvida ao estoque do produto.`,
      type: 'confirm',
      confirmText: '[ SIM, ESTORNAR ]',
      cancelText: '[ CANCELAR ]',
      onConfirm: () => {
        onCancelExit(exit.id, exit.itemId, exit.quantity);
        showAlert(`Saída estornada! ${exit.quantity} unidade(s) retornaram ao estoque.`, 'ESTORNO REALIZADO');
      },
    });
  };

  // Calculate status for each item:
  // "quando estiver abaixo de X (quantidade mínima) deve ficar em primeiro lugar na lista em vermelho claro"
  const itemsWithComputedStatus = useMemo(() => {
    return items.map((item) => {
      const minQty = typeof item.minQuantity === 'number' ? item.minQuantity : 0;
      const isBelowAlert = item.quantity <= minQty;

      return {
        ...item,
        minQuantity: minQty,
        isBelowAlert,
      };
    });
  }, [items]);

  // Sort items: Items below minQuantity MUST appear at the very first place (em primeiro lugar na lista)!
  const sortedItems = useMemo(() => {
    const sorted = [...itemsWithComputedStatus];
    sorted.sort((a, b) => {
      // 1. Items below or at alert threshold come first
      if (a.isBelowAlert && !b.isBelowAlert) return -1;
      if (!a.isBelowAlert && b.isBelowAlert) return 1;

      // 2. Among items in alert, sort by lowest quantity first (most urgent)
      if (a.isBelowAlert && b.isBelowAlert) {
        return a.quantity - b.quantity;
      }

      // 3. Normal items sorted alphabetically by product name
      return a.product.localeCompare(b.product);
    });
    return sorted;
  }, [itemsWithComputedStatus]);

  // Filter items by search query and category
  const filteredItems = useMemo(() => {
    const effectiveSearch = (searchQuery || internalSearch).toLowerCase().trim();

    return sortedItems.filter((item) => {
      // Status filter
      if (statusFilter === 'alert' && !item.isBelowAlert) return false;
      if (statusFilter === 'normal' && item.isBelowAlert) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Text search
      if (!effectiveSearch) return true;

      return (
        item.code.toLowerCase().includes(effectiveSearch) ||
        item.product.toLowerCase().includes(effectiveSearch) ||
        item.brandModel.toLowerCase().includes(effectiveSearch) ||
        (item.category || '').toLowerCase().includes(effectiveSearch) ||
        (item.notes || '').toLowerCase().includes(effectiveSearch)
      );
    });
  }, [sortedItems, searchQuery, internalSearch, statusFilter, categoryFilter]);

  // Filter stock exits
  const filteredExits = useMemo(() => {
    const effectiveSearch = (searchQuery || internalSearch).toLowerCase().trim();

    return stockExits.filter((exit) => {
      if (!effectiveSearch) return true;
      return (
        exit.itemCode.toLowerCase().includes(effectiveSearch) ||
        exit.productName.toLowerCase().includes(effectiveSearch) ||
        exit.brandModel.toLowerCase().includes(effectiveSearch) ||
        exit.destination.toLowerCase().includes(effectiveSearch) ||
        exit.responsibleName.toLowerCase().includes(effectiveSearch) ||
        exit.date.includes(effectiveSearch) ||
        (exit.notes || '').toLowerCase().includes(effectiveSearch)
      );
    });
  }, [stockExits, searchQuery, internalSearch]);

  // Categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  // Summary counts
  const totalItemsCount = items.length;
  const alertItemsCount = itemsWithComputedStatus.filter((i) => i.isBelowAlert).length;
  const totalStockUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalStockValue = items.reduce((sum, i) => sum + i.quantity * i.lastPurchasePrice, 0);
  const totalExitsCount = stockExits.length;
  const totalExitedUnits = stockExits.reduce((sum, e) => sum + e.quantity, 0);

  // Generate TXT Dossier / Report
  const handleDownloadTxtReport = () => {
    const now = new Date().toLocaleString('pt-BR');

    let report = `================================================================================
             RELATÓRIO DE ESTOQUE & MOVIMENTAÇÕES DE ALMOXARIFADO
================================================================================
ESTABELECIMENTO: ${establishmentName.toUpperCase()}
DATA DE EMISSÃO: ${now}
TOTAL DE PRODUTOS CADASTRADOS: ${totalItemsCount}
PRODUTOS EM NÍVEL CRÍTICO (QUANTIDADE <= MÍNIMO): ${alertItemsCount}
VALOR TOTAL ESTIMADO DO ESTOQUE: ${totalStockValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
TOTAL DE SAÍDAS REGISTRADAS: ${totalExitsCount} (${totalExitedUnits} unidades baixadas)

--------------------------------------------------------------------------------
1. ITENS EM NÍVEL CRÍTICO (PRIORIDADE NO TOPO DA LISTA - REPOSIÇÃO IMEDIATA)
--------------------------------------------------------------------------------
`;

    const criticalItems = itemsWithComputedStatus.filter((i) => i.isBelowAlert);
    if (criticalItems.length === 0) {
      report += `Nenhum item em nível crítico no momento. Todo o estoque está acima da quantidade mínima.\n\n`;
    } else {
      report += `CÓDIGO   | PRODUTO                             | MARCA E MODELO               | QTD | MÍNIMO | ÚLTIMA COMPRA\n`;
      report += `---------+-------------------------------------+------------------------------+-----+--------+--------------\n`;
      criticalItems.forEach((it) => {
        const cod = it.code.padEnd(8).substring(0, 8);
        const prod = it.product.padEnd(35).substring(0, 35);
        const brand = it.brandModel.padEnd(28).substring(0, 28);
        const qty = `${it.quantity} ${it.unit || 'un'}`.padStart(5);
        const minQ = `${it.minQuantity} ${it.unit || 'un'}`.padStart(6);
        const price = it.lastPurchasePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).padStart(13);
        report += `${cod} | ${prod} | ${brand} | ${qty} | ${minQ} | ${price}\n`;
      });
      report += `\n`;
    }

    report += `--------------------------------------------------------------------------------
2. RELAÇÃO COMPLETA DE ITENS EM ESTOQUE
--------------------------------------------------------------------------------
CÓDIGO   | PRODUTO                             | MARCA E MODELO               | QTD | MÍNIMO | PREÇO COMPRA | STATUS
---------+-------------------------------------+------------------------------+-----+--------+--------------+--------------
`;
    sortedItems.forEach((it) => {
      const cod = it.code.padEnd(8).substring(0, 8);
      const prod = it.product.padEnd(35).substring(0, 35);
      const brand = it.brandModel.padEnd(28).substring(0, 28);
      const qty = `${it.quantity} ${it.unit || 'un'}`.padStart(5);
      const minQ = `${it.minQuantity} ${it.unit || 'un'}`.padStart(6);
      const price = it.lastPurchasePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).padStart(12);
      const st = it.isBelowAlert ? '🚨 CRÍTICO' : 'OK NORMAL';
      report += `${cod} | ${prod} | ${brand} | ${qty} | ${minQ} | ${price} | ${st}\n`;
    });

    report += `\n--------------------------------------------------------------------------------
3. HISTÓRICO DE SAÍDAS (BAIXAS REGISTRADAS)
--------------------------------------------------------------------------------
DATA       HORA  | CÓDIGO   | PRODUTO                        | QTD | DESTINO / LOCAL          | RESPONSÁVEL
-----------------+----------+--------------------------------+-----+--------------------------+-----------------------
`;

    if (stockExits.length === 0) {
      report += `Nenhuma saída registrada no período.\n`;
    } else {
      stockExits.forEach((ex) => {
        const dt = `${ex.date} ${ex.time}`.padEnd(16).substring(0, 16);
        const cod = ex.itemCode.padEnd(8).substring(0, 8);
        const prod = ex.productName.padEnd(30).substring(0, 30);
        const qty = String(ex.quantity).padStart(3);
        const dest = ex.destination.padEnd(24).substring(0, 24);
        const resp = ex.responsibleName.padEnd(21).substring(0, 21);
        report += `${dt} | ${cod} | ${prod} | ${qty} | ${dest} | ${resp}\n`;
      });
    }

    report += `\n================================================================================
                 DOCUMENTO EMITIDO PELO SISTEMA DE GESTÃO HOTELEIRA
================================================================================`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESTOQUE_${establishmentName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white font-mono select-none overflow-hidden">
      {/* Top Banner with Stats & Controls - Clean Monochrome Notepad Style */}
      <div className="bg-white border-b border-black p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="bg-black text-white p-1.5 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-black flex items-center gap-2">
              <span>CONTROLE DE ESTOQUE & ALMOXARIFADO</span>
              {alertItemsCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 border border-black flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {alertItemsCount} {alertItemsCount === 1 ? 'ITEM EM ALERTA' : 'ITENS EM ALERTA'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-600">
              Gestão de produtos, compras, saídas para acomodações e reposição de materiais
            </div>
          </div>
        </div>

        {/* Action Buttons - Clean Minimalist Windows Style */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenNewItemModal}
            className="px-2.5 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ NOVO PRODUTO</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenExitModal()}
            className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Registrar saída / baixa de mercadoria do estoque"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>📤 REGISTRAR SAÍDA</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxtReport}
            className="px-2.5 py-1 border border-black bg-white hover:bg-black hover:text-white font-bold text-xs cursor-pointer flex items-center gap-1 transition-colors"
            title="Baixar relatório completo do estoque em formato Bloco de Notas TXT"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>RELATÓRIO TXT</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation (Tabs: Itens em Estoque vs Saída) */}
      <div className="bg-gray-100 border-b border-black px-2 py-1 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('items')}
            className={`px-3 py-1 border border-black font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'items'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>ITENS EM ESTOQUE ({totalItemsCount})</span>
            {alertItemsCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1 py-0 font-bold ml-1">
                {alertItemsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('saidas')}
            className={`px-3 py-1 border border-black font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'saidas'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>SAÍDA ({totalExitsCount})</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Internal text search if not provided via header */}
          <div className="flex items-center border border-black bg-white px-2 py-0.5">
            <Search className="w-3 h-3 text-gray-500 mr-1" />
            <input
              type="text"
              placeholder={activeSubTab === 'items' ? 'Buscar código, produto, marca...' : 'Buscar saídas, quartos, destino...'}
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              className="outline-none text-xs w-44 md:w-56 bg-transparent placeholder-gray-400"
            />
            {internalSearch && (
              <button
                type="button"
                onClick={() => setInternalSearch('')}
                className="text-gray-400 hover:text-black font-bold text-xs ml-1"
              >
                ×
              </button>
            )}
          </div>

          {activeSubTab === 'items' && (
            <>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-black bg-white px-2 py-0.5 text-xs outline-none cursor-pointer font-bold"
              >
                <option value="all">Todos os Itens ({totalItemsCount})</option>
                <option value="alert">🚨 Em Alerta / Crítico ({alertItemsCount})</option>
                <option value="normal">Normal ({totalItemsCount - alertItemsCount})</option>
              </select>

              {/* Category Filter */}
              {categoriesList.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-black bg-white px-2 py-0.5 text-xs outline-none cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-auto p-2">
        {/* VIEW 1: ITENS EM ESTOQUE */}
        {activeSubTab === 'items' && (
          <div className="border border-black bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white select-none">
                    <th className="p-2 border-r border-gray-700 w-28">STATUS</th>
                    <th className="p-2 border-r border-gray-700 w-24">CÓDIGO</th>
                    <th className="p-2 border-r border-gray-700">PRODUTO</th>
                    <th className="p-2 border-r border-gray-700">MARCA E MODELO</th>
                    <th className="p-2 border-r border-gray-700 text-center w-28">QUANTIDADE</th>
                    <th className="p-2 border-r border-gray-700 text-center w-28">LIMITE ALERTA</th>
                    <th className="p-2 border-r border-gray-700 text-right w-32">ÚLTIMA COMPRA</th>
                    <th className="p-2 border-r border-gray-700 text-right w-28">VALOR TOTAL</th>
                    <th className="p-2 text-center w-36">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 bg-gray-50">
                        <div className="max-w-md mx-auto space-y-2">
                          <Package className="w-8 h-8 mx-auto text-gray-400" />
                          <div className="font-bold text-black text-sm">Nenhum produto localizado</div>
                          <div className="text-xs">
                            {searchQuery || internalSearch
                              ? 'Nenhum resultado corresponde aos filtros aplicados.'
                              : 'Cadastre os primeiros produtos do estoque para gerenciar materiais e amenidades.'}
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenNewItemModal}
                            className="mt-2 px-3 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cadastrar Primeiro Produto</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isAlert = item.isBelowAlert;
                      const totalItemValue = item.quantity * item.lastPurchasePrice;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isAlert
                              ? 'bg-red-100 hover:bg-red-200 border-b border-red-300 text-red-950 font-medium'
                              : 'bg-white hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          {/* STATUS & ALERTA - VERMELHO CLARO SE QUANTIDADE <= LIMITE */}
                          <td className="p-2 border-r border-gray-300">
                            {isAlert ? (
                              <span
                                className="inline-flex items-center gap-1 bg-red-600 text-white font-bold text-[10px] px-1.5 py-0.5 border border-red-800"
                                title={`ATENÇÃO: Quantidade atual (${item.quantity}) está abaixo ou igual ao limite de alerta (${item.minQuantity})!`}
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>🚨 CRÍTICO</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 border border-emerald-400"
                                title={`Estoque normal (${item.quantity} > ${item.minQuantity})`}
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>NORMAL</span>
                              </span>
                            )}
                          </td>

                          {/* CÓDIGO */}
                          <td className="p-2 border-r border-gray-300 font-bold text-xs tracking-wider">
                            <span className="bg-black/5 px-1.5 py-0.5 border border-black/20 select-all">
                              {item.code}
                            </span>
                          </td>

                          {/* PRODUTO */}
                          <td className="p-2 border-r border-gray-300 font-bold">
                            <div>{item.product}</div>
                            {item.category && (
                              <span className="text-[10px] text-gray-500 uppercase font-normal">
                                {item.category}
                              </span>
                            )}
                          </td>

                          {/* MARCA E MODELO */}
                          <td className="p-2 border-r border-gray-300">
                            <div className="text-gray-800">{item.brandModel}</div>
                          </td>

                          {/* QUANTIDADE ATUAL */}
                          <td className="p-2 border-r border-gray-300 text-center">
                            <div className="font-bold text-sm">
                              {item.quantity}{' '}
                              <span className="text-[10px] font-normal text-gray-600">
                                {item.unit || 'un'}
                              </span>
                            </div>
                          </td>

                          {/* LIMITE DE ALERTA (QUANTIDADES, NÃO PORCENTAGENS) */}
                          <td className="p-2 border-r border-gray-300 text-center">
                            <div className="font-bold text-xs inline-block px-1.5 py-0.5 border border-gray-300 bg-white">
                              ≤ {item.minQuantity} {item.unit || 'un'}
                            </div>
                          </td>

                          {/* PREÇO DA ÚLTIMA COMPRA */}
                          <td className="p-2 border-r border-gray-300 text-right font-bold text-xs">
                            {item.lastPurchasePrice.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </td>

                          {/* TOTAL ESTIMADO EM ESTOQUE */}
                          <td className="p-2 border-r border-gray-300 text-right text-xs">
                            <span className="font-bold">
                              {totalItemValue.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </span>
                          </td>

                          {/* AÇÕES */}
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenExitModal(item.id)}
                                className="px-2 py-0.5 border border-black bg-white hover:bg-black hover:text-white font-bold text-[10px] cursor-pointer transition-colors"
                                title="Dar saída neste item"
                              >
                                [ Saída ]
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditItemModal(item)}
                                className="p-1 border border-black bg-white hover:bg-gray-200 cursor-pointer"
                                title="Editar produto e limite de alerta"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItemClick(item)}
                                className="p-1 border border-black bg-white hover:bg-red-600 hover:text-white cursor-pointer"
                                title="Excluir produto"
                              >
                                <Trash2 className="w-3 h-3" />
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

        {/* VIEW 2: SAÍDA DE ESTOQUE (ORGANIZAÇÃO DE SAÍDAS) */}
        {activeSubTab === 'saidas' && (
          <div className="space-y-3">
            {/* Header of Saída section */}
            <div className="border border-black bg-white p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-black flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-gray-800" />
                  <span>REGISTRO E ORGANIZAÇÃO DE SAÍDAS DO ESTOQUE</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Aqui ficam organizadas todas as saídas e baixas para quartos, frigobares, áreas comuns e reposição.
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenExitModal()}
                className="px-3 py-1 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ REGISTRAR NOVA SAÍDA</span>
              </button>
            </div>

            {/* Table of Saídas */}
            <div className="border border-black bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black text-white select-none">
                      <th className="p-2 border-r border-gray-700 w-36">DATA & HORA</th>
                      <th className="p-2 border-r border-gray-700 w-24">CÓDIGO</th>
                      <th className="p-2 border-r border-gray-700">PRODUTO</th>
                      <th className="p-2 border-r border-gray-700">MARCA E MODELO</th>
                      <th className="p-2 border-r border-gray-700 text-center w-24">QTD SAÍDA</th>
                      <th className="p-2 border-r border-gray-700">DESTINO / LOCAL</th>
                      <th className="p-2 border-r border-gray-700">RESPONSÁVEL</th>
                      <th className="p-2 border-r border-gray-700">OBSERVAÇÕES</th>
                      <th className="p-2 text-center w-28">ESTORNAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {filteredExits.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500 bg-gray-50">
                          <ArrowUpRight className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <div className="font-bold text-black text-sm">Nenhuma saída de estoque registrada</div>
                          <div className="text-xs mt-1">
                            Clique em "+ REGISTRAR NOVA SAÍDA" para baixar itens para quartos, reposição ou consumo.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredExits.map((exit) => (
                        <tr key={exit.id} className="hover:bg-gray-50 transition-colors">
                          {/* DATA E HORA */}
                          <td className="p-2 border-r border-gray-300 whitespace-nowrap">
                            <span className="font-bold">{exit.date}</span>{' '}
                            <span className="text-gray-500 text-[11px]">{exit.time}</span>
                          </td>

                          {/* CÓDIGO */}
                          <td className="p-2 border-r border-gray-300 font-bold text-xs">
                            <span className="bg-black/5 px-1 py-0.5 border border-black/20">
                              {exit.itemCode}
                            </span>
                          </td>

                          {/* PRODUTO */}
                          <td className="p-2 border-r border-gray-300 font-bold">
                            {exit.productName}
                          </td>

                          {/* MARCA E MODELO */}
                          <td className="p-2 border-r border-gray-300 text-gray-700">
                            {exit.brandModel}
                          </td>

                          {/* QTD SAÍDA */}
                          <td className="p-2 border-r border-gray-300 text-center font-bold text-sm text-red-900 bg-red-50">
                            - {exit.quantity}
                          </td>

                          {/* DESTINO / LOCAL */}
                          <td className="p-2 border-r border-gray-300 font-bold">
                            <span className="bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                              {exit.destination}
                            </span>
                          </td>

                          {/* RESPONSÁVEL */}
                          <td className="p-2 border-r border-gray-300 text-gray-800">
                            {exit.responsibleName}
                          </td>

                          {/* OBSERVAÇÕES */}
                          <td className="p-2 border-r border-gray-300 text-gray-600 text-[11px] italic">
                            {exit.notes || '—'}
                          </td>

                          {/* ESTORNAR */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleCancelExitClick(exit)}
                              className="px-2 py-0.5 border border-black bg-white hover:bg-black hover:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                              title="Estornar esta saída e devolver a quantidade ao estoque"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Estornar</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="bg-white border-t border-black p-2 flex flex-wrap items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center space-x-4 flex-wrap">
          <div>
            PRODUTOS: <span className="font-bold">{totalItemsCount}</span>
          </div>
          <span className="text-gray-400">|</span>
          <div>
            TOTAL EM ESTOQUE: <span className="font-bold">{totalStockUnits} un</span>
          </div>
          <span className="text-gray-400">|</span>
          <div>
            VALOR TOTAL ESTIMADO:{' '}
            <span className="font-bold text-emerald-800">
              {totalStockValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <span className="text-gray-400">|</span>
          <div>
            TOTAL DE SAÍDAS:{' '}
            <span className="font-bold text-gray-900">
              {totalExitsCount} ({totalExitedUnits} un)
            </span>
          </div>
        </div>

        <div className="text-[11px] text-gray-600 italic">
          * Itens com quantidade igual ou abaixo do limite de alerta ficam no topo da lista destacados em vermelho claro.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRAR / EDITAR PRODUTO */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 font-mono select-none">
          <div className="bg-white border-2 border-black w-full max-w-lg max-h-[92vh] flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Title Bar */}
            <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center space-x-2">
                <Package className="w-3.5 h-3.5" />
                <span>
                  {editingItem ? 'EDITAR_PRODUTO_ESTOQUE.TXT' : 'NOVO_CADASTRO_PRODUTO_ESTOQUE.TXT'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-white hover:bg-red-600 px-2 py-0.5 border border-white cursor-pointer"
              >
                [ X ]
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveItemSubmit} className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Código */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    CÓDIGO <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    placeholder="Ex: BEB-01"
                    className="w-full border border-black p-1.5 bg-white font-bold uppercase outline-none"
                  />
                </div>

                {/* Categoria */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">CATEGORIA</label>
                  <input
                    type="text"
                    list="categories-datalist"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    placeholder="Ex: Frigobar & Bebidas, Limpeza, Rouparia..."
                    className="w-full border border-black p-1.5 bg-white outline-none"
                  />
                  <datalist id="categories-datalist">
                    <option value="Frigobar & Bebidas" />
                    <option value="Higiene & Amenities" />
                    <option value="Rouparia & Enxoval" />
                    <option value="Limpeza & Lavanderia" />
                    <option value="Alimentos & Café da Manhã" />
                    <option value="Manutenção & Reparos" />
                    <option value="Papelaria & Recepção" />
                  </datalist>
                </div>
              </div>

              {/* Produto */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  PRODUTO <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={itemForm.product}
                  onChange={(e) => setItemForm({ ...itemForm, product: e.target.value })}
                  placeholder="Ex: Água Mineral 500ml Sem Gás"
                  className="w-full border border-black p-1.5 bg-white font-bold outline-none"
                />
              </div>

              {/* Marca e Modelo */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  MARCA E MODELO <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={itemForm.brandModel}
                  onChange={(e) => setItemForm({ ...itemForm, brandModel: e.target.value })}
                  placeholder="Ex: Crystal - Garrafa Pet 500ml"
                  className="w-full border border-black p-1.5 bg-white outline-none"
                />
              </div>

              {/* Quantidade Atual, Quantidade Mínima de Alerta e Unidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-2.5 border border-black">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">QUANTIDADE ATUAL</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                    className="w-full border border-black p-1.5 bg-white font-bold text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-red-900 mb-1" title="Quando o estoque for menor ou igual a este valor, o produto ficará no topo da lista em vermelho">
                    ALERTA (QTD MÍNIMA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={itemForm.minQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, minQuantity: Number(e.target.value) })}
                    className="w-full border border-red-600 p-1.5 bg-white text-sm font-bold text-red-950 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">UNIDADE</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="un, pct, cx, gl, kg"
                    className="w-full border border-black p-1.5 bg-white text-sm outline-none"
                  />
                </div>
              </div>

              {/* Preço da Última Compra */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">PREÇO DA ÚLTIMA COMPRA (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.lastPurchasePrice}
                  onChange={(e) => setItemForm({ ...itemForm, lastPurchasePrice: Number(e.target.value) })}
                  placeholder="0.00"
                  className="w-full border border-black p-1.5 bg-white font-bold text-sm outline-none"
                />
                <div className="text-[10px] text-gray-600 mt-1">Custo unitário da última nota fiscal ou pedido de compra.</div>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">OBSERVAÇÕES / LOCAL DE ARMAZENAMENTO</label>
                <textarea
                  rows={2}
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="Ex: Prateleira B3, depósito da recepção..."
                  className="w-full border border-black p-1.5 bg-white outline-none text-xs resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 border-t border-black flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-3 py-1.5 border border-black bg-white hover:bg-gray-200 font-bold text-xs cursor-pointer"
                >
                  [ CANCELAR ]
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  [ SALVAR PRODUTO ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTRAR SAÍDA DE ESTOQUE */}
      {/* ========================================================================= */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 md:p-4 font-mono select-none">
          <div className="bg-white border-2 border-black w-full max-w-lg max-h-[92vh] flex flex-col shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Title Bar */}
            <div className="bg-black text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>REGISTRAR_SAIDA_DE_ESTOQUE.TXT</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="text-white hover:bg-red-600 px-2 py-0.5 border border-white cursor-pointer"
              >
                [ X ]
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleRegisterExitSubmit} className="p-4 overflow-y-auto space-y-3 text-xs">
              {/* Seleção do Produto */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  SELECIONE O PRODUTO <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={exitForm.itemId}
                  onChange={(e) => setExitForm({ ...exitForm, itemId: e.target.value })}
                  className="w-full border-2 border-black p-2 bg-white font-bold text-xs outline-none cursor-pointer"
                >
                  <option value="">-- Escolha um item do estoque --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.code}] {it.product} - {it.brandModel} (Disponível: {it.quantity} {it.unit || 'un'} | Mín: {it.minQuantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Informações do item selecionado */}
              {(() => {
                const selected = items.find((i) => i.id === exitForm.itemId);
                if (!selected) return null;
                const remaining = selected.quantity - (Number(exitForm.quantity) || 0);
                const willAlert = remaining <= (selected.minQuantity ?? 0);

                return (
                  <div className="bg-gray-50 border border-black p-2.5 space-y-1">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>{selected.product}</span>
                      <span className="bg-black text-white px-1.5 py-0.2 text-[10px]">
                        {selected.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-700">
                      Marca/Modelo: <strong>{selected.brandModel}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-300">
                      <span>
                        Estoque Atual:{' '}
                        <strong>
                          {selected.quantity} {selected.unit || 'un'}
                        </strong>
                      </span>
                      <span>
                        Limite Mínimo:{' '}
                        <strong>
                          {selected.minQuantity} {selected.unit || 'un'}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-300">
                      <span>
                        Ficará com:{' '}
                        <strong className={remaining < 0 ? 'text-red-600 font-bold' : 'text-black'}>
                          {remaining} {selected.unit || 'un'}
                        </strong>
                      </span>
                      {willAlert && (
                        <span className="text-red-600 font-bold text-[10px]">
                          ⚠️ Atingirá o limite de alerta!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Quantidade da Saída */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  QUANTIDADE QUE ESTÁ SAINDO <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={exitForm.quantity}
                  onChange={(e) => setExitForm({ ...exitForm, quantity: Number(e.target.value) })}
                  className="w-full border-2 border-black p-2 bg-white font-bold text-base outline-none"
                />
              </div>

              {/* Destino / Motivo */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  DESTINO / LOCAL / QUARTO <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="destinations-datalist"
                  value={exitForm.destination}
                  onChange={(e) => setExitForm({ ...exitForm, destination: e.target.value })}
                  placeholder="Ex: Quarto 101, Frigobar 204, Cozinha, Recepção..."
                  className="w-full border border-black p-1.5 bg-white font-bold outline-none"
                />
                <datalist id="destinations-datalist">
                  {rooms.map((r) => (
                    <option key={r.id} value={`Quarto ${r.number}`} />
                  ))}
                  {rooms.map((r) => (
                    <option key={`frigo-${r.id}`} value={`Frigobar - Quarto ${r.number}`} />
                  ))}
                  <option value="Recepção" />
                  <option value="Cozinha / Café da Manhã" />
                  <option value="Governança / Limpeza" />
                  <option value="Lavanderia" />
                  <option value="Manutenção Geral" />
                  <option value="Piscina / Área Externa" />
                  <option value="Avaria / Descarte" />
                </datalist>
              </div>

              {/* Responsável pela Retirada */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  RESPONSÁVEL PELA RETIRADA <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="staff-datalist"
                  value={exitForm.responsibleName}
                  onChange={(e) => setExitForm({ ...exitForm, responsibleName: e.target.value })}
                  placeholder="Nome do funcionário ou responsável"
                  className="w-full border border-black p-1.5 bg-white outline-none font-bold"
                />
                <datalist id="staff-datalist">
                  {employees.map((emp) => (
                    <option key={emp.id} value={`${emp.name} (${emp.role})`} />
                  ))}
                </datalist>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">DATA</label>
                  <input
                    type="date"
                    required
                    value={exitForm.date}
                    onChange={(e) => setExitForm({ ...exitForm, date: e.target.value })}
                    className="w-full border border-black p-1.5 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">HORA</label>
                  <input
                    type="time"
                    required
                    value={exitForm.time}
                    onChange={(e) => setExitForm({ ...exitForm, time: e.target.value })}
                    className="w-full border border-black p-1.5 bg-white outline-none"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">OBSERVAÇÕES (OPCIONAL)</label>
                <input
                  type="text"
                  value={exitForm.notes}
                  onChange={(e) => setExitForm({ ...exitForm, notes: e.target.value })}
                  placeholder="Ex: Troca de enxoval a pedido do hóspede..."
                  className="w-full border border-black p-1.5 bg-white outline-none text-xs"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 border-t border-black flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  className="px-3 py-1.5 border border-black bg-white hover:bg-gray-200 font-bold text-xs cursor-pointer"
                >
                  [ CANCELAR ]
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border border-black bg-black text-white hover:bg-gray-800 font-bold text-xs cursor-pointer transition-colors"
                >
                  [ CONFIRMAR SAÍDA ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
