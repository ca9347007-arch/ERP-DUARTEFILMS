export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string | null;
  basePriceCents: number;
  durationMinutes: number;
  isPublic?: boolean;
  isActive?: boolean;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  vehicles?: Vehicle[];
};

export type Vehicle = {
  id: string;
  model: string;
  brand?: string | null;
  plate?: string | null;
  year?: number | null;
  color?: string | null;
};

export type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes?: string | null;
  client: Client;
  vehicle?: Vehicle | null;
  service: Service;
};

export type Product = {
  id: string;
  name: string;
  brand?: string | null;
  stockQuantity: string | number;
  minStock: string | number;
  unit: string;
  costCents: number;
};

export type FinancialEntry = {
  id: string;
  type: 'REVENUE' | 'EXPENSE';
  description: string;
  category: string;
  amountCents: number;
  status: string;
  paymentMethod?: string | null;
  createdAt: string;
};
