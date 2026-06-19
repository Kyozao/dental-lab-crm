export type CustomerDentist = {
  id: string;
  name: string;
};

export type CustomerPriceTableSummary = {
  id: string;
  name: string;
};

export type Dentist = {
  id: string;
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  price_table: CustomerPriceTableSummary | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  dentists: CustomerDentist[];
};

export type CustomerPayload = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  price_table_id: string | null;
  is_active: boolean;
};

export type DentistPayload = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  is_active: boolean;
};

export type CustomerDashboardSummary = {
  dentistCount: number;
  totalCases: number;
  openCases: number;
  overdueCases: number;
  dueSoonCases: number;
  totalSnapshotValue: string;
  currency: string;
};

export type CustomerDashboardBreakdownItem = {
  key: string;
  label: string;
  count: number;
};

export type CustomerRecentCase = {
  id: string;
  code: string;
  patientName: string;
  currentStatus: string;
  dueDate: string | null;
  updatedAt: string;
  snapshotValue: string;
  serviceSummary: string;
};

export type CustomerDashboard = {
  summary: CustomerDashboardSummary;
  statusBreakdown: CustomerDashboardBreakdownItem[];
  serviceMix: CustomerDashboardBreakdownItem[];
  recentCases: CustomerRecentCase[];
};

export type CustomerDetail = Omit<Customer, "dentists"> & {
  price_table_id: string | null;
  dentists: Dentist[];
  dashboard: CustomerDashboard;
  deleted_at: string | null;
};
