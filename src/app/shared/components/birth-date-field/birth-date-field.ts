import { Component, OnDestroy, OnInit, computed, input, signal } from '@angular/core';
import { AbstractControl, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCalendarDays } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-birth-date-field',
  imports: [NgIcon],
  providers: [provideIcons({ heroCalendarDays })],
  templateUrl: './birth-date-field.html',
  styleUrl: './birth-date-field.css',
})
export class BirthDateField implements OnInit, OnDestroy {
  control = input.required<FormControl | AbstractControl>();
  readonly = input(false);

  day = signal('');
  month = signal('');
  year = signal('');

  private synced = false;

  age = computed<number | null>(() => {
    const y = parseInt(this.year(), 10);
    const m = parseInt(this.month(), 10);
    const d = parseInt(this.day(), 10);

    if (!y || !m || !d) return null;
    if (y < 1900 || y > new Date().getFullYear()) return null;
    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;

    const birth = new Date(y, m - 1, d);
    if (
      birth.getFullYear() !== y ||
      birth.getMonth() !== m - 1 ||
      birth.getDate() !== d
    ) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const mm = today.getMonth() - birth.getMonth();
    if (mm < 0 || (mm === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 && age < 150 ? age : null;
  });

  ageText = computed(() => {
    const a = this.age();
    if (a === null) return null;
    return `${a} año${a === 1 ? '' : 's'}`;
  });

  isValid = computed(() => this.age() !== null);

  private subscription?: Subscription;

  ngOnInit(): void {
    this.syncFromControl();
    this.subscription = this.control().valueChanges.subscribe(() => {
      this.syncFromControl();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private syncFromControl(): void {
    const value = this.control().value;
    if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      if (this.day() !== d) this.day.set(d);
      if (this.month() !== m) this.month.set(m);
      if (this.year() !== y) this.year.set(y);
    } else if (this.day() || this.month() || this.year()) {
      this.day.set('');
      this.month.set('');
      this.year.set('');
    }
  }

  private syncToControl(): void {
    const y = this.year();
    const m = this.month().padStart(2, '0');
    const d = this.day().padStart(2, '0');

    let iso = '';
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      const candidate = `${y}-${m}-${d}`;
      const test = new Date(candidate);
      if (
        test.getFullYear() === parseInt(y) &&
        test.getMonth() === parseInt(m) - 1 &&
        test.getDate() === parseInt(d)
      ) {
        iso = candidate;
      }
    }

    if (this.control().value !== iso) {
      this.synced = true;
      this.control().setValue(iso, { emitEvent: false });
    }
  }

  onDayInput(event: Event, el: HTMLInputElement): void {
    const value = el.value.replace(/\D/g, '').slice(0, 2);
    el.value = value;
    this.day.set(value);
    this.syncToControl();
    if (value.length === 2) {
      this.focus('month');
    }
  }

  onMonthInput(event: Event, el: HTMLInputElement): void {
    const value = el.value.replace(/\D/g, '').slice(0, 2);
    el.value = value;
    this.month.set(value);
    this.syncToControl();
    if (value.length === 2) {
      this.focus('year');
    }
  }

  onYearInput(event: Event, el: HTMLInputElement): void {
    const value = el.value.replace(/\D/g, '').slice(0, 4);
    el.value = value;
    this.year.set(value);
    this.syncToControl();
  }

  onKeyDown(event: KeyboardEvent, field: 'day' | 'month' | 'year'): void {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && target.value === '') {
      event.preventDefault();
      const prev = field === 'month' ? 'day' : field === 'year' ? 'month' : null;
      if (prev) this.focus(prev);
    }
  }

  openNativePicker(el: HTMLInputElement): void {
    if (this.readonly()) return;
    el.showPicker?.();
  }

  onNativeChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const [y, m, d] = value.split('-');
    this.day.set(d);
    this.month.set(m);
    this.year.set(y);
    this.syncToControl();
  }

  private focus(field: 'day' | 'month' | 'year'): void {
    const el = document.querySelector<HTMLInputElement>(`[data-bd-field="${field}"]`);
    el?.focus();
    el?.select();
  }
}
