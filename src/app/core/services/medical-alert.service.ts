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
  /** Normalize a string for accent-insensitive comparison */
  private normalize(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private includes(list: string[], target: string): boolean {
    const norm = this.normalize(target);
    return list.some((item) => this.normalize(item) === norm);
  }

  evaluate(
    data: MedicalHistoryData,
    customAllergy = '',
  ): SystemMedicalAlert[] {
    const alerts: SystemMedicalAlert[] = [];
    const allergies = data.allergies;
    const customAllergyLower = customAllergy.toLowerCase();
    const diseases = data.diseases;
    const specialConds = data.specialConditions;

    // — ALERGIAS CRÍTICAS —

    if (
      this.includes(allergies, 'Penicilina') ||
      this.includes(allergies, 'Amoxicilina') ||
      customAllergyLower.includes('penicil')
    ) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'Alergia a Penicilina / Beta-Lactámicos',
        detail:
          'Contraindicada la prescripción de Amoxicilina o derivados. Usar Clindamicina o Azitromicina.',
        severity: 'high',
      });
    }

    if (
      this.includes(allergies, 'Anestésicos locales') ||
      customAllergyLower.includes('anest')
    ) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'Alergia a Anestésicos Locales',
        detail:
          'Riesgo de anafilaxia. Evaluar molécula anestésica alternativa sin preservantes.',
        severity: 'high',
      });
    }

    if (this.includes(allergies, 'Látex')) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'Hipersensibilidad al Látex',
        detail:
          'Uso obligatorio de guantes y diques de aislamiento de Nitrilo/Vinilo.',
        severity: 'high',
      });
    }

    // — ENFERMEDADES SISTÉMICAS —

    if (this.includes(diseases, 'Diabetes')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente Diabético',
        detail:
          'Riesgo de infección peri-implantar e hiperglicemia. Controlar profilaxis antibiótica.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'Hipertensión arterial')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Hipertensión Arterial',
        detail:
          'Control de PA previa a anestesia. Restringir uso de vasoconstrictor Epinefrina 1:80,000.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'Trastornos de coagulación')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Tratamiento Anticoagulante / Coagulopatía',
        detail:
          'Riesgo de sangrado quirúrgico. Requerir examen de laboratorio INR actualizado.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'Asma')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente Asmático',
        detail:
          'Precaución con AINEs y analgésicos que puedan desencadenar broncoespasmo.',
        severity: 'medium',
      });
    }

    if (this.includes(diseases, 'Epilepsia')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente Epiléptico',
        detail:
          'Controlar el estrés del procedimiento. Evitar estímulos lumínicos intensos.',
        severity: 'medium',
      });
    }

    if (this.includes(diseases, 'Enfermedad renal')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Enfermedad Renal',
        detail:
          'Ajustar dosis de medicamentos. Evitar AINEs y fármacos nefrotóxicos.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'Enfermedad hepática')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Enfermedad Hepática',
        detail:
          'Riesgo de sangrado y alteración en metabolismo de fármacos. Solicitar perfil hepático.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'VIH')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente VIH Positivo',
        detail:
          'Protocolo de bioseguridad reforzado. Evaluar conteo de CD4 para cirugías.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'Hepatitis')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Hepatitis',
        detail:
          'Protocolo de bioseguridad reforzado. Precaución con fármacos de metabolismo hepático.',
        severity: 'high',
      });
    }

    if (this.includes(diseases, 'Cáncer')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente Oncológico',
        detail:
          'Evaluar estado de inmunosupresión. Coordinar con equipo oncológico antes de procedimientos invasivos.',
        severity: 'high',
      });
    }

    // — CONDICIONES ESPECIALES —

    if (this.includes(specialConds, 'Embarazo')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente Gestante',
        detail:
          'Evitar toma de radiografías y uso de AINEs en tercer trimestre.',
        severity: 'high',
      });
    }

    if (this.includes(specialConds, 'Lactancia')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente en Lactancia',
        detail:
          'Precaución con prescripción de fármacos que se excretan por leche materna.',
        severity: 'medium',
      });
    }

    if (
      this.includes(specialConds, 'Marcapasos') ||
      this.includes(diseases, 'Enfermedad cardíaca')
    ) {
      alerts.push({
        level: 'ALERTA',
        title: 'Marcapasos / Antecedente Cardíaco',
        detail:
          'Restricción de equipos electromagnéticos de alta frecuencia.',
        severity: 'high',
      });
    }

    if (this.includes(specialConds, 'Prótesis o válvula cardíaca')) {
      alerts.push({
        level: 'CRÍTICO',
        title: 'Prótesis Valvular Cardíaca',
        detail:
          'Profilaxis antibiótica obligatoria previa a procedimientos invasivos (AHA: Amoxicilina 2g VO 1h antes).',
        severity: 'high',
      });
    }

    if (this.includes(specialConds, 'Trasplante de órganos')) {
      alerts.push({
        level: 'ALERTA',
        title: 'Paciente Trasplantado',
        detail:
          'Inmunosupresión crónica. Coordinar con equipo médico tratante.',
        severity: 'high',
      });
    }

    if (
      this.includes(specialConds, 'Quimioterapia') ||
      this.includes(specialConds, 'Radioterapia')
    ) {
      alerts.push({
        level: 'ALERTA',
        title: 'Quimioterapia / Radioterapia en Curso',
        detail:
          'Riesgo de osteorradionecrosis maxilar y mucositis severa.',
        severity: 'high',
      });
    }

    // — ALERGIAS PERSONALIZADAS (no predefinidas) —
    const knownAllergyKeys = [
      'penicilina', 'amoxicilina', 'clindamicina', 'anestesicos locales',
      'ibuprofeno', 'aspirina', 'latex', 'yodo', 'ninguna', 'ninguno',
    ];
    const otherAllergies = allergies.filter(
      (a) => a && !knownAllergyKeys.includes(this.normalize(a)),
    );
    for (const other of otherAllergies) {
      alerts.push({
        level: 'ALERTA',
        title: other.trim(),
        detail: `Hipersensibilidad reportada a ${other.trim()}. Precaución al prescribir o aplicar tratamiento.`,
        severity: 'medium',
      });
    }

    // — ENFERMEDADES PERSONALIZADAS (no predefinidas) —
    const knownDiseaseKeys = [
      'diabetes', 'hipertension arterial', 'enfermedad cardiaca',
      'trastornos de coagulacion', 'asma', 'epilepsia', 'enfermedad renal',
      'enfermedad hepatica', 'osteoporosis', 'vih', 'hepatitis', 'cancer',
      'problemas de tiroides', 'ninguna', 'ninguno',
    ];
    const otherDiseases = diseases.filter(
      (d) => d && !knownDiseaseKeys.includes(this.normalize(d)),
    );
    for (const other of otherDiseases) {
      alerts.push({
        level: 'ALERTA',
        title: other.trim(),
        detail: `Condición sistémica reportada: ${other.trim()}. Evaluar precauciones clínicas necesarias.`,
        severity: 'medium',
      });
    }

    return alerts;
  }
}
