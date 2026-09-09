export type RoomStatus = 'livre' | 'ocupado' | 'limpeza' | 'manutenção';

export type RoomType = string;

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  area: string;
  status: RoomStatus;
  dailyRate: number;
  capacity: number;
  currentGuestId?: string;
  currentGuestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

export type ReservationStatus = 'Hospedado' | 'Confirmada' | 'Check-out' | 'Cancelada';

export interface GuestReservation {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  dailyRate: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  status: ReservationStatus;
  notes: string;
  createdAt: string;
}

export interface RatePlan {
  id: string;
  roomType: RoomType;
  lowSeasonRate: number;
  midSeasonRate: number;
  highSeasonRate: number;
  holidayRate: number;
  extraPersonRate: number;
  minNights: number;
}

export type ActiveTab = 'hospedes' | 'quartos' | 'valores' | 'calendario';

export type SubscriptionPlanType = 'basico' | 'profissional' | 'premium' | 'king';

export interface SubscriptionPlanInfo {
  type: SubscriptionPlanType;
  name: string;
  roomLimit: number;
  roomLimitText: string;
  pricePerMonth: number;
  priceText: string;
  description: string;
}

export interface ClientAccount {
  id: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  responsibleName: string;
  responsibleCpf: string;
  plan: SubscriptionPlanType;
  accessKey: string;
  createdAt: string;
}
