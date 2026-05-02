import { Service, Professional } from './types';

export const SERVICES: Service[] = [
  { id: 'gel', name: 'Unhas em gel', category: 'Aplicação' },
  { id: 'esmalte-gel', name: 'Esmaltação em gel', category: 'Aplicação' },
  { id: 'blindagem', name: 'Blindagem', category: 'Aplicação' },
  { id: 'decoracao', name: 'Decoração Geral', category: 'Decoração' },
  { id: 'manutencao', name: 'Manutenção', category: 'Remoção' },
  { id: 'remocao', name: 'Remoção do gel', category: 'Remoção' },
];

export const PROFESSIONALS: Professional[] = [
  {
    id: 'estela',
    name: 'Estela Vaz',
    role: 'Especialista em Alongamentos',
    avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop',
    services: [
      { serviceId: 'gel', price: 150 },
      { serviceId: 'esmalte-gel', price: 80 },
      { serviceId: 'blindagem', price: 90 },
      { serviceId: 'manutencao', price: 100 },
      { serviceId: 'remocao', price: 50 },
      { serviceId: 'decoracao', price: 20 },
    ]
  },
  {
    id: 'carla',
    name: 'Carla Silva',
    role: 'Manicure & Pedicure',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    services: [
      { serviceId: 'esmalte-gel', price: 70 },
      { serviceId: 'blindagem', price: 85 },
      { serviceId: 'decoracao', price: 15 },
    ]
  }
];

export const COLORS = {
  primary: '#8B4444', 
  secondary: '#F2EEEB', 
  accent: '#f5f2ed', 
  text: '#4A4A4A',
};

export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'
];
