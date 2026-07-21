import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { CatalogCategory, CatalogService, SaveCatalogServiceRequest } from '../../domain/catalog';
import { GetCatalogUseCase } from '../../application/get-catalog.usecase';
import { SaveCatalogUseCase } from '../../application/save-catalog.usecase';
import { DeleteCatalogUseCase } from '../../application/delete-catalog.usecase';
import { GetCatalogCategoriesUseCase } from '../../application/get-catalog-categories.usecase';
import { CreateCatalogCategoryUseCase } from '../../application/create-catalog-category.usecase';
import { UpdateCatalogCategoryUseCase } from '../../application/update-catalog-category.usecase';
import { DeleteCatalogCategoryUseCase } from '../../application/delete-catalog-category.usecase';

interface ServiceGroup {
  categoryId?: string;
  categoryName: string;
  services: CatalogService[];
}

@Component({
  selector: 'app-catalog-list',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, FormField, CurrencyPipe],
  templateUrl: './catalog-list.html',
  styleUrl: './catalog-list.css',
})
export class CatalogList implements OnInit {
  private readonly getCatalog = inject(GetCatalogUseCase);
  private readonly saveCatalog = inject(SaveCatalogUseCase);
  private readonly deleteCatalog = inject(DeleteCatalogUseCase);
  private readonly getCategoriesUseCase = inject(GetCatalogCategoriesUseCase);
  private readonly createCategoryUseCase = inject(CreateCatalogCategoryUseCase);
  private readonly updateCategoryUseCase = inject(UpdateCatalogCategoryUseCase);
  private readonly deleteCategoryUseCase = inject(DeleteCatalogCategoryUseCase);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly services = signal<CatalogService[]>([]);
  readonly allCategories = signal<CatalogCategory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly showCategoryModal = signal(false);
  readonly savingCategory = signal(false);
  readonly editingService = signal<CatalogService | null>(null);
  readonly editingCategory = signal<CatalogCategory | null>(null);

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    categoryId: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    description: [''],
  });

  readonly categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
  });

  readonly categories = computed<CatalogCategory[]>(() => {
    return this.allCategories();
  });

  readonly groupedServices = computed<ServiceGroup[]>(() => {
    const map = new Map<string, ServiceGroup>();

    // Always include all categories so empty categories are displayed and manageable
    for (const cat of this.allCategories()) {
      map.set(cat.id, {
        categoryId: cat.id,
        categoryName: cat.name,
        services: [],
      });
    }

    // Populate services into categories
    for (const svc of this.services()) {
      const key = svc.categoryId || svc.categoryName || 'uncategorized';
      let group = map.get(key);
      if (!group) {
        group = { categoryId: svc.categoryId, categoryName: svc.categoryName || 'Sin categoría', services: [] };
        map.set(key, group);
      }
      group.services.push(svc);
    }

    return Array.from(map.values());
  });

  ngOnInit() {
    this.loadCatalog();
    this.loadCategories();
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
        finalize(() => this.loading.set(false)),
      )
      .subscribe((data) => this.services.set(data));
  }

  loadCategories() {
    this.getCategoriesUseCase
      .execute()
      .pipe(
        take(1),
        catchError(() => of([])),
      )
      .subscribe((data) => this.allCategories.set(data));
  }

  openCategoryModal() {
    this.editingCategory.set(null);
    this.categoryForm.reset();
    this.showCategoryModal.set(true);
  }

  openEditCategoryModal(categoryId: string, categoryName: string) {
    this.editingCategory.set({ id: categoryId, name: categoryName });
    this.categoryForm.patchValue({ name: categoryName });
    this.showCategoryModal.set(true);
  }

  closeCategoryModal() {
    this.showCategoryModal.set(false);
  }

  readonly showConfirmDeleteModal = signal(false);
  readonly deletingItem = signal<{ type: 'category' | 'service'; id: string; name: string } | null>(null);
  readonly deletingState = signal(false);

  confirmDeleteCategory(categoryId?: string, categoryName?: string) {
    if (!categoryId) return;
    this.deletingItem.set({ type: 'category', id: categoryId, name: categoryName || 'Categoría' });
    this.showConfirmDeleteModal.set(true);
  }

  confirmDeleteService(service: CatalogService) {
    this.deletingItem.set({ type: 'service', id: service.id, name: service.name });
    this.showConfirmDeleteModal.set(true);
  }

  closeConfirmDeleteModal() {
    this.showConfirmDeleteModal.set(false);
    this.deletingItem.set(null);
  }

  executeDelete() {
    const item = this.deletingItem();
    if (!item) return;

    this.deletingState.set(true);

    if (item.type === 'category') {
      this.deleteCategoryUseCase
        .execute(item.id)
        .pipe(
          take(1),
          catchError((err) => {
            console.error('Error al eliminar categoría:', err);
            this.toast.error(err?.error?.message || 'Error al eliminar la categoría');
            return of(false);
          }),
          finalize(() => this.deletingState.set(false)),
        )
        .subscribe((success) => {
          if (success) {
            this.toast.success(`Categoría "${item.name}" eliminada exitosamente`);
            this.loadCategories();
            this.loadCatalog();
            this.closeConfirmDeleteModal();
          }
        });
    } else {
      this.deleteCatalog
        .execute(item.id)
        .pipe(
          take(1),
          catchError((err) => {
            console.error('Error al eliminar servicio:', err);
            this.toast.error(err?.error?.message || 'Error al eliminar el servicio');
            return of(false);
          }),
          finalize(() => this.deletingState.set(false)),
        )
        .subscribe((success) => {
          if (success) {
            this.toast.success(`Servicio "${item.name}" eliminado exitosamente`);
            this.loadCatalog();
            this.closeConfirmDeleteModal();
          }
        });
    }
  }

  saveCategory() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const name = (this.categoryForm.value.name as string).trim();
    this.savingCategory.set(true);
    const editingId = this.editingCategory()?.id;

    const stream$ = editingId
      ? this.updateCategoryUseCase.execute(editingId, name)
      : this.createCategoryUseCase.execute(name);

    stream$
      .pipe(
        take(1),
        catchError((err) => {
          console.error('Error al guardar categoría:', err);
          this.toast.error(err?.error?.message || 'Error al guardar la categoría');
          return of(null);
        }),
        finalize(() => this.savingCategory.set(false)),
      )
      .subscribe((res) => {
        if (res) {
          this.toast.success(`Categoría "${res.name}" guardada exitosamente`);
          this.loadCategories();
          this.loadCatalog();
          this.closeCategoryModal();
          if (this.showModal()) {
            this.form.patchValue({ categoryId: res.id });
          }
        }
      });
  }

  openCreateModal(categoryId?: string) {
    this.loadCategories();
    this.editingService.set(null);
    this.form.reset({ price: 0, description: '', name: '', categoryId: categoryId ?? '' });
    this.showModal.set(true);
  }

  openEditModal(service: CatalogService) {
    this.loadCategories();
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
    const raw = this.form.getRawValue();
    const request: SaveCatalogServiceRequest = {
      name: (raw.name as string).trim(),
      categoryId: (raw.categoryId as string).trim(),
      price: Number(raw.price) || 0,
      description: (raw.description as string)?.trim() || '',
    };
    const editingId = this.editingService()?.id;

    this.saveCatalog
      .execute(request, editingId)
      .pipe(
        take(1),
        catchError((err) => {
          console.error('Error al guardar servicio:', err);
          this.toast.error(err?.error?.message || 'Error al guardar el servicio');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
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
        }),
      )
      .subscribe((success) => {
        if (success) {
          this.toast.success('Servicio eliminado exitosamente');
          this.loadCatalog();
        }
      });
  }
}
