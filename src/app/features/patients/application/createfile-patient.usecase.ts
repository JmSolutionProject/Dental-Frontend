import { Injectable } from "@angular/core";
import { inject } from "@angular/core/primitives/di";
import { PatientRepository } from "../domain/patient.repository";

@Injectable({
  providedIn: 'root',
})
export class CreateFilePatientUseCase {

  private readonly repository = inject(PatientRepository)

  async execute(file: File) {
    return this.repository.createFile(file)
  }
}
