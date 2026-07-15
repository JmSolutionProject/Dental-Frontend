import { Injectable } from '@angular/core';
import { AppointmentApiRepository } from '../infrastructure/appointment-api.repository';

@Injectable({
  providedIn: 'root',
})
export class AppointmentsService extends AppointmentApiRepository {}
