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
  quotes?: Quote[];
};

export type QuoteItem = {
  id: string;
  serviceId?: string | null;
  service?: Service | null;
  productId?: string | null;
  product?: Product | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type WorkOrder = {
  id: string;
  code?: string | null;
  sequence?: number | null;
  status: string;
  createdAt: string;
};

export type Quote = {
  id: string;
  code?: string | null;
  sequence?: number | null;
  title: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  validUntil?: string | null;
  issuedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  client: Client;
  vehicle?: Vehicle | null;
  appointment?: Appointment | null;
  items: QuoteItem[];
  workOrders?: WorkOrder[];
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

export type CompanySettings = {
  fantasyName: string;
  legalName?: string;
  document?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  defaultQuoteValidityDays: number;
  quoteWarrantyText?: string;
  quotePaymentText?: string;
  businessHours?: string;
};
