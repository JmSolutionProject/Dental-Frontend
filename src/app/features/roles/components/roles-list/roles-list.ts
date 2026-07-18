import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Table, TableCell, TableColumn } from '../../../../shared/components/table/table';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Role, SaveRoleRequest } from '../../domain/role';
import { GetRolesUseCase } from '../../application/get-roles.usecase';
import { SaveRoleUseCase } from '../../application/save-role.usecase';
import { DeleteRoleUseCase } from '../../application/delete-role.usecase';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Table, TableCell],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.css',
})
export class RolesList implements OnInit {
  private readonly getRoles = inject(GetRolesUseCase);
  private readonly saveRole = inject(SaveRoleUseCase);
  private readonly deleteRole = inject(DeleteRoleUseCase);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly editingRole = signal<Role | null>(null);

  readonly columns: TableColumn[] = [
    { key: 'nombreRol', label: 'Nombre del Rol' },
    { key: 'estado', label: 'Estado' },
    { key: 'actions', label: 'Acciones', align: 'right' },
  ];

  readonly form: FormGroup = this.fb.group({
    nombreRol: ['', [Validators.required]],
    estado: ['Activo', [Validators.required]],
  });

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.loading.set(true);
    this.getRoles
      .execute()
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al cargar roles');
          return of([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((data) => {
        this.roles.set(data);
      });
  }

  openCreateModal() {
    this.editingRole.set(null);
    this.form.reset({ estado: 'active' });
    this.showModal.set(true);
  }

  openEditModal(role: Role) {
    this.editingRole.set(role);
    this.form.patchValue({
      nombreRol: role.nombreRol,
      estado: role.estado,
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
    const request: SaveRoleRequest = this.form.getRawValue();
    const editingId = this.editingRole()?.id;

    this.saveRole
      .execute(request, editingId)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al guardar el rol');
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe((result) => {
        if (result) {
          this.toast.success('Rol guardado exitosamente');
          this.loadRoles();
          this.closeModal();
        }
      });
  }

  deleteRoleRecord(id: string) {
    if (!confirm('¿Está seguro de que desea desactivar este rol?')) return;
    
    this.deleteRole
      .execute(id)
      .pipe(
        take(1),
        catchError(() => {
          this.toast.error('Error al eliminar el rol');
          return of(false);
        })
      )
      .subscribe((success) => {
        if (success) {
          this.toast.success('Rol desactivado exitosamente');
          this.loadRoles();
        }
      });
  }
}
