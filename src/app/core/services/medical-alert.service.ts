import { Injectable } from '@angular/core';

export interface MedicalHistoryData {
  allergies: string[];
  diseases: string[];
  specialConditions: string[];
  dentalHistory: string[];
  takesMedication: boolean;
}

export interface SystemMedicalAlert {
  level: 'CRÍTICO' | 'ALERTA';
  title: string;
  detail: string;
  severity: 'high' | 'medium';
}

/**
 * Pure domain service that evaluates medical alerts from a patient's history.
 * Keeps clinical rules out of UI components and makes them testable.
 */
@Injectable({
  providedIn: 'root',
})
export class MedicalAlertService {
  evaluate(
    data: MedicalHistoryData,
    customAllergy = '',
  ): SystemMedicalAlert[] {
    const alerts: SystemMedicalAlert[] = [];
    const allergies = data.allergies;
    const customAllergyLower = customAllergy.toLowerCase();
    const diseases = data.diseases;
    const specialConds = data.specialConditions;

    if (
      allergies.includes('Penicilina') ||
      allergies.includes('Amoxicilina') ||
      customAllergyLower.includes('penicil')
    ) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'ALERGIA A PENICILINA / BETA-LACTÁMICOS',
        detail:
          'Contraindicada la prescripcion de Amoxicilina o derivados. Usar Clindamicina o Azitromicina.',
        severity: 'high',
      });
    }

    if (
      allergies.includes('Anestesicos locales') ||
      customAllergyLower.includes('anest')
    ) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'ALERGIA A ANESTÉSICOS LOCALES',
        detail:
          'Riesgo de anafilaxia. Evaluar molecula anestesica alternativa sin preservantes.',
        severity: 'high',
      });
    }

    if (allergies.includes('Latex')) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'HIPERSENSIBILIDAD AL LÁTEX',
        detail:
          'Uso obligatorio de guantes y diques de aislamiento de Nitrilo/Vinilo.',
        severity: 'high',
      });
    }

    if (diseases.includes('Diabetes')) {
      alerts.push({
        level: 'ALERTA',
        title: 'PACIENTE DIABÉTICO',
        detail:
          'Riesgo de infeccion peri-implantar e hiperglicemia. Controlar profilaxis antibiotica.',
        severity: 'high',
      });
    }

    if (diseases.includes('Hipertension arterial')) {
      alerts.push({
        level: 'ALERTA',
        title: 'HIPERTENSIÓN ARTERIAL',
        detail:
          'Control de Pa previa a anestesia. Restringir uso de vasoconstrictor Epinefrina 1:80,000.',
        severity: 'high',
      });
    }

    if (diseases.includes('Trastornos de coagulacion')) {
      alerts.push({
        level: 'ALERTA',
        title: 'TRATAMIENTO ANTICOAGULANTE / COAGULOPATÍA',
        detail:
          'Riesgo de sangrado quirurgico. Requerir examen de laboratorio INR actualizado.',
        severity: 'high',
      });
    }

    if (specialConds.includes('Embarazo')) {
      alerts.push({
        level: 'ALERTA',
        title: 'PACIENTE GESTANTE',
        detail:
          'Evitar toma de radiografias y uso de AINEs en tercer trimestre.',
        severity: 'high',
      });
    }

    if (
      specialConds.includes('Marcapasos') ||
      diseases.includes('Enfermedad cardiaca')
    ) {
      alerts.push({
        level: 'ALERTA',
        title: 'MARCAPASOS / ANTECEDENTE CARDÍACO',
        detail:
          'Restriccion de equipos electromagneticos de alta frecuencia.',
        severity: 'high',
      });
    }

    if (
      specialConds.includes('Quimioterapia') ||
      specialConds.includes('Radioterapia')
    ) {
      alerts.push({
        level: 'ALERTA',
        title: 'QUIMIOTERAPIA / RADIOTERAPIA EN CURSO',
        detail:
          'Riesgo de osteorradionecrosis maxilar y mucositis severa.',
        severity: 'high',
      });
    }

    return alerts;
  }
}
