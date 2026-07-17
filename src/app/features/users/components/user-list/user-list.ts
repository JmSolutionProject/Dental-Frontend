import { Component, inject, signal, OnInit, computed, ElementRef, viewChild, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { take, catchError, of, finalize } from 'rxjs';
import { API_URL } from '../../../../core/config/api.config';
import { Modal } from '../../../../shared/components/modal/modal';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { User, SaveUserRequest } from '../../domain/user';
import { UserRepository } from '../../infrastructure/user-api.repository';

interface Role { id: number; nombreRol: string; estado?: boolean; }
interface DropdownPos { top: number; left: number; width: number; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ReactiveFormsModule, Modal],
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
  readonly dropdownOpen = signal(false);
  readonly dropdownPos = signal<DropdownPos>({ top: 0, left: 0, width: 0 });

  readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('triggerRef');

  readonly form: FormGroup = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
  });

  readonly selectedRoleLabel = computed(() => {
    const id = this.selectedRoleId();
    if (id === null) return 'Seleccionar rol';
    return this.roles().find((r) => r.id === id)?.nombreRol ?? 'Seleccionar rol';
  });

  ngOnInit() {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers() {
    this.loading.set(true);
    this.repo.findAll()
      .pipe(take(1), catchError(() => { this.toast.error('Error al cargar usuarios'); return of([]); }), finalize(() => this.loading.set(false)))
      .subscribe((data) => this.users.set(data));
  }

  loadRoles() {
    this.http.get<{ data: Role[] }>(`${this.apiUrl}/roles?limit=50`)
      .pipe(take(1), catchError(() => of({ data: [] })))
      .subscribe((res) => {
        // Filtrar roles inactivos y eliminar duplicados por nombre (case-insensitive)
        const activeRoles = res.data.filter(r => r.estado !== false);
        const uniqueRoles = activeRoles.filter((role, index, self) =>
          index === self.findIndex((r) => r.nombreRol.toLowerCase() === role.nombreRol.toLowerCase())
        );
        this.roles.set(uniqueRoles);
      });
  }

  openCreate() {
    this.editingUser.set(null);
    this.selectedRoleId.set(null);
    this.dropdownOpen.set(false);
    this.form.reset({});
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEdit(user: User) {
    this.editingUser.set(user);
    this.selectedRoleId.set(user.roles[0]?.id ?? null);
    this.dropdownOpen.set(false);
    this.form.patchValue({ nombreCompleto: user.nombreCompleto, email: user.email, password: '' });
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
    const request: SaveUserRequest = {
      nombreCompleto: raw.nombreCompleto,
      email: raw.email,
      password: raw.password || undefined,
      roleIds: [this.selectedRoleId()!],
    };
    const call = this.editingUser() ? this.repo.update(this.editingUser()!.id, request) : this.repo.save(request);
    call.pipe(take(1), catchError(() => { this.toast.error('Error al guardar usuario'); return of(null); }), finalize(() => this.saving.set(false)))
      .subscribe((result) => {
        if (result) { this.toast.success('Usuario guardado'); this.loadUsers(); this.closeModal(); }
      });
  }

  disableUser(id: number) {
    if (!confirm('Desactivar este usuario?')) return;
    this.repo.disable(id)
      .pipe(take(1), catchError(() => { this.toast.error('Error al desactivar'); return of(null); }))
      .subscribe(() => { this.toast.success('Usuario desactivado'); this.loadUsers(); });
  }
}
