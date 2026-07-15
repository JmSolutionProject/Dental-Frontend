import { Injectable } from '@angular/core';
import { PatientApiRepository } from '../infrastructure/patient-api.repository';

@Injectable({
  providedIn: 'root',
})
export class PatientsService extends PatientApiRepository {}
