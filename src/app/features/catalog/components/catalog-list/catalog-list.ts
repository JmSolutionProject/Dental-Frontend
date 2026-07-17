import { Component, inject, signal, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { CatalogService, SaveCatalogServiceRequest } from '../../domain/catalog';
import { GetCatalogUseCase } from '../../application/get-catalog.usecase';
import { SaveCatalogUseCase } from '../../application/save-catalog.usecase';
import { DeleteCatalogUseCase } from '../../application/delete-catalog.usecase';

@Component({
  selector: 'app-catalog-list',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, CurrencyPipe],
  templateUrl: './catalog-list.html',
  styleUrl: './catalog-list.css',
})
export class CatalogList implements OnInit {
  private readonly getCatalog = inject(GetCatalogUseCase);
  private readonly saveCatalog = inject(SaveCatalogUseCase);
  private readonly deleteCatalog = inject(DeleteCatalogUseCase);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly services = signal<CatalogService[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly editingService = signal<CatalogService | null>(null);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    categoryId: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    description: [''],
  });

  ngOnInit() {
    this.loadCatalog();
  }

  loadCatalog() {
    this.loading.set(true);
    this.getCatalog
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al cargar el catálogo de servicios');
          return of([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((data) => {
        this.services.set(data);
      });
  }

  openCreateModal() {
    this.editingService.set(null);
    this.form.reset({ price: 0, description: '' });
    this.showModal.set(true);
  }

  openEditModal(service: CatalogService) {
    this.editingService.set(service);
    this.form.patchValue({
      name: service.name,
      categoryId: service.categoryId,
      price: service.price,
      description: service.description,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const request: SaveCatalogServiceRequest = this.form.getRawValue();
    const editingId = this.editingService()?.id;

    this.saveCatalog
      .execute(request, editingId)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al guardar el servicio');
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe((result) => {
        if (result) {
          this.toast.success('Servicio guardado exitosamente');
          this.loadCatalog();
          this.closeModal();
        }
      });
  }

  deleteService(id: string) {
    if (!confirm('¿Está seguro de que desea eliminar este servicio?')) return;
    
    this.deleteCatalog
      .execute(id)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al eliminar el servicio');
          return of(false);
        })
      )
      .subscribe((success) => {
        if (success) {
          this.toast.success('Servicio eliminado exitosamente');
          this.loadCatalog();
        }
      });
  }
}
