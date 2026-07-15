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
