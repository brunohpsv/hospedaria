import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  Room,
  GuestReservation,
  RatePlan,
  RoomStatus,
  ClientAccount,
  Employee,
  InventoryItem,
  StockExitRecord,
} from './types';
import {
  INITIAL_ROOMS,
  INITIAL_GUESTS,
  INITIAL_RATE_PLANS,
  INITIAL_CATEGORIES,
  INITIAL_WORKPLACES,
  INITIAL_EMPLOYEES,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_STOCK_EXITS,
  STARTER_CLEAN_ROOMS,
} from './mockData';
import { WindowHeader } from './components/WindowHeader';
import { GuestRegistration } from './components/GuestRegistration';
import { RoomControl } from './components/RoomControl';
import { RatePlans } from './components/RatePlans';
import { BookingCalendar } from './components/BookingCalendar';
import { StaffManagement } from './components/StaffManagement';
import { InventoryManagement } from './components/InventoryManagement';
import { EstablishmentSettings } from './components/EstablishmentSettings';
import { TxtVoucherModal } from './components/TxtVoucherModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { StatusBar } from './components/StatusBar';
import { AuthPortal } from './components/AuthPortal';
import { SUBSCRIPTION_PLANS, DEMO_CLIENT } from './lib/authConstants';
import { useDialog } from './lib/dialogContext';
import {
  seedClientFirestoreData,
  subscribeRooms,
  subscribeGuests,
  subscribeCategories,
  subscribeRatePlans,
  subscribeWorkplaces,
  subscribeEmployees,
  subscribeInventory,
  subscribeStockExits,
  saveRoomToFirestore,
  deleteRoomFromFirestore,
  saveGuestToFirestore,
  deleteGuestFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveRatePlanToFirestore,
  deleteRatePlanFromFirestore,
  saveWorkplaceToFirestore,
  deleteWorkplaceFromFirestore,
  saveEmployeeToFirestore,
  deleteEmployeeFromFirestore,
  saveInventoryItemToFirestore,
  deleteInventoryItemFromFirestore,
  saveStockExitToFirestore,
  deleteStockExitFromFirestore,
  saveClientToFirestore,
  resetFirestoreDatabase,
  clearAllFirestoreData,
  getAllClientsFromFirestore,
} from './lib/hotelFirebaseService';

const STORAGE_KEYS = {
  CLIENTS: 'hotel_notepad_clients_v2',
  CURRENT_CLIENT: 'hotel_notepad_current_client_v2',
};

// Isolated storage keys per establishment client ID
function getTenantKey(clientId: string, key: string): string {
  return `hotel_notepad_${clientId}_${key}_v2`;
}

export default function App() {
  // Client accounts directory
  const [clients, setClients] = useState<ClientAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return saved ? JSON.parse(saved) : [DEMO_CLIENT];
    } catch {
      return [DEMO_CLIENT];
    }
  });

  // Current authenticated client (Starts as null so initial page is always the login/registration)
  const [currentClient, setCurrentClient] = useState<ClientAccount | null>(null);

  // Dynamic tenant state - strictly scoped to currentClient
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [guests, setGuests] = useState<GuestReservation[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>(INITIAL_RATE_PLANS);
  const [workplaces, setWorkplaces] = useState<string[]>(INITIAL_WORKPLACES);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockExits, setStockExits] = useState<StockExitRecord[]>([]);

  const { showAlert } = useDialog();

  const [activeTab, setActiveTab] = useState<ActiveTab>('hospedes');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Modals
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTxtVoucherOpen, setIsTxtVoucherOpen] = useState(false);
  const [voucherGuest, setVoucherGuest] = useState<GuestReservation | null>(null);
  const [selectedGuestIdForEdit, setSelectedGuestIdForEdit] = useState<string | null>(null);

  // Toast notification helper
  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  // Fetch registered client accounts from Firestore on startup
  useEffect(() => {
    getAllClientsFromFirestore().then((cloudClients) => {
      if (cloudClients && cloudClients.length > 0) {
        setClients((prev) => {
          const merged = [...prev];
          for (const cc of cloudClients) {
            if (!merged.some((m) => m.id === cc.id || m.accessKey === cc.accessKey)) {
              merged.push(cc);
            }
          }
          try {
            localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });
  }, []);

  // Auth Handlers
  const handleLoginSuccess = (client: ClientAccount) => {
    setCurrentClient(client);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CLIENT, JSON.stringify(client));
    } catch {}
    const planName = (client.plan && SUBSCRIPTION_PLANS[client.plan]?.name) || 'Profissional';
    const greetingName = (client.responsibleName || client.establishmentName || 'Usuário').toUpperCase();
    showToast(`BEM-VINDO, ${greetingName}! [PLANO: ${planName.toUpperCase()}]`);
  };

  const handleLogout = () => {
    setCurrentClient(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CLIENT);
    } catch {}
    showToast('Sessão encerrada com sucesso.');
  };

  const handleSaveNewClient = (newClient: ClientAccount) => {
    setClients((prev) => {
      const updated = [newClient, ...prev.filter((c) => c.id !== newClient.id && c.accessKey !== newClient.accessKey)];
      try {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleUpdateClientsList = (updatedList: ClientAccount[]) => {
    setClients(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedList));
    } catch {}
  };

  // Multi-tenancy: load & subscribe strictly to the active client's isolated subcollections
  useEffect(() => {
    if (!currentClient) {
      setRooms([]);
      setGuests([]);
      setEmployees([]);
      return;
    }

    const clientId = currentClient.id;
    const isDemo = clientId === 'client-demo-default';

    // 1. Immediately populate from local cache for instant zero-latency UI
    try {
      const savedRooms = localStorage.getItem(getTenantKey(clientId, 'ROOMS'));
      setRooms(savedRooms ? JSON.parse(savedRooms) : (isDemo ? INITIAL_ROOMS : STARTER_CLEAN_ROOMS));

      const savedGuests = localStorage.getItem(getTenantKey(clientId, 'GUESTS'));
      setGuests(savedGuests ? JSON.parse(savedGuests) : (isDemo ? INITIAL_GUESTS : []));

      const savedCats = localStorage.getItem(getTenantKey(clientId, 'CATEGORIES'));
      setCategories(savedCats ? JSON.parse(savedCats) : INITIAL_CATEGORIES);

      const savedRates = localStorage.getItem(getTenantKey(clientId, 'RATES'));
      setRatePlans(savedRates ? JSON.parse(savedRates) : INITIAL_RATE_PLANS);

      const savedWps = localStorage.getItem(getTenantKey(clientId, 'WORKPLACES'));
      setWorkplaces(savedWps ? JSON.parse(savedWps) : INITIAL_WORKPLACES);

      const savedEmps = localStorage.getItem(getTenantKey(clientId, 'EMPLOYEES'));
      setEmployees(savedEmps ? JSON.parse(savedEmps) : (isDemo ? INITIAL_EMPLOYEES : []));

      const savedInv = localStorage.getItem(getTenantKey(clientId, 'INVENTORY'));
      setInventoryItems(savedInv ? JSON.parse(savedInv) : (isDemo ? INITIAL_INVENTORY_ITEMS : []));

      const savedExits = localStorage.getItem(getTenantKey(clientId, 'STOCK_EXITS'));
      setStockExits(savedExits ? JSON.parse(savedExits) : (isDemo ? INITIAL_STOCK_EXITS : []));
    } catch (err) {
      console.error('Erro ao ler cache local do cliente:', err);
    }

    // 2. Real-time subscriptions to this client's Firestore subcollections
    let unsubRooms: () => void = () => {};
    let unsubGuests: () => void = () => {};
    let unsubCategories: () => void = () => {};
    let unsubRatePlans: () => void = () => {};
    let unsubWorkplaces: () => void = () => {};
    let unsubEmployees: () => void = () => {};
    let unsubInventory: () => void = () => {};
    let unsubStockExits: () => void = () => {};

    const initTenantCloud = async () => {
      try {
        await seedClientFirestoreData(clientId, isDemo);

        unsubRooms = subscribeRooms(
          clientId,
          (fireRooms) => {
            setRooms(fireRooms);
            try {
              localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(fireRooms));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro rooms sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubGuests = subscribeGuests(
          clientId,
          (fireGuests) => {
            setGuests(fireGuests);
            try {
              localStorage.setItem(getTenantKey(clientId, 'GUESTS'), JSON.stringify(fireGuests));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro guests sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubCategories = subscribeCategories(
          clientId,
          (fireCats) => {
            setCategories(fireCats && fireCats.length > 0 ? fireCats : ['Standard']);
            try {
              localStorage.setItem(getTenantKey(clientId, 'CATEGORIES'), JSON.stringify(fireCats));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro categories sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubRatePlans = subscribeRatePlans(
          clientId,
          (fireRates) => {
            setRatePlans(fireRates);
            try {
              localStorage.setItem(getTenantKey(clientId, 'RATES'), JSON.stringify(fireRates));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro ratePlans sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubWorkplaces = subscribeWorkplaces(
          clientId,
          (fireWps) => {
            setWorkplaces(fireWps && fireWps.length > 0 ? fireWps : INITIAL_WORKPLACES);
            try {
              localStorage.setItem(getTenantKey(clientId, 'WORKPLACES'), JSON.stringify(fireWps));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro workplaces sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubEmployees = subscribeEmployees(
          clientId,
          (fireEmps) => {
            setEmployees(fireEmps);
            try {
              localStorage.setItem(getTenantKey(clientId, 'EMPLOYEES'), JSON.stringify(fireEmps));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro employees sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubInventory = subscribeInventory(
          clientId,
          (fireInv) => {
            setInventoryItems(fireInv);
            try {
              localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify(fireInv));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro inventory sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );

        unsubStockExits = subscribeStockExits(
          clientId,
          (fireExits) => {
            setStockExits(fireExits);
            try {
              localStorage.setItem(getTenantKey(clientId, 'STOCK_EXITS'), JSON.stringify(fireExits));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error(`Erro stockExits sync (${clientId}):`, err);
            setIsCloudSynced(false);
          }
        );
      } catch (err) {
        console.error('Falha ao inicializar dados do cliente no Firebase:', err);
        setIsCloudSynced(false);
      }
    };

    initTenantCloud();

    return () => {
      unsubRooms();
      unsubGuests();
      unsubCategories();
      unsubRatePlans();
      unsubWorkplaces();
      unsubEmployees();
      unsubInventory();
      unsubStockExits();
    };
  }, [currentClient?.id]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'F2' || (e.altKey && e.key === '1')) {
        e.preventDefault();
        setActiveTab('hospedes');
      } else if (e.key === 'F3' || (e.altKey && e.key === '2')) {
        e.preventDefault();
        setActiveTab('quartos');
      } else if (e.key === 'F4' || (e.altKey && e.key === '3')) {
        e.preventDefault();
        setActiveTab('valores');
      } else if (e.key === 'F5' || (e.altKey && e.key === '4')) {
        e.preventDefault();
        setActiveTab('calendario');
      } else if (e.key === 'F6' || (e.altKey && e.key === '5')) {
        e.preventDefault();
        setActiveTab('funcionarios');
      } else if (e.key === 'F9' || (e.altKey && e.key === '7')) {
        e.preventDefault();
        setActiveTab('estoque');
      } else if (e.key === 'F8' || (e.altKey && e.key === '6')) {
        e.preventDefault();
        setActiveTab('empresa');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsTxtVoucherOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        showToast('SALVO NO FIREBASE [Ctrl+S]!');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('hospedes');
        setSelectedGuestIdForEdit(null);
        showToast('Novo Cadastro [Ctrl+N]');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('top-search');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, isTxtVoucherOpen, showToast]);

  // Handler: Save / Update Guest (Strictly scoped to current client)
  const handleSaveGuest = async (guest: GuestReservation) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    // Optimistic update
    setGuests((prev) => {
      const exists = prev.some((g) => g.id === guest.id);
      const updated = exists ? prev.map((g) => (g.id === guest.id ? guest : g)) : [guest, ...prev];
      try {
        localStorage.setItem(getTenantKey(clientId, 'GUESTS'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await saveGuestToFirestore(clientId, guest);

      // Update room state in Firestore
      const targetRoom = rooms.find((r) => r.number === guest.roomNumber);
      if (targetRoom && guest.status === 'Hospedado') {
        const updatedRoom: Room = {
          ...targetRoom,
          status: 'ocupado',
          currentGuestId: guest.id,
          currentGuestName: guest.name,
          checkInDate: guest.checkIn,
          checkOutDate: guest.checkOut,
        };
        setRooms((prev) => {
          const u = prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
          try {
            localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
          } catch {}
          return u;
        });
        await saveRoomToFirestore(clientId, updatedRoom);
      }

      // Check if previous room had this guest
      const prevRoom = rooms.find(
        (r) => r.currentGuestId === guest.id && r.number !== guest.roomNumber
      );
      if (prevRoom) {
        const clearedRoom: Room = {
          ...prevRoom,
          status: 'livre',
          currentGuestId: undefined,
          currentGuestName: undefined,
          checkInDate: undefined,
          checkOutDate: undefined,
        };
        setRooms((prev) => {
          const u = prev.map((r) => (r.id === clearedRoom.id ? clearedRoom : r));
          try {
            localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
          } catch {}
          return u;
        });
        await saveRoomToFirestore(clientId, clearedRoom);
      }

      showToast(`HÓSPEDE ${guest.name.toUpperCase()} SALVO COM SUCESSO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR NO FIREBASE!');
    }
  };

  // Handler: Check-out of guest (Strictly scoped to current client)
  const handleCheckOutGuest = async (guestId: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const target = guests.find((g) => g.id === guestId);
    if (!target) return;

    const updatedGuest: GuestReservation = { ...target, status: 'Check-out' };
    setGuests((prev) => {
      const u = prev.map((g) => (g.id === guestId ? updatedGuest : g));
      try {
        localStorage.setItem(getTenantKey(clientId, 'GUESTS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveGuestToFirestore(clientId, updatedGuest);

      const targetRoom = rooms.find(
        (r) => r.number === target.roomNumber || r.currentGuestId === guestId
      );
      if (targetRoom) {
        const cleaningRoom: Room = {
          ...targetRoom,
          status: 'limpeza',
          currentGuestId: undefined,
          currentGuestName: undefined,
          checkInDate: undefined,
          checkOutDate: undefined,
        };
        setRooms((prev) => {
          const u = prev.map((r) => (r.id === cleaningRoom.id ? cleaningRoom : r));
          try {
            localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
          } catch {}
          return u;
        });
        await saveRoomToFirestore(clientId, cleaningRoom);
      }

      showToast(`CHECK-OUT REALIZADO! QUARTO EM LIMPEZA`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO PROCESSAR CHECK-OUT NO FIREBASE!');
    }
  };

  // Handler: Delete guest (Strictly scoped to current client)
  const handleDeleteGuest = async (guestId: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    setGuests((prev) => {
      const u = prev.filter((g) => g.id !== guestId);
      try {
        localStorage.setItem(getTenantKey(clientId, 'GUESTS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await deleteGuestFromFirestore(clientId, guestId);

      const relatedRoom = rooms.find((r) => r.currentGuestId === guestId);
      if (relatedRoom) {
        const freedRoom: Room = {
          ...relatedRoom,
          status: 'livre',
          currentGuestId: undefined,
          currentGuestName: undefined,
          checkInDate: undefined,
          checkOutDate: undefined,
        };
        setRooms((prev) => {
          const u = prev.map((r) => (r.id === freedRoom.id ? freedRoom : r));
          try {
            localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
          } catch {}
          return u;
        });
        await saveRoomToFirestore(clientId, freedRoom);
      }

      showToast('HÓSPEDE EXCLUÍDO DO FIREBASE');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR NO FIREBASE!');
    }
  };

  // Handler: Update Room Status (Strictly scoped to current client)
  const handleUpdateRoomStatus = async (roomId: string, newStatus: RoomStatus) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const isLeavingOccupied = room.status === 'ocupado' && newStatus !== 'ocupado';
    const updatedRoom: Room = {
      ...room,
      status: newStatus,
      ...(isLeavingOccupied
        ? {
            currentGuestId: undefined,
            currentGuestName: undefined,
            checkInDate: undefined,
            checkOutDate: undefined,
          }
        : {}),
    };

    setRooms((prev) => {
      const u = prev.map((r) => (r.id === roomId ? updatedRoom : r));
      try {
        localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveRoomToFirestore(clientId, updatedRoom);
      showToast(`QUARTO ${room.number}: [${newStatus.toUpperCase()}]`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR STATUS NO FIREBASE!');
    }
  };

  // Handler: Update Room Rate (Strictly scoped to current client)
  const handleUpdateRoomRate = async (roomId: string, newRate: number) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const updatedRoom: Room = { ...room, dailyRate: newRate };
    setRooms((prev) => {
      const u = prev.map((r) => (r.id === roomId ? updatedRoom : r));
      try {
        localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveRoomToFirestore(clientId, updatedRoom);
      showToast('VALOR DA DIÁRIA ATUALIZADO');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR DIÁRIA NO FIREBASE!');
    }
  };

  // Handler: Add New Room (Strictly scoped to current client)
  const handleAddNewRoom = async (newRoom: Room) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const plan = SUBSCRIPTION_PLANS[currentClient.plan];
    if (plan && rooms.length >= plan.roomLimit) {
      showAlert(
        `Limite de quartos atingido para o plano ${plan.name.toUpperCase()} (${plan.roomLimitText}).\n\nAtualmente sua propriedade já possui ${rooms.length} quartos cadastrados.\nPara cadastrar mais acomodações, faça upgrade da sua assinatura.`,
        'LIMITE DO PLANO ATINGIDO'
      );
      return;
    }

    setRooms((prev) => {
      const u = [...prev, newRoom];
      try {
        localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveRoomToFirestore(clientId, newRoom);
      showToast(`QUARTO ${newRoom.number} ADICIONADO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR QUARTO NO FIREBASE!');
    }
  };

  // Handler: Delete Room (Strictly scoped to current client)
  const handleDeleteRoom = async (roomId: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;
    if (target.status === 'ocupado') {
      showToast(`ERRO: QUARTO ${target.number} ESTÁ OCUPADO!`);
      return;
    }

    setRooms((prev) => {
      const u = prev.filter((r) => r.id !== roomId);
      try {
        localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await deleteRoomFromFirestore(clientId, roomId);
      showToast(`QUARTO ${target.number} EXCLUÍDO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR QUARTO NO FIREBASE!');
    }
  };

  // Handler: Update Room Category (Strictly scoped to current client)
  const handleUpdateRoomCategory = async (roomId: string, newCategory: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const updatedRoom: Room = { ...room, type: newCategory };
    setRooms((prev) => {
      const u = prev.map((r) => (r.id === roomId ? updatedRoom : r));
      try {
        localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveRoomToFirestore(clientId, updatedRoom);
      showToast(`CATEGORIA: "${newCategory.toUpperCase()}"`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR CATEGORIA NO FIREBASE!');
    }
  };

  // Handler: Add New Category (Strictly scoped to current client)
  const handleAddCategory = async (newCategoryName: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('DIGITE O NOME DA CATEGORIA!');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`CATEGORIA "${trimmed.toUpperCase()}" JÁ EXISTE!`);
      return;
    }

    const updatedCats = [...categories, trimmed];
    setCategories(updatedCats);

    const newPlan: RatePlan = {
      id: `rate-${Date.now()}`,
      roomType: trimmed,
      lowSeasonRate: 220,
      midSeasonRate: 280,
      highSeasonRate: 360,
      holidayRate: 480,
      extraPersonRate: 80,
      minNights: 1,
    };
    const updatedRates = [...ratePlans, newPlan];
    setRatePlans(updatedRates);

    try {
      localStorage.setItem(getTenantKey(clientId, 'CATEGORIES'), JSON.stringify(updatedCats));
      localStorage.setItem(getTenantKey(clientId, 'RATES'), JSON.stringify(updatedRates));
      await saveCategoryToFirestore(clientId, trimmed);
      await saveRatePlanToFirestore(clientId, newPlan);
      showToast(`CATEGORIA "${trimmed.toUpperCase()}" CRIADA!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR CATEGORIA NO FIREBASE!');
    }
  };

  // Handler: Delete Category (Strictly scoped to current client)
  const handleDeleteCategory = async (categoryToDelete: string): Promise<boolean> => {
    if (!currentClient) return false;
    const clientId = currentClient.id;

    if (categories.length <= 1) {
      showToast('ERRO: HOTEL DEVE TER AO MENOS 1 CATEGORIA!');
      return false;
    }

    const fallbackCategory = categories.find((c) => c !== categoryToDelete) || 'Standard';
    const affectedRooms = rooms.filter((r) => r.type === categoryToDelete);

    const updatedCats = categories.filter((c) => c !== categoryToDelete);
    setCategories(updatedCats);

    // Reassign affected rooms
    let updatedRooms = rooms;
    if (affectedRooms.length > 0) {
      updatedRooms = rooms.map((r) => (r.type === categoryToDelete ? { ...r, type: fallbackCategory } : r));
      setRooms(updatedRooms);
    }

    // Remove rate plan
    const planToDelete = ratePlans.find((p) => p.roomType === categoryToDelete);
    const updatedRatePlans = ratePlans.filter((p) => p.roomType !== categoryToDelete);
    setRatePlans(updatedRatePlans);

    try {
      localStorage.setItem(getTenantKey(clientId, 'CATEGORIES'), JSON.stringify(updatedCats));
      localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(updatedRooms));
      localStorage.setItem(getTenantKey(clientId, 'RATES'), JSON.stringify(updatedRatePlans));

      await deleteCategoryFromFirestore(clientId, categoryToDelete);

      if (planToDelete) {
        await deleteRatePlanFromFirestore(clientId, planToDelete.id);
      }

      for (const r of affectedRooms) {
        await saveRoomToFirestore(clientId, { ...r, type: fallbackCategory });
      }

      showToast(
        affectedRooms.length > 0
          ? `CATEGORIA EXCLUÍDA! ${affectedRooms.length} QUARTO(S) RECLASSIFICADO(S).`
          : `CATEGORIA EXCLUÍDA!`
      );
      return true;
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR CATEGORIA NO FIREBASE!');
      return false;
    }
  };

  // Handler: Quick Check-in from Room Control
  const handleQuickCheckInFromRoom = (roomNumber: string) => {
    setActiveTab('hospedes');
    setSelectedGuestIdForEdit(null);
    showToast(`CHECK-IN QUARTO ${roomNumber}`);
  };

  // Handler: Quick Check-out from Room Control
  const handleQuickCheckOutFromRoom = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (room.currentGuestId) {
      handleCheckOutGuest(room.currentGuestId);
    } else {
      handleUpdateRoomStatus(roomId, 'limpeza');
    }
  };

  // Handler: Update Rate Plan (Strictly scoped to current client)
  const handleUpdateRatePlan = async (updated: RatePlan) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    setRatePlans((prev) => {
      const u = prev.map((p) => (p.id === updated.id ? updated : p));
      try {
        localStorage.setItem(getTenantKey(clientId, 'RATES'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveRatePlanToFirestore(clientId, updated);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR TARIFA NO FIREBASE!');
    }
  };

  // Handler: Print Guest Voucher
  const handlePrintGuestTxt = (guest: GuestReservation) => {
    setVoucherGuest(guest);
    setIsTxtVoucherOpen(true);
  };

  // Handler: Save / Update Employee (Strictly scoped to current client)
  const handleSaveEmployee = async (employee: Employee) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === employee.id);
      const u = exists ? prev.map((e) => (e.id === employee.id ? employee : e)) : [employee, ...prev];
      try {
        localStorage.setItem(getTenantKey(clientId, 'EMPLOYEES'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await saveEmployeeToFirestore(clientId, employee);
      showToast(`FUNCIONÁRIO "${employee.name}" SALVO NO FIREBASE!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR FUNCIONÁRIO NO FIREBASE!');
    }
  };

  // Handler: Delete Employee (Strictly scoped to current client)
  const handleDeleteEmployee = async (employeeId: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const emp = employees.find((e) => e.id === employeeId);
    setEmployees((prev) => {
      const u = prev.filter((e) => e.id !== employeeId);
      try {
        localStorage.setItem(getTenantKey(clientId, 'EMPLOYEES'), JSON.stringify(u));
      } catch {}
      return u;
    });

    try {
      await deleteEmployeeFromFirestore(clientId, employeeId);
      showToast(`FUNCIONÁRIO "${emp?.name || employeeId}" EXCLUÍDO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR FUNCIONÁRIO NO FIREBASE!');
    }
  };

  // Handler: Add Workplace (Strictly scoped to current client)
  const handleAddWorkplace = async (workplaceName: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    if (workplaces.includes(workplaceName)) return;
    const updated = [...workplaces, workplaceName];
    setWorkplaces(updated);

    try {
      localStorage.setItem(getTenantKey(clientId, 'WORKPLACES'), JSON.stringify(updated));
      await saveWorkplaceToFirestore(clientId, workplaceName);
      showToast(`LOCAL "${workplaceName}" CADASTRADO NO FIREBASE!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO CADASTRAR LOCAL NO FIREBASE!');
    }
  };

  // Handler: Delete Workplace (Strictly scoped to current client)
  const handleDeleteWorkplace = async (workplaceName: string) => {
    if (!currentClient) return false;
    const clientId = currentClient.id;

    const updated = workplaces.filter((w) => w !== workplaceName);
    setWorkplaces(updated);

    try {
      localStorage.setItem(getTenantKey(clientId, 'WORKPLACES'), JSON.stringify(updated));
      await deleteWorkplaceFromFirestore(clientId, workplaceName);
      showToast(`LOCAL "${workplaceName}" EXCLUÍDO!`);
      return true;
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR LOCAL NO FIREBASE!');
      return false;
    }
  };

  // Handler: Update Client Account & Establishment Info
  const handleUpdateClient = async (updatedClient: ClientAccount) => {
    setCurrentClient(updatedClient);
    setClients((prev) =>
      prev.map((c) => (c.cpfCnpj === updatedClient.cpfCnpj ? updatedClient : c))
    );

    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CLIENT, JSON.stringify(updatedClient));
      const updatedClients = clients.map((c) =>
        c.cpfCnpj === updatedClient.cpfCnpj ? updatedClient : c
      );
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
      await saveClientToFirestore(updatedClient);
      showToast('DADOS DO ESTABELECIMENTO ATUALIZADOS NO FIREBASE!');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR ESTABELECIMENTO NO FIREBASE!');
    }
  };

  // Handler: Save / Update Inventory Item (Strictly scoped to current client)
  const handleSaveInventoryItem = async (item: InventoryItem) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    setInventoryItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      const updated = exists ? prev.map((i) => (i.id === item.id ? item : i)) : [item, ...prev];
      try {
        localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await saveInventoryItemToFirestore(clientId, item);
      showToast(`PRODUTO "${item.product}" SALVO NO FIREBASE!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR PRODUTO NO FIREBASE!');
    }
  };

  // Handler: Delete Inventory Item (Strictly scoped to current client)
  const handleDeleteInventoryItem = async (itemId: string) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    const item = inventoryItems.find((i) => i.id === itemId);
    setInventoryItems((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      try {
        localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteInventoryItemFromFirestore(clientId, itemId);
      showToast(`PRODUTO "${item?.product || itemId}" EXCLUÍDO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR PRODUTO NO FIREBASE!');
    }
  };

  // Handler: Register Stock Exit (Strictly scoped to current client)
  const handleRegisterStockExit = async (exitRecord: StockExitRecord, updatedItemQuantity: number) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    // 1. Update stock exits list
    setStockExits((prev) => {
      const updated = [exitRecord, ...prev];
      try {
        localStorage.setItem(getTenantKey(clientId, 'STOCK_EXITS'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Update item quantity in inventory list
    let updatedItem: InventoryItem | undefined;
    setInventoryItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === exitRecord.itemId) {
          updatedItem = { ...item, quantity: updatedItemQuantity };
          return updatedItem;
        }
        return item;
      });
      try {
        localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Persist to Firestore
    try {
      await saveStockExitToFirestore(clientId, exitRecord);
      if (updatedItem) {
        await saveInventoryItemToFirestore(clientId, updatedItem);
      }
      showToast(`SAÍDA DE ${exitRecord.quantity} UN REGISTRADA NO FIREBASE!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO PERSISTIR SAÍDA NO FIREBASE!');
    }
  };

  // Handler: Cancel / Revert Stock Exit (Strictly scoped to current client)
  const handleCancelStockExit = async (exitId: string, itemId: string, returnQuantity: number) => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    // 1. Remove from stock exits
    setStockExits((prev) => {
      const updated = prev.filter((e) => e.id !== exitId);
      try {
        localStorage.setItem(getTenantKey(clientId, 'STOCK_EXITS'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Return quantity to item
    let updatedItem: InventoryItem | undefined;
    setInventoryItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === itemId) {
          updatedItem = { ...item, quantity: item.quantity + returnQuantity };
          return updatedItem;
        }
        return item;
      });
      try {
        localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Persist deletion & update to Firestore
    try {
      await deleteStockExitFromFirestore(clientId, exitId);
      if (updatedItem) {
        await saveInventoryItemToFirestore(clientId, updatedItem);
      }
      showToast(`SAÍDA ESTORNADA! +${returnQuantity} UN DEVOLVIDAS AO ESTOQUE`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ESTORNAR NO FIREBASE!');
    }
  };

  // Reset to default mock data (Strictly scoped to active client)
  const handleResetData = async () => {
    if (!currentClient) return;
    const clientId = currentClient.id;
    const isDemo = clientId === 'client-demo-default';

    try {
      await resetFirestoreDatabase(clientId, isDemo);
      const targetRooms = isDemo ? INITIAL_ROOMS : STARTER_CLEAN_ROOMS;
      const targetGuests = isDemo ? INITIAL_GUESTS : [];
      const targetEmps = isDemo ? INITIAL_EMPLOYEES : [];
      const targetInv = isDemo ? INITIAL_INVENTORY_ITEMS : [];
      const targetExits = isDemo ? INITIAL_STOCK_EXITS : [];

      setRooms(targetRooms);
      setGuests(targetGuests);
      setRatePlans(INITIAL_RATE_PLANS);
      setCategories(INITIAL_CATEGORIES);
      setWorkplaces(INITIAL_WORKPLACES);
      setEmployees(targetEmps);
      setInventoryItems(targetInv);
      setStockExits(targetExits);

      localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify(targetRooms));
      localStorage.setItem(getTenantKey(clientId, 'GUESTS'), JSON.stringify(targetGuests));
      localStorage.setItem(getTenantKey(clientId, 'RATES'), JSON.stringify(INITIAL_RATE_PLANS));
      localStorage.setItem(getTenantKey(clientId, 'CATEGORIES'), JSON.stringify(INITIAL_CATEGORIES));
      localStorage.setItem(getTenantKey(clientId, 'WORKPLACES'), JSON.stringify(INITIAL_WORKPLACES));
      localStorage.setItem(getTenantKey(clientId, 'EMPLOYEES'), JSON.stringify(targetEmps));
      localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify(targetInv));
      localStorage.setItem(getTenantKey(clientId, 'STOCK_EXITS'), JSON.stringify(targetExits));

      showToast('DADOS PADRÃO RESTAURADOS NO FIREBASE!');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO RESTAURAR DADOS NO FIREBASE!');
    }
  };

  // Clear / Wipe all data in Firebase and Local (ZERAR DADOS - Strictly scoped to active client)
  const handleClearData = async () => {
    if (!currentClient) return;
    const clientId = currentClient.id;

    try {
      await clearAllFirestoreData(clientId);
      setRooms([]);
      setGuests([]);
      setEmployees([]);
      setInventoryItems([]);
      setStockExits([]);
      setWorkplaces(['Recepção', 'Cozinha', 'Governança', 'Manutenção']);
      const standardRatePlan: RatePlan = {
        id: 'rate-standard',
        roomType: 'Standard',
        lowSeasonRate: 200,
        midSeasonRate: 250,
        highSeasonRate: 320,
        holidayRate: 420,
        extraPersonRate: 70,
        minNights: 1,
      };
      setRatePlans([standardRatePlan]);
      setCategories(['Standard']);

      localStorage.setItem(getTenantKey(clientId, 'ROOMS'), JSON.stringify([]));
      localStorage.setItem(getTenantKey(clientId, 'GUESTS'), JSON.stringify([]));
      localStorage.setItem(getTenantKey(clientId, 'RATES'), JSON.stringify([standardRatePlan]));
      localStorage.setItem(getTenantKey(clientId, 'CATEGORIES'), JSON.stringify(['Standard']));
      localStorage.setItem(
        getTenantKey(clientId, 'WORKPLACES'),
        JSON.stringify(['Recepção', 'Cozinha', 'Governança', 'Manutenção'])
      );
      localStorage.setItem(getTenantKey(clientId, 'EMPLOYEES'), JSON.stringify([]));
      localStorage.setItem(getTenantKey(clientId, 'INVENTORY'), JSON.stringify([]));
      localStorage.setItem(getTenantKey(clientId, 'STOCK_EXITS'), JSON.stringify([]));

      showToast('TODAS AS INFORMAÇÕES FORAM ZERADAS NO FIREBASE!');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ZERAR DADOS NO FIREBASE!');
    }
  };

  // If user is not authenticated, display login/registration portal first
  if (!currentClient) {
    return (
      <AuthPortal
        onLoginSuccess={handleLoginSuccess}
        registeredClients={clients}
        onSaveClient={handleSaveNewClient}
        onUpdateClientsList={handleUpdateClientsList}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-black font-mono flex flex-col selection:bg-[#FFFFCC] selection:text-black">
      {/* Top Windows Notepad Header Bar & Navigation */}
      <WindowHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        rooms={rooms}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenTxtExport={() => {
          setVoucherGuest(guests[0] || null);
          setIsTxtVoucherOpen(true);
        }}
        onNewGuest={() => {
          setActiveTab('hospedes');
          setSelectedGuestIdForEdit(null);
          showToast('Formulário Limpo para Novo Cadastro');
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        notification={notification}
        isCloudSynced={isCloudSynced}
        currentClient={currentClient}
        onLogout={handleLogout}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 min-h-0 overflow-hidden bg-white relative">
        {activeTab === 'hospedes' && (
          <GuestRegistration
            guests={guests}
            rooms={rooms}
            onSaveGuest={handleSaveGuest}
            onCheckOutGuest={handleCheckOutGuest}
            onDeleteGuest={handleDeleteGuest}
            onPrintGuestTxt={handlePrintGuestTxt}
            searchQuery={searchQuery}
            selectedGuestId={selectedGuestIdForEdit}
            onSelectGuestId={(id) => setSelectedGuestIdForEdit(id)}
          />
        )}

        {activeTab === 'quartos' && (
          <RoomControl
            rooms={rooms}
            categories={categories}
            onUpdateRoomStatus={handleUpdateRoomStatus}
            onUpdateRoomRate={handleUpdateRoomRate}
            onAddNewRoom={handleAddNewRoom}
            onDeleteRoom={handleDeleteRoom}
            onUpdateRoomCategory={handleUpdateRoomCategory}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onQuickCheckIn={handleQuickCheckInFromRoom}
            onQuickCheckOut={handleQuickCheckOutFromRoom}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'valores' && (
          <RatePlans
            ratePlans={ratePlans}
            onUpdateRatePlan={handleUpdateRatePlan}
          />
        )}

        {activeTab === 'calendario' && (
          <BookingCalendar
            rooms={rooms}
            guests={guests}
            onSelectGuest={(guestId) => {
              setSelectedGuestIdForEdit(guestId);
              setActiveTab('hospedes');
            }}
            onQuickBookRoom={(roomNumber, date) => {
              setActiveTab('hospedes');
              setSelectedGuestIdForEdit(null);
              showToast(`Nova Reserva: Quarto ${roomNumber} a partir de ${date}`);
            }}
          />
        )}

        {activeTab === 'funcionarios' && (
          <StaffManagement
            employees={employees}
            workplaces={workplaces}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddWorkplace={handleAddWorkplace}
            onDeleteWorkplace={handleDeleteWorkplace}
            searchQuery={searchQuery}
            establishmentName={currentClient?.establishmentName}
          />
        )}

        {activeTab === 'estoque' && (
          <InventoryManagement
            items={inventoryItems}
            stockExits={stockExits}
            employees={employees}
            rooms={rooms}
            establishmentName={currentClient?.establishmentName}
            onSaveItem={handleSaveInventoryItem}
            onDeleteItem={handleDeleteInventoryItem}
            onRegisterExit={handleRegisterStockExit}
            onCancelExit={handleCancelStockExit}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'empresa' && (
          <EstablishmentSettings
            currentClient={currentClient}
            onUpdateClient={handleUpdateClient}
            rooms={rooms}
            employees={employees}
            guests={guests}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Bottom Status Bar with RESTAURAR DADOS, ZERAR DADOS and SAIR */}
      <StatusBar
        activeTab={activeTab}
        rooms={rooms}
        onResetData={handleResetData}
        onClearData={handleClearData}
        isCloudSynced={isCloudSynced}
        onLogout={handleLogout}
      />

      {/* TXT Voucher Export Modal */}
      {isTxtVoucherOpen && (
        <TxtVoucherModal
          isOpen={isTxtVoucherOpen}
          guest={voucherGuest || guests[0]}
          guests={guests}
          rooms={rooms}
          onClose={() => setIsTxtVoucherOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}
    </div>
  );
}
