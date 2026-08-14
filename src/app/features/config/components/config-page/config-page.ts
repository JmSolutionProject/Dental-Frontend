import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { API_URL } from '../../../../core/config/api.config';
import { ToastService } from '../../../../shared/components/toast/toast.service';

interface RecordatorioConfig {
  enabled: boolean;
  horasAntes: number;
  plantilla: string;
}

@Component({
  selector: 'app-config-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './config-page.html',
  styleUrl: './config-page.css',
})
export class ConfigPage {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly enabled = signal(true);
  readonly horasAntes = signal(24);
  readonly plantilla = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.http
      .get<RecordatorioConfig>(`${this.apiUrl}/config/recordatorio`)
      .pipe(
        take(1),
        catchError(() => of(null)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((config) => {
        if (config) {
          this.enabled.set(config.enabled);
          this.horasAntes.set(config.horasAntes);
          this.plantilla.set(config.plantilla);
        }
      });
  }

  save() {
    this.saving.set(true);
    this.http
      .put<RecordatorioConfig>(`${this.apiUrl}/config/recordatorio`, {
        enabled: this.enabled(),
        horasAntes: this.horasAntes(),
        plantilla: this.plantilla(),
      })
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al guardar la configuración.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe((config) => {
        if (config) {
          this.enabled.set(config.enabled);
          this.horasAntes.set(config.horasAntes);
          this.plantilla.set(config.plantilla);
          this.toast.success('Configuración de recordatorios guardada.');
        }
      });
  }
}
