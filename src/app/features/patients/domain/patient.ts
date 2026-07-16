export interface MedicalHistory {
  allergies: string[];
  conditions: string[];
  medications: string[];
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate?: string;
  status: PatientStatus;
  medicalHistory: MedicalHistory;
  notes: string;
}

export type PatientStatus = 'active' | 'inactive' | 'deleted';

export type CreatePatientRequest = Omit<
  Patient,
  'id' | 'status' | 'medicalHistory' | 'notes'
> & {
  status?: PatientStatus;
  medicalHistory?: Partial<MedicalHistory>;
  notes?: string;
};

export type UpdatePatientRequest = Partial<Omit<Patient, 'id'>>;

export interface SystemMedicalAlert {
  level: 'CRÍTICO' | 'ALERTA';
  title: string;
  detail: string;
  severity: 'high' | 'medium';
}

export interface AppointmentRecord {
  id: string;
  date: string;
  doctor: string;
  reason: string;
  status: 'Finalizada' | 'Programada' | 'Cancelada' | 'En atención';
}

export interface BudgetItemRecord {
  id: string;
  treatment: string;
  toothPiece: string;
  price: number;
  status: 'Pagado' | 'Pendiente';
}

export interface PaymentRecord {
  id: string;
  date: string;
  concept: string;
  method: 'Efectivo' | 'Tarjeta de Crédito/Débito' | 'Yape / Plin' | 'Transferencia Bancaria';
  amount: number;
}

export interface InstallmentRecord {
  id: string;
  date: string;
  amount: number;
  status: 'Pendiente' | 'Pagado';
}

export interface TreatmentPlanItem {
  id: string;
  serviceName: string;
  price: number;
}

export interface TreatmentPlan {
  id: string;
  name: string;
  date: string;
  items: TreatmentPlanItem[];
  totalCost: number;
  paymentType: 'Al Contado' | 'A Cuotas';
  installments?: InstallmentRecord[];
}

export const ALLERGY_OPTIONS = [
  'Penicilina',
  'Amoxicilina',
  'Clindamicina',
  'Anestésicos locales',
  'Ibuprofeno',
  'Aspirina',
  'Látex',
  'Yodo',
];

export const DISEASE_OPTIONS = [
  'Diabetes',
  'Hipertensión arterial',
  'Enfermedad cardíaca',
  'Trastornos de coagulación',
  'Asma',
  'Epilepsia',
  'Enfermedad renal',
  'Enfermedad hepática',
  'Osteoporosis',
  'VIH',
  'Hepatitis',
  'Cáncer',
  'Problemas de tiroides',
];

export const SPECIAL_CONDITION_OPTIONS = [
  'Embarazo',
  'Lactancia',
  'Marcapasos',
  'Prótesis o válvula cardíaca',
  'Trasplante de órganos',
  'Quimioterapia',
  'Radioterapia',
];

export const DENTAL_HISTORY_OPTIONS = [
  'Problemas con anestesia dental',
  'Sangrado excesivo después de extracciones',
  'Cirugías bucales previas',
  'Implantes dentales',
  'Ortodoncia',
  'Endodoncia',
  'Bruxismo',
  'Enfermedad periodontal',
  'Endocarditis previa',
];
