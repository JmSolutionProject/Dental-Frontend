import { Component, inject, signal, OnInit, computed, ElementRef, viewChild, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { take, catchError, of, finalize, map, switchMap } from 'rxjs';
import { API_URL } from '../../../../core/config/api.config';
import { Modal } from '../../../../shared/components/modal/modal';
import { Table, TableCell, TableColumn } from '../../../../shared/components/table/table';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { SaveUserRequest, UpdateUserRequest, User } from '../../domain/user';
import { UserRepository } from '../../infrastructure/user-api.repository';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroClipboardDocumentList, heroHeart, heroShieldCheck, heroUsers } from '@ng-icons/heroicons/outline';

interface Role { id: number; nombreRol: string; estado?: boolean; }
interface DropdownPos { top: number; left: number; width: number; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Table, TableCell, NgIcon],
  providers: [provideIcons({ heroClipboardDocumentList, heroHeart, heroShieldCheck, heroUsers })],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList implements OnInit {
  private readonly repo = inject(UserRepository);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<User[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly selectedRoleId = signal<number | null>(null);
  readonly activeTab = signal<'all' | 'medico' | 'secretaria' | 'admin'>('all');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly dropdownOpen = signal(false);
  readonly dropdownPos = signal<DropdownPos>({ top: 0, left: 0, width: 0 });

  readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('triggerRef');

  readonly columns: TableColumn[] = [
    { key: 'nombreCompleto', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Rol' },
    { key: 'porcentajeComision', label: 'Comisión' },
    { key: 'estado', label: 'Estado' },
    { key: 'actions', label: 'Acciones', align: 'right' },
  ];

  readonly form: FormGroup = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    porcentajeComision: [0, [Validators.min(0), Validators.max(100)]],
  });

  readonly isMedicoSelected = computed(() => {
    const id = this.selectedRoleId();
    if (id === null) return false;
    const roleName = this.roles().find((r) => r.id === id)?.nombreRol?.toUpperCase();
    return roleName === 'MEDICO' || roleName === 'DENTIST' || roleName === 'DOCTOR';
  });

  readonly selectedRoleLabel = computed(() => {
    const id = this.selectedRoleId();
    if (id === null) return 'Seleccionar rol';
    return this.roles().find((r) => r.id === id)?.nombreRol ?? 'Seleccionar rol';
  });

  readonly filteredUsers = computed(() => {
    const tab = this.activeTab();
    const list = this.users();
    if (tab === 'all') return list;

    return list.filter((u) => {
      const userRolesUpper = u.roles.map((r) => r.nombreRol.toUpperCase());
      if (tab === 'medico') {
        return userRolesUpper.includes('MEDICO') || userRolesUpper.includes('DENTIST') || userRolesUpper.includes('DOCTOR');
      }
      if (tab === 'secretaria') {
        return userRolesUpper.includes('SECRETARIA') || userRolesUpper.includes('RECEPTIONIST');
      }
      if (tab === 'admin') {
        return userRolesUpper.includes('ADMIN');
      }
      return true;
    });
  });

  readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers() {
    this.loading.set(true);
    this.repo.findAll()
      .pipe(take(1), catchError(() => { this.toast.error('Error al cargar usuarios'); return of([]); }), finalize(() => this.loading.set(false)))
      .subscribe((data) => {
        this.users.set(data);
        this.ensureValidPage();
      });
  }

  loadRoles() {
    this.http.get<{ data: Role[] }>(`${this.apiUrl}/roles?limit=50`)
      .pipe(take(1), catchError(() => of({ data: [] })))
      .subscribe((res) => {
        const activeRoles = res.data.filter(r => r.estado !== false);
        const uniqueRoles = activeRoles.filter((role, index, self) =>
          index === self.findIndex((r) => r.nombreRol.toLowerCase() === role.nombreRol.toLowerCase())
        );
        this.roles.set(uniqueRoles);
      });
  }

  setTab(tab: 'all' | 'medico' | 'secretaria' | 'admin') {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  changePageSizeValue(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  openCreate(roleType?: 'medico' | 'secretaria' | 'admin') {
    this.editingUser.set(null);
    this.dropdownOpen.set(false);

    let defaultRoleId: number | null = null;
    if (roleType) {
      const found = this.roles().find((r) => {
        const name = r.nombreRol.toUpperCase();
        if (roleType === 'medico') return name === 'MEDICO' || name === 'DENTIST';
        if (roleType === 'secretaria') return name === 'SECRETARIA' || name === 'RECEPTIONIST';
        if (roleType === 'admin') return name === 'ADMIN';
        return false;
      });
      if (found) defaultRoleId = found.id;
    }

    this.selectedRoleId.set(defaultRoleId);
    this.form.reset({ porcentajeComision: 0 });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEdit(user: User) {
    this.editingUser.set(user);
    this.selectedRoleId.set(user.roles[0]?.id ?? null);
    this.dropdownOpen.set(false);
    this.form.patchValue({
      nombreCompleto: user.nombreCompleto,
      email: user.email,
      password: '',
      porcentajeComision: user.porcentajeComision ?? 0,
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.dropdownOpen.set(false);
  }

  toggleDropdown() {
    if (this.dropdownOpen()) {
      this.dropdownOpen.set(false);
      return;
    }
    const btn = this.triggerRef()?.nativeElement;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    this.dropdownPos.set({ top: r.bottom + 4, left: r.left, width: r.width });
    this.dropdownOpen.set(true);
  }

  selectRole(id: number) {
    this.selectedRoleId.set(id);
    this.dropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.dropdownOpen()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-menu-portal') && !target.closest('.dropdown-trigger')) {
      this.dropdownOpen.set(false);
    }
  }

  save() {
    if (this.form.invalid || this.selectedRoleId() === null) {
      this.form.markAllAsTouched();
      if (this.selectedRoleId() === null) this.toast.error('Selecciona un rol');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const password = String(raw.password ?? '').trim();
    const isEditing = this.editingUser() !== null;
    const request: SaveUserRequest | UpdateUserRequest = {
      nombreCompleto: String(raw.nombreCompleto ?? '').trim(),
      email: String(raw.email ?? '').trim(),
      ...(isEditing ? {} : { password }),
      roleIds: [this.selectedRoleId()!],
      porcentajeComision: this.isMedicoSelected() ? Number(raw.porcentajeComision) || 0 : 0,
    };
    const editingUser = this.editingUser();
    const call = editingUser
      ? this.repo.update(editingUser.id, request).pipe(
        switchMap((user) => password
          ? this.repo.changePassword(editingUser.id, { password }).pipe(map(() => user))
          : of(user)
        )
      )
      : this.repo.save(request as SaveUserRequest);
    call.pipe(
      take(1),
      catchError((err) => {
        console.error('Error al guardar usuario:', err);
        const msg = err?.error?.message;
        const displayMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Error al guardar usuario');
        this.toast.error(displayMsg);
        return of(null);
      }),
      finalize(() => this.saving.set(false))
    )
      .subscribe((result) => {
        if (result) { this.toast.success('Usuario guardado exitosamente'); this.loadUsers(); this.closeModal(); }
      });
  }

  disableUser(id: number) {
    if (!confirm('¿Está seguro de desactivar este usuario?')) return;
    this.repo.disable(id)
      .pipe(take(1), catchError(() => { this.toast.error('Error al desactivar'); return of(null); }))
      .subscribe(() => { this.toast.success('Usuario desactivado'); this.loadUsers(); });
  }

  private ensureValidPage() {
    const totalPages = Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize()));
    if (this.currentPage() > totalPages) {
      this.currentPage.set(totalPages);
    }
  }
}
