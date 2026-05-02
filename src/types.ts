export interface Service {
  id: string;
  name: string;
  category: 'Aplicação' | 'Decoração' | 'Remoção';
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  avatar: string;
  services: {
    serviceId: string;
    price: number;
  }[];
}

export interface Appointment {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  professionalId: string;
  professionalName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  date: string; // ISO format
  time: string; // HH:mm
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'verified';
  pixCode?: string;
  description?: string;
  createdAt: string;
}

export interface DayOff {
  id?: string;
  date: string;
  reason?: string;
}

export interface UserStatus {
  id?: string;
  email?: string;
  lastUsedName?: string;
  lastUsedPhone?: string;
  isBlocked: boolean;
  isFlagged: boolean;
  adminNotes?: string;
  updatedAt: string;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  description?: string;
  createdAt: string;
}

export interface TimeBlock {
  id: string;
  professionalId: string;
  date: string;
  time: string;
  reason: string;
}
