import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Room, GuestReservation, RatePlan } from '../types';
import { INITIAL_ROOMS, INITIAL_GUESTS, INITIAL_CATEGORIES, INITIAL_RATE_PLANS } from '../mockData';

function cleanDoc<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Initial seeding of Firestore when first installed
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const initSnap = await getDoc(doc(db, '_system', 'init'));
    if (initSnap.exists()) {
      return; // Already initialized or intentionally cleared by the user
    }

    const roomsSnap = await getDocs(collection(db, 'rooms'));
    if (roomsSnap.empty) {
      const batch = writeBatch(db);

      // Seed rooms
      for (const room of INITIAL_ROOMS) {
        batch.set(doc(db, 'rooms', room.id), cleanDoc(room));
      }

      // Seed guests
      for (const guest of INITIAL_GUESTS) {
        batch.set(doc(db, 'guests', guest.id), cleanDoc(guest));
      }

      // Seed categories
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(db, 'categories', cat), { id: cat, name: cat });
      }

      // Seed rate plans
      for (const plan of INITIAL_RATE_PLANS) {
        batch.set(doc(db, 'ratePlans', plan.id), cleanDoc(plan));
      }

      batch.set(doc(db, '_system', 'init'), {
        initialized: true,
        seededAt: new Date().toISOString(),
      });

      await batch.commit();
      console.log('Dados iniciais inseridos com sucesso no Firestore!');
    }
  } catch (err) {
    console.error('Erro ao verificar/alimentar dados no Firestore:', err);
  }
}

// Real-time subscriptions
export function subscribeRooms(
  onData: (rooms: Room[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'rooms'),
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
      console.error('Erro no listener de quartos:', err);
      onError?.(err);
    }
  );
}

export function subscribeGuests(
  onData: (guests: GuestReservation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'guests'),
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
      console.error('Erro no listener de hóspedes:', err);
      onError?.(err);
    }
  );
}

export function subscribeCategories(
  onData: (categories: string[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'categories'),
    (snap) => {
      const items: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name) items.push(data.name);
      });
      onData(items.length > 0 ? items : ['Standard']);
    },
    (err) => {
      console.error('Erro no listener de categorias:', err);
      onError?.(err);
    }
  );
}

export function subscribeRatePlans(
  onData: (plans: RatePlan[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'ratePlans'),
    (snap) => {
      const items: RatePlan[] = [];
      snap.forEach((docSnap) => {
        items.push(docSnap.data() as RatePlan);
      });
      onData(items);
    },
    (err) => {
      console.error('Erro no listener de tarifário:', err);
      onError?.(err);
    }
  );
}

// Room Operations
export async function saveRoomToFirestore(room: Room): Promise<void> {
  await setDoc(doc(db, 'rooms', room.id), cleanDoc(room), { merge: true });
}

export async function deleteRoomFromFirestore(roomId: string): Promise<void> {
  await deleteDoc(doc(db, 'rooms', roomId));
}

// Guest Operations
export async function saveGuestToFirestore(guest: GuestReservation): Promise<void> {
  await setDoc(doc(db, 'guests', guest.id), cleanDoc(guest), { merge: true });
}

export async function deleteGuestFromFirestore(guestId: string): Promise<void> {
  await deleteDoc(doc(db, 'guests', guestId));
}

// Category Operations
export async function saveCategoryToFirestore(categoryName: string): Promise<void> {
  await setDoc(doc(db, 'categories', categoryName), {
    id: categoryName,
    name: categoryName,
  });
}

export async function deleteCategoryFromFirestore(categoryName: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', categoryName));
}

// Rate Plan Operations
export async function saveRatePlanToFirestore(plan: RatePlan): Promise<void> {
  await setDoc(doc(db, 'ratePlans', plan.id), cleanDoc(plan), { merge: true });
}

export async function deleteRatePlanFromFirestore(planId: string): Promise<void> {
  await deleteDoc(doc(db, 'ratePlans', planId));
}

// Complete Database Reset to Original Default Data
export async function resetFirestoreDatabase(): Promise<void> {
  const batch = writeBatch(db);

  // Clear existing
  const [roomsSnap, guestsSnap, categoriesSnap, ratesSnap] = await Promise.all([
    getDocs(collection(db, 'rooms')),
    getDocs(collection(db, 'guests')),
    getDocs(collection(db, 'categories')),
    getDocs(collection(db, 'ratePlans')),
  ]);

  roomsSnap.forEach((d) => batch.delete(d.ref));
  guestsSnap.forEach((d) => batch.delete(d.ref));
  categoriesSnap.forEach((d) => batch.delete(d.ref));
  ratesSnap.forEach((d) => batch.delete(d.ref));

  // Re-seed original data
  for (const r of INITIAL_ROOMS) {
    batch.set(doc(db, 'rooms', r.id), cleanDoc(r));
  }
  for (const g of INITIAL_GUESTS) {
    batch.set(doc(db, 'guests', g.id), cleanDoc(g));
  }
  for (const c of INITIAL_CATEGORIES) {
    batch.set(doc(db, 'categories', c), { id: c, name: c });
  }
  for (const p of INITIAL_RATE_PLANS) {
    batch.set(doc(db, 'ratePlans', p.id), cleanDoc(p));
  }

  batch.set(doc(db, '_system', 'init'), {
    initialized: true,
    resetAt: new Date().toISOString(),
  });

  await batch.commit();
}

// Wipe / Clear All Platform Information (Zerar Dados)
export async function clearAllFirestoreData(): Promise<void> {
  const batch = writeBatch(db);

  // Clear all rooms, guests, categories and rates
  const [roomsSnap, guestsSnap, categoriesSnap, ratesSnap] = await Promise.all([
    getDocs(collection(db, 'rooms')),
    getDocs(collection(db, 'guests')),
    getDocs(collection(db, 'categories')),
    getDocs(collection(db, 'ratePlans')),
  ]);

  roomsSnap.forEach((d) => batch.delete(d.ref));
  guestsSnap.forEach((d) => batch.delete(d.ref));
  categoriesSnap.forEach((d) => batch.delete(d.ref));
  ratesSnap.forEach((d) => batch.delete(d.ref));

  // Retain a base clean accommodation category so that the user can immediately start adding rooms
  const defaultCat = 'Standard';
  batch.set(doc(db, 'categories', defaultCat), { id: defaultCat, name: defaultCat });
  batch.set(doc(db, 'ratePlans', 'rate-standard'), {
    id: 'rate-standard',
    roomType: defaultCat,
    lowSeasonRate: 200,
    midSeasonRate: 250,
    highSeasonRate: 320,
    holidayRate: 420,
    extraPersonRate: 70,
    minNights: 1,
  });

  batch.set(doc(db, '_system', 'init'), {
    initialized: true,
    clearedAt: new Date().toISOString(),
  });

  await batch.commit();
}
