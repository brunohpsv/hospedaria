import { SubscriptionPlanType, SubscriptionPlanInfo, ClientAccount } from '../types';

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanType, SubscriptionPlanInfo> = {
  basico: {
    type: 'basico',
    name: 'Básico',
    roomLimit: 10,
    roomLimitText: 'Até 10 quartos',
    pricePerMonth: 79,
    priceText: 'R$ 79/mês',
    description: 'Ideal para pousadas compactas e chalés familiares.',
  },
  profissional: {
    type: 'profissional',
    name: 'Profissional',
    roomLimit: 30,
    roomLimitText: 'Até 30 quartos',
    pricePerMonth: 149,
    priceText: 'R$ 149/mês',
    description: 'Perfeito para hotéis médios, pousadas boutique e vilas.',
  },
  premium: {
    type: 'premium',
    name: 'Premium',
    roomLimit: 60,
    roomLimitText: 'Até 60 quartos',
    pricePerMonth: 249,
    priceText: 'R$ 249/mês',
    description: 'Para hotéis de médio/grande porte e resorts regionais.',
  },
  king: {
    type: 'king',
    name: 'King',
    roomLimit: 999,
    roomLimitText: 'Até 100+ quartos',
    pricePerMonth: 399,
    priceText: 'R$ 399/mês',
    description: 'Capacidade ilimitada para redes hoteleiras e grandes operações.',
  },
};

/**
 * Validação rigorosa da Chave de Acesso:
 * - 8 dígitos/caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 3 números
 * - Pelo menos 1 símbolo
 */
export function validateAccessKey(key: string): {
  isValid: boolean;
  errors: string[];
  rules: {
    length: boolean;
    uppercase: boolean;
    numbers: boolean;
    symbol: boolean;
  };
} {
  const trimmed = key.trim();
  const length = trimmed.length === 8;
  const uppercase = /[A-Z]/.test(trimmed);
  const numbersCount = (trimmed.match(/[0-9]/g) || []).length;
  const numbers = numbersCount >= 3;
  const symbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(trimmed);

  const errors: string[] = [];
  if (!length) errors.push('A chave deve conter exatamente 8 dígitos/caracteres.');
  if (!uppercase) errors.push('Deve conter pelo menos 1 letra maiúscula (A-Z).');
  if (!numbers) errors.push(`Deve conter pelo menos 3 números (atual: ${numbersCount}).`);
  if (!symbol) errors.push('Deve conter pelo menos 1 símbolo (ex: !, @, #, $, %, etc.).');

  return {
    isValid: length && uppercase && numbers && symbol,
    errors,
    rules: {
      length,
      uppercase,
      numbers,
      symbol,
    },
  };
}

export const DEMO_CLIENT: ClientAccount = {
  id: 'client-demo-default',
  establishmentName: 'Pousada Recanto dos Pássaros',
  cpfCnpj: '12.345.678/0001-90',
  email: 'gerencia@hotelrecanto.com.br',
  phone: '(11) 98765-4321',
  responsibleName: 'Administrador Padrão',
  responsibleCpf: '123.456.789-00',
  plan: 'profissional',
  accessKey: 'Hosp123!',
  createdAt: '2026-01-01',
};
