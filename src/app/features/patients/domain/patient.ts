export interface MedicalHistory {
  allergies: string[];
  conditions: string[];
  specialConditions?: string[];
  dentalHistory?: string[];
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
  observaciones?: string;
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

export interface TreatmentPlanItem {
  id: string;
  serviceId?: string;
  serviceName: string;
  price: number;
  ejecutado?: boolean;
}

export interface TreatmentPlan {
  id: string;
  name: string;
  date: string;
  items: TreatmentPlanItem[];
  totalCost: number;
  doctorId?: string;
  estado?: string;
  observaciones?: string;
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
