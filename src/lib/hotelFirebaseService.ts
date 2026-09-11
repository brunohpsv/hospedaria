import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Room, GuestReservation, RatePlan, ClientAccount, Employee, InventoryItem, StockExitRecord } from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_GUESTS,
  INITIAL_CATEGORIES,
  INITIAL_RATE_PLANS,
  INITIAL_WORKPLACES,
  INITIAL_EMPLOYEES,
  STARTER_CLEAN_ROOMS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_STOCK_EXITS,
} from '../mockData';

function cleanDoc<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Helper to get client-isolated subcollection references.
 * Each establishment account has its own isolated subcollections under `clients/${clientId}/...`
 */
function clientCollection(clientId: string, subcollectionName: string) {
  return collection(db!, 'clients', clientId, subcollectionName);
}

function clientDoc(clientId: string, subcollectionName: string, docId: string) {
  return doc(db!, 'clients', clientId, subcollectionName, docId);
}

/**
 * Initial seeding of Firestore per client account.
 * - For demo client ('client-demo-default'): seeds full demo rooms, guests, and staff.
 * - For newly registered client: seeds clean starter rooms (all available, 0 guests), categories, and workplaces.
 */
export async function seedClientFirestoreData(clientId: string, isDemo: boolean = false): Promise<void> {
  if (!db || !clientId) return;
  try {
    const initDocRef = doc(db, 'clients', clientId, '_system', 'init');
    const initSnap = await getDoc(initDocRef);
    if (initSnap.exists()) {
      return; // Already initialized for this client
    }

    const roomsSnap = await getDocs(clientCollection(clientId, 'rooms'));
    if (!roomsSnap.empty) {
      return;
    }

    const batch = writeBatch(db);

    const roomsToSeed = isDemo ? INITIAL_ROOMS : STARTER_CLEAN_ROOMS;
    const guestsToSeed = isDemo ? INITIAL_GUESTS : [];
    const employeesToSeed = isDemo ? INITIAL_EMPLOYEES : [];
    const inventoryToSeed = isDemo ? INITIAL_INVENTORY_ITEMS : [];
    const stockExitsToSeed = isDemo ? INITIAL_STOCK_EXITS : [];

    // Seed rooms
    for (const room of roomsToSeed) {
      batch.set(clientDoc(clientId, 'rooms', room.id), cleanDoc(room));
    }

    // Seed guests
    for (const guest of guestsToSeed) {
      batch.set(clientDoc(clientId, 'guests', guest.id), cleanDoc(guest));
    }

    // Seed categories
    for (const cat of INITIAL_CATEGORIES) {
      batch.set(clientDoc(clientId, 'categories', cat), { id: cat, name: cat });
    }

    // Seed rate plans
    for (const plan of INITIAL_RATE_PLANS) {
      batch.set(clientDoc(clientId, 'ratePlans', plan.id), cleanDoc(plan));
    }

    // Seed workplaces
    for (const wp of INITIAL_WORKPLACES) {
      batch.set(clientDoc(clientId, 'workplaces', wp), { id: wp, name: wp });
    }

    // Seed employees
    for (const emp of employeesToSeed) {
      batch.set(clientDoc(clientId, 'employees', emp.id), cleanDoc(emp));
    }

    // Seed inventory items
    for (const item of inventoryToSeed) {
      batch.set(clientDoc(clientId, 'inventory', item.id), cleanDoc(item));
    }

    // Seed stock exits
    for (const exit of stockExitsToSeed) {
      batch.set(clientDoc(clientId, 'stockExits', exit.id), cleanDoc(exit));
    }

    batch.set(initDocRef, {
      initialized: true,
      isDemo,
      seededAt: new Date().toISOString(),
    });

    await batch.commit();
    console.log(`[Firestore] Dados isolados configurados para o cliente: ${clientId} (Demo: ${isDemo})`);
  } catch (err) {
    console.error(`[Firestore] Erro ao verificar/alimentar dados para ${clientId}:`, err);
  }
}

// -----------------------------------------------------------------------------
// Real-time subscriptions (strictly isolated per clientId)
// -----------------------------------------------------------------------------

export function subscribeRooms(
  clientId: string,
  onData: (rooms: Room[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'rooms'),
    (snap) => {
      const items: Room[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data() as Room);
      });
      // Sort rooms by number
      items.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      onData(items);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de quartos do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeGuests(
  clientId: string,
  onData: (guests: GuestReservation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'guests'),
    (snap) => {
      const items: GuestReservation[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data() as GuestReservation);
      });
      // Sort guests by checkIn date descending
      items.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
      onData(items);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de hóspedes do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeCategories(
  clientId: string,
  onData: (categories: string[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'categories'),
    (snap) => {
      const items: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name) items.push(data.name);
      });
      onData(items.length > 0 ? items : ['Standard']);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de categorias do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeRatePlans(
  clientId: string,
  onData: (plans: RatePlan[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'ratePlans'),
    (snap) => {
      const items: RatePlan[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data() as RatePlan);
      });
      onData(items);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de tarifas do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeWorkplaces(
  clientId: string,
  onData: (workplaces: string[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'workplaces'),
    (snap) => {
      const items: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name) items.push(data.name);
      });
      onData(items.length > 0 ? items : INITIAL_WORKPLACES);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de locais de trabalho do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeEmployees(
  clientId: string,
  onData: (employees: Employee[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'employees'),
    (snap) => {
      const items: Employee[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data() as Employee);
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de funcionários do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeInventory(
  clientId: string,
  onData: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'inventory'),
    (snap) => {
      const items: InventoryItem[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data() as InventoryItem);
      });
      onData(items);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de estoque do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

export function subscribeStockExits(
  clientId: string,
  onData: (exits: StockExitRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !clientId) {
    onError?.(new Error('Banco de dados indisponível (modo offline)'));
    return () => {};
  }
  return onSnapshot(
    clientCollection(clientId, 'stockExits'),
    (snap) => {
      const exits: StockExitRecord[] = [];
      snap.forEach((docSnap) => {
        exits.push(docSnap.data() as StockExitRecord);
      });
      exits.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(exits);
    },
    (err) => {
      console.error(`[Firestore] Erro no listener de saídas do estoque do cliente ${clientId}:`, err);
      onError?.(err);
    }
  );
}

// -----------------------------------------------------------------------------
// Isolated Document Operations per Client
// -----------------------------------------------------------------------------

// Room Operations
export async function saveRoomToFirestore(clientId: string, room: Room): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'rooms', room.id), cleanDoc(room), { merge: true });
}

export async function deleteRoomFromFirestore(clientId: string, roomId: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'rooms', roomId));
}

// Guest Operations
export async function saveGuestToFirestore(clientId: string, guest: GuestReservation): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'guests', guest.id), cleanDoc(guest), { merge: true });
}

export async function deleteGuestFromFirestore(clientId: string, guestId: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'guests', guestId));
}

// Category Operations
export async function saveCategoryToFirestore(clientId: string, categoryName: string): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'categories', categoryName), {
    id: categoryName,
    name: categoryName,
  });
}

export async function deleteCategoryFromFirestore(clientId: string, categoryName: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'categories', categoryName));
}

// Rate Plan Operations
export async function saveRatePlanToFirestore(clientId: string, plan: RatePlan): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'ratePlans', plan.id), cleanDoc(plan), { merge: true });
}

export async function deleteRatePlanFromFirestore(clientId: string, planId: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'ratePlans', planId));
}

// Workplace Operations
export async function saveWorkplaceToFirestore(clientId: string, workplaceName: string): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'workplaces', workplaceName), {
    id: workplaceName,
    name: workplaceName,
  });
}

export async function deleteWorkplaceFromFirestore(clientId: string, workplaceName: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'workplaces', workplaceName));
}

// Employee Operations
export async function saveEmployeeToFirestore(clientId: string, employee: Employee): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'employees', employee.id), cleanDoc(employee), { merge: true });
}

export async function deleteEmployeeFromFirestore(clientId: string, employeeId: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'employees', employeeId));
}

// Inventory Operations
export async function saveInventoryItemToFirestore(clientId: string, item: InventoryItem): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'inventory', item.id), cleanDoc(item), { merge: true });
}

export async function deleteInventoryItemFromFirestore(clientId: string, itemId: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'inventory', itemId));
}

// Stock Exits Operations (Saídas)
export async function saveStockExitToFirestore(clientId: string, exitRecord: StockExitRecord): Promise<void> {
  if (!db || !clientId) return;
  await setDoc(clientDoc(clientId, 'stockExits', exitRecord.id), cleanDoc(exitRecord), { merge: true });
}

export async function deleteStockExitFromFirestore(clientId: string, exitId: string): Promise<void> {
  if (!db || !clientId) return;
  await deleteDoc(clientDoc(clientId, 'stockExits', exitId));
}

// -----------------------------------------------------------------------------
// Reset & Clear Operations (Operate ONLY on the target client)
// -----------------------------------------------------------------------------

export async function resetFirestoreDatabase(clientId: string, isDemo: boolean = false): Promise<void> {
  if (!db || !clientId) return;
  const batch = writeBatch(db);

  // Clear client's existing documents
  const [roomsSnap, guestsSnap, categoriesSnap, ratesSnap, workplacesSnap, employeesSnap, inventorySnap, exitsSnap] = await Promise.all([
    getDocs(clientCollection(clientId, 'rooms')),
    getDocs(clientCollection(clientId, 'guests')),
    getDocs(clientCollection(clientId, 'categories')),
    getDocs(clientCollection(clientId, 'ratePlans')),
    getDocs(clientCollection(clientId, 'workplaces')),
    getDocs(clientCollection(clientId, 'employees')),
    getDocs(clientCollection(clientId, 'inventory')),
    getDocs(clientCollection(clientId, 'stockExits')),
  ]);

  roomsSnap.forEach((d) => batch.delete(d.ref));
  guestsSnap.forEach((d) => batch.delete(d.ref));
  categoriesSnap.forEach((d) => batch.delete(d.ref));
  ratesSnap.forEach((d) => batch.delete(d.ref));
  workplacesSnap.forEach((d) => batch.delete(d.ref));
  employeesSnap.forEach((d) => batch.delete(d.ref));
  inventorySnap.forEach((d) => batch.delete(d.ref));
  exitsSnap.forEach((d) => batch.delete(d.ref));

  // Re-seed data for this client
  const roomsToSeed = isDemo ? INITIAL_ROOMS : STARTER_CLEAN_ROOMS;
  const guestsToSeed = isDemo ? INITIAL_GUESTS : [];
  const employeesToSeed = isDemo ? INITIAL_EMPLOYEES : [];
  const inventoryToSeed = isDemo ? INITIAL_INVENTORY_ITEMS : [];
  const stockExitsToSeed = isDemo ? INITIAL_STOCK_EXITS : [];

  for (const r of roomsToSeed) {
    batch.set(clientDoc(clientId, 'rooms', r.id), cleanDoc(r));
  }
  for (const g of guestsToSeed) {
    batch.set(clientDoc(clientId, 'guests', g.id), cleanDoc(g));
  }
  for (const c of INITIAL_CATEGORIES) {
    batch.set(clientDoc(clientId, 'categories', c), { id: c, name: c });
  }
  for (const p of INITIAL_RATE_PLANS) {
    batch.set(clientDoc(clientId, 'ratePlans', p.id), cleanDoc(p));
  }
  for (const w of INITIAL_WORKPLACES) {
    batch.set(clientDoc(clientId, 'workplaces', w), { id: w, name: w });
  }
  for (const e of employeesToSeed) {
    batch.set(clientDoc(clientId, 'employees', e.id), cleanDoc(e));
  }
  for (const item of inventoryToSeed) {
    batch.set(clientDoc(clientId, 'inventory', item.id), cleanDoc(item));
  }
  for (const exit of stockExitsToSeed) {
    batch.set(clientDoc(clientId, 'stockExits', exit.id), cleanDoc(exit));
  }

  batch.set(doc(db, 'clients', clientId, '_system', 'init'), {
    initialized: true,
    isDemo,
    resetAt: new Date().toISOString(),
  });

  await batch.commit();
}

export async function clearAllFirestoreData(clientId: string): Promise<void> {
  if (!db || !clientId) return;
  const batch = writeBatch(db);

  const [roomsSnap, guestsSnap, categoriesSnap, ratesSnap, workplacesSnap, employeesSnap, inventorySnap, exitsSnap] = await Promise.all([
    getDocs(clientCollection(clientId, 'rooms')),
    getDocs(clientCollection(clientId, 'guests')),
    getDocs(clientCollection(clientId, 'categories')),
    getDocs(clientCollection(clientId, 'ratePlans')),
    getDocs(clientCollection(clientId, 'workplaces')),
    getDocs(clientCollection(clientId, 'employees')),
    getDocs(clientCollection(clientId, 'inventory')),
    getDocs(clientCollection(clientId, 'stockExits')),
  ]);

  roomsSnap.forEach((d) => batch.delete(d.ref));
  guestsSnap.forEach((d) => batch.delete(d.ref));
  categoriesSnap.forEach((d) => batch.delete(d.ref));
  ratesSnap.forEach((d) => batch.delete(d.ref));
  workplacesSnap.forEach((d) => batch.delete(d.ref));
  employeesSnap.forEach((d) => batch.delete(d.ref));
  inventorySnap.forEach((d) => batch.delete(d.ref));
  exitsSnap.forEach((d) => batch.delete(d.ref));

  // Retain a base clean accommodation category
  const defaultCat = 'Standard';
  batch.set(clientDoc(clientId, 'categories', defaultCat), { id: defaultCat, name: defaultCat });
  batch.set(clientDoc(clientId, 'ratePlans', 'rate-standard'), {
    id: 'rate-standard',
    roomType: defaultCat,
    lowSeasonRate: 200,
    midSeasonRate: 250,
    highSeasonRate: 320,
    holidayRate: 420,
    extraPersonRate: 70,
    minNights: 1,
  });

  // Retain base workplaces
  for (const wp of ['Cozinha', 'Recepção', 'Governança', 'Manutenção']) {
    batch.set(clientDoc(clientId, 'workplaces', wp), { id: wp, name: wp });
  }

  batch.set(doc(db, 'clients', clientId, '_system', 'init'), {
    initialized: true,
    clearedAt: new Date().toISOString(),
  });

  await batch.commit();
}

// -----------------------------------------------------------------------------
// Client Accounts (Global Directory of Establishments)
// -----------------------------------------------------------------------------

export async function saveClientToFirestore(client: ClientAccount): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'clients', client.id), cleanDoc(client), { merge: true });
}

export async function getAllClientsFromFirestore(): Promise<ClientAccount[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'clients'));
    const list: ClientAccount[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      // Skip internal system documents if any
      if (data.cpfCnpj && data.accessKey) {
        list.push(data as ClientAccount);
      }
    });
    return list;
  } catch (err) {
    console.error('[Firestore] Erro ao buscar clientes cadastrados:', err);
    return [];
  }
}

export async function deleteClientFromFirestore(clientId: string): Promise<void> {
  if (!db || !clientId) return;
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (err) {
    console.error(`[Firestore] Erro ao deletar cliente ${clientId}:`, err);
    throw err;
  }
}

export async function updateClientStatusInFirestore(
  clientId: string,
  status: 'ativo' | 'suspenso'
): Promise<void> {
  if (!db || !clientId) return;
  try {
    await updateDoc(doc(db, 'clients', clientId), { status });
  } catch (err) {
    console.error(`[Firestore] Erro ao atualizar status do cliente ${clientId}:`, err);
    throw err;
  }
}

/**
 * SHA-256 hash helper to ensure the admin password is never exposed in plaintext in the codebase.
 */
export async function hashAdminPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0;
    for (let i = 0; i < password.length; i++) {
      h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  }
}

// Pre-calculated SHA-256 hash of the master admin password stored in Firebase
// The plaintext password is NOT in the codebase.
const FALLBACK_ADMIN_HASH = '279b9fac70d25abfa6967cf6bd752821a8190073d4ae9b30c0075d89a2345bf7';
const ADMIN_HASH_CACHE_KEY = 'hotel_admin_hash_cache_v1';

/**
 * Verifies the admin password directly against Firestore (system_config/admin_auth).
 * Falls back to cryptographic hash comparison if offline.
 */
export async function verifyAdminPasswordWithFirebase(enteredPassword: string): Promise<boolean> {
  const trimmed = enteredPassword.trim();
  if (!trimmed) return false;

  const enteredHash = await hashAdminPassword(trimmed);

  if (db) {
    try {
      const docRef = doc(db, 'system_config', 'admin_auth');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.password && data.password === trimmed) {
          try {
            localStorage.setItem(ADMIN_HASH_CACHE_KEY, enteredHash);
          } catch {}
          return true;
        }
        if (data.passwordHash && data.passwordHash === enteredHash) {
          try {
            localStorage.setItem(ADMIN_HASH_CACHE_KEY, enteredHash);
          } catch {}
          return true;
        }
        return false;
      }
    } catch (err) {
      console.warn('[Firestore] Falha ao verificar senha adm no banco (verificando hash offline):', err);
    }
  }

  // Offline or network fallback using SHA-256 hash comparison
  try {
    const cachedHash = localStorage.getItem(ADMIN_HASH_CACHE_KEY);
    if (cachedHash && enteredHash === cachedHash) {
      return true;
    }
  } catch {}

  return enteredHash === FALLBACK_ADMIN_HASH;
}

/**
 * Updates the admin master password in Firebase (system_config/admin_auth).
 */
export async function updateAdminPasswordInFirebase(newPassword: string): Promise<void> {
  const trimmed = newPassword.trim();
  if (!trimmed) return;

  const hash = await hashAdminPassword(trimmed);

  try {
    localStorage.setItem(ADMIN_HASH_CACHE_KEY, hash);
  } catch {}

  if (db) {
    try {
      const docRef = doc(db, 'system_config', 'admin_auth');
      await setDoc(
        docRef,
        {
          password: trimmed,
          passwordHash: hash,
          updatedAt: new Date().toISOString(),
          description: 'Credencial mestre de acesso administrativo',
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[Firestore] Erro ao atualizar senha adm no banco:', err);
      throw err;
    }
  }
}

