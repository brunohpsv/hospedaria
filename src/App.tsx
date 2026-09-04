import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, Room, GuestReservation, RatePlan, RoomStatus } from './types';
import { INITIAL_ROOMS, INITIAL_GUESTS, INITIAL_RATE_PLANS, INITIAL_CATEGORIES } from './mockData';
import { WindowHeader } from './components/WindowHeader';
import { GuestRegistration } from './components/GuestRegistration';
import { RoomControl } from './components/RoomControl';
import { RatePlans } from './components/RatePlans';
import { BookingCalendar } from './components/BookingCalendar';
import { TxtVoucherModal } from './components/TxtVoucherModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { StatusBar } from './components/StatusBar';
import {
  seedInitialFirestoreData,
  subscribeRooms,
  subscribeGuests,
  subscribeCategories,
  subscribeRatePlans,
  saveRoomToFirestore,
  deleteRoomFromFirestore,
  saveGuestToFirestore,
  deleteGuestFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveRatePlanToFirestore,
  deleteRatePlanFromFirestore,
  resetFirestoreDatabase,
  clearAllFirestoreData,
} from './lib/hotelFirebaseService';

const STORAGE_KEYS = {
  ROOMS: 'hotel_notepad_rooms_v1',
  GUESTS: 'hotel_notepad_guests_v1',
  RATES: 'hotel_notepad_rates_v1',
  CATEGORIES: 'hotel_notepad_categories_v1',
};

export default function App() {
  // Local state with initial fallback
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
      return saved ? JSON.parse(saved) : INITIAL_ROOMS;
    } catch {
      return INITIAL_ROOMS;
    }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [guests, setGuests] = useState<GuestReservation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
      return saved ? JSON.parse(saved) : INITIAL_GUESTS;
    } catch {
      return INITIAL_GUESTS;
    }
  });

  const [ratePlans, setRatePlans] = useState<RatePlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RATES);
      return saved ? JSON.parse(saved) : INITIAL_RATE_PLANS;
    } catch {
      return INITIAL_RATE_PLANS;
    }
  });

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

  // 1. Firebase Initial Seeding & Real-Time Sync Subscriptions
  useEffect(() => {
    let unsubRooms: () => void = () => {};
    let unsubGuests: () => void = () => {};
    let unsubCategories: () => void = () => {};
    let unsubRatePlans: () => void = () => {};

    const initFirebase = async () => {
      try {
        await seedInitialFirestoreData();

        unsubRooms = subscribeRooms(
          (fireRooms) => {
            setRooms(fireRooms);
            try {
              localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(fireRooms));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error('Erro rooms sync:', err);
            setIsCloudSynced(false);
          }
        );

        unsubGuests = subscribeGuests(
          (fireGuests) => {
            setGuests(fireGuests);
            try {
              localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(fireGuests));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error('Erro guests sync:', err);
            setIsCloudSynced(false);
          }
        );

        unsubCategories = subscribeCategories(
          (fireCats) => {
            setCategories(fireCats && fireCats.length > 0 ? fireCats : ['Standard']);
            try {
              localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(fireCats));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error('Erro categories sync:', err);
            setIsCloudSynced(false);
          }
        );

        unsubRatePlans = subscribeRatePlans(
          (fireRates) => {
            setRatePlans(fireRates);
            try {
              localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(fireRates));
            } catch {}
            setIsCloudSynced(true);
          },
          (err) => {
            console.error('Erro ratePlans sync:', err);
            setIsCloudSynced(false);
          }
        );
      } catch (err) {
        console.error('Falha ao inicializar Firebase:', err);
        setIsCloudSynced(false);
      }
    };

    initFirebase();

    return () => {
      unsubRooms();
      unsubGuests();
      unsubCategories();
      unsubRatePlans();
    };
  }, []);

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
      } else if (e.key === 'Escape') {
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        if (isTxtVoucherOpen) setIsTxtVoucherOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, isTxtVoucherOpen, showToast]);

  // Handler: Save / Update Guest
  const handleSaveGuest = async (guest: GuestReservation) => {
    // Optimistic update
    setGuests((prev) => {
      const exists = prev.some((g) => g.id === guest.id);
      return exists ? prev.map((g) => (g.id === guest.id ? guest : g)) : [guest, ...prev];
    });

    try {
      await saveGuestToFirestore(guest);

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
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
        await saveRoomToFirestore(updatedRoom);
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
        setRooms((prev) => prev.map((r) => (r.id === clearedRoom.id ? clearedRoom : r)));
        await saveRoomToFirestore(clearedRoom);
      }

      showToast(`HÓSPEDE ${guest.name.toUpperCase()} SALVO COM SUCESSO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR NO FIREBASE!');
    }
  };

  // Handler: Check-out of guest
  const handleCheckOutGuest = async (guestId: string) => {
    const target = guests.find((g) => g.id === guestId);
    if (!target) return;

    const updatedGuest: GuestReservation = { ...target, status: 'Check-out' };
    setGuests((prev) => prev.map((g) => (g.id === guestId ? updatedGuest : g)));

    try {
      await saveGuestToFirestore(updatedGuest);

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
        setRooms((prev) => prev.map((r) => (r.id === cleaningRoom.id ? cleaningRoom : r)));
        await saveRoomToFirestore(cleaningRoom);
      }

      showToast(`CHECK-OUT REALIZADO! QUARTO EM LIMPEZA`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO PROCESSAR CHECK-OUT NO FIREBASE!');
    }
  };

  // Handler: Delete guest
  const handleDeleteGuest = async (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));

    try {
      await deleteGuestFromFirestore(guestId);

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
        setRooms((prev) => prev.map((r) => (r.id === freedRoom.id ? freedRoom : r)));
        await saveRoomToFirestore(freedRoom);
      }

      showToast('HÓSPEDE EXCLUÍDO DO FIREBASE');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR NO FIREBASE!');
    }
  };

  // Handler: Update Room Status
  const handleUpdateRoomStatus = async (roomId: string, newStatus: RoomStatus) => {
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

    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));

    try {
      await saveRoomToFirestore(updatedRoom);
      showToast(`QUARTO ${room.number}: [${newStatus.toUpperCase()}]`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR STATUS NO FIREBASE!');
    }
  };

  // Handler: Update Room Rate
  const handleUpdateRoomRate = async (roomId: string, newRate: number) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const updatedRoom: Room = { ...room, dailyRate: newRate };
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));

    try {
      await saveRoomToFirestore(updatedRoom);
      showToast('VALOR DA DIÁRIA ATUALIZADO');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR DIÁRIA NO FIREBASE!');
    }
  };

  // Handler: Add New Room
  const handleAddNewRoom = async (newRoom: Room) => {
    setRooms((prev) => [...prev, newRoom]);

    try {
      await saveRoomToFirestore(newRoom);
      showToast(`QUARTO ${newRoom.number} ADICIONADO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR QUARTO NO FIREBASE!');
    }
  };

  // Handler: Delete Room
  const handleDeleteRoom = async (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;
    if (target.status === 'ocupado') {
      showToast(`ERRO: QUARTO ${target.number} ESTÁ OCUPADO!`);
      return;
    }

    setRooms((prev) => prev.filter((r) => r.id !== roomId));

    try {
      await deleteRoomFromFirestore(roomId);
      showToast(`QUARTO ${target.number} EXCLUÍDO!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO EXCLUIR QUARTO NO FIREBASE!');
    }
  };

  // Handler: Update Room Category
  const handleUpdateRoomCategory = async (roomId: string, newCategory: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const updatedRoom: Room = { ...room, type: newCategory };
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));

    try {
      await saveRoomToFirestore(updatedRoom);
      showToast(`CATEGORIA: "${newCategory.toUpperCase()}"`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ATUALIZAR CATEGORIA NO FIREBASE!');
    }
  };

  // Handler: Add New Category
  const handleAddCategory = async (newCategoryName: string) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('DIGITE O NOME DA CATEGORIA!');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`CATEGORIA "${trimmed.toUpperCase()}" JÁ EXISTE!`);
      return;
    }

    setCategories((prev) => [...prev, trimmed]);

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
    setRatePlans((prev) => [...prev, newPlan]);

    try {
      await saveCategoryToFirestore(trimmed);
      await saveRatePlanToFirestore(newPlan);
      showToast(`CATEGORIA "${trimmed.toUpperCase()}" CRIADA!`);
    } catch (err) {
      console.error(err);
      showToast('ERRO AO SALVAR CATEGORIA NO FIREBASE!');
    }
  };

  // Handler: Delete Category
  const handleDeleteCategory = async (categoryToDelete: string): Promise<boolean> => {
    if (categories.length <= 1) {
      showToast('ERRO: HOTEL DEVE TER AO MENOS 1 CATEGORIA!');
      return false;
    }

    const fallbackCategory = categories.find((c) => c !== categoryToDelete) || 'Standard';
    const affectedRooms = rooms.filter((r) => r.type === categoryToDelete);

    setCategories((prev) => prev.filter((c) => c !== categoryToDelete));

    // Reassign affected rooms
    if (affectedRooms.length > 0) {
      setRooms((prev) =>
        prev.map((r) => (r.type === categoryToDelete ? { ...r, type: fallbackCategory } : r))
      );
    }

    // Remove rate plan
    const planToDelete = ratePlans.find((p) => p.roomType === categoryToDelete);
    setRatePlans((prev) => prev.filter((p) => p.roomType !== categoryToDelete));

    try {
      await deleteCategoryFromFirestore(categoryToDelete);

      if (planToDelete) {
        await deleteRatePlanFromFirestore(planToDelete.id);
      }

      for (const r of affectedRooms) {
        await saveRoomToFirestore({ ...r, type: fallbackCategory });
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

  // Handler: Update Rate Plan
  const handleUpdateRatePlan = async (updated: RatePlan) => {
    setRatePlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    try {
      await saveRatePlanToFirestore(updated);
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

  // Reset to original default mock data in Firebase and Local
  const handleResetData = async () => {
    try {
      await resetFirestoreDatabase();
      setRooms(INITIAL_ROOMS);
      setGuests(INITIAL_GUESTS);
      setRatePlans(INITIAL_RATE_PLANS);
      setCategories(INITIAL_CATEGORIES);
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS));
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(INITIAL_GUESTS));
      localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(INITIAL_RATE_PLANS));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      showToast('DADOS PADRÃO RESTAURADOS NO FIREBASE!');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO RESTAURAR DADOS NO FIREBASE!');
    }
  };

  // Clear / Wipe all data in Firebase and Local (ZERAR DADOS)
  const handleClearData = async () => {
    try {
      await clearAllFirestoreData();
      setRooms([]);
      setGuests([]);
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
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify([standardRatePlan]));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(['Standard']));
      showToast('TODAS AS INFORMAÇÕES FORAM ZERADAS NO FIREBASE!');
    } catch (err) {
      console.error(err);
      showToast('ERRO AO ZERAR DADOS NO FIREBASE!');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col selection:bg-[#FFFFCC] selection:text-black">
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
      />

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-auto bg-white">
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
      </main>

      {/* Bottom Status Bar with RESTAURAR DADOS and ZERAR DADOS */}
      <StatusBar
        activeTab={activeTab}
        rooms={rooms}
        onResetData={handleResetData}
        onClearData={handleClearData}
        isCloudSynced={isCloudSynced}
      />

      {/* TXT Voucher Export Modal */}
      {isTxtVoucherOpen && (
        <TxtVoucherModal
          guest={voucherGuest || guests[0]}
          onClose={() => setIsTxtVoucherOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />
      )}
    </div>
  );
}
