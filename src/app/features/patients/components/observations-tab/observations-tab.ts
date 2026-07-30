import { Component, input, output, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';

interface ObservationEntry {
  date: string;
  doctor: string;
  text: string;
  rawIndex: number;
}

const SEPARATOR = '\n---\n';

@Component({
  selector: 'app-observations-tab',
  imports: [ReactiveFormsModule],
  templateUrl: './observations-tab.html',
  styleUrl: './observations-tab.css',
})
export class ObservationsTab {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly form = input.required<FormGroup>();
  readonly saving = input(false);
  readonly saveRequested = output<void>();

  readonly editingIndex = signal<number | null>(null);

  readonly newObsForm = this.fb.group({
    date: [this.todayString(), Validators.required],
    text: ['', Validators.required],
  });

  readonly entries = computed<ObservationEntry[]>(() => {
    const raw = this.form().get('observations')?.value;
    if (!raw || typeof raw !== 'string') return [];
    return this.parse(raw);
  });

  readonly hasEntries = computed(() => this.entries().length > 0);

  addObservation(): void {
    if (this.newObsForm.invalid) return;
    const raw = this.newObsForm.getRawValue();
    const doctor = this.auth.user()?.name ?? 'Odontólogo';
    const text = (raw.text || '').trim();
    const entry = `${raw.date}|${doctor}|${text}`;

    const editIdx = this.editingIndex();
    if (editIdx !== null) {
      this.replaceEntry(editIdx, entry);
      this.editingIndex.set(null);
    } else {
      const current = this.form().get('observations')?.value || '';
      const updated = current ? `${current}${SEPARATOR}${entry}` : entry;
      this.form().patchValue({ observations: updated }, { emitEvent: false });
    }

    this.newObsForm.reset({ date: this.todayString() });
  }

  editEntry(index: number): void {
    const blocks = this.getRawBlocks();
    const block = blocks[index];
    if (!block) return;
    const [date, , ...rest] = block.split('|');
    this.newObsForm.patchValue({
      date: date?.trim() || this.todayString(),
      text: rest.join('|').trim(),
    });
    this.editingIndex.set(index);
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
    this.newObsForm.reset({ date: this.todayString() });
  }

  deleteEntry(index: number): void {
    const blocks = this.getRawBlocks();
    blocks.splice(index, 1);
    const updated = blocks.join(SEPARATOR);
    this.form().patchValue({ observations: updated }, { emitEvent: false });
    if (this.editingIndex() === index) {
      this.editingIndex.set(null);
      this.newObsForm.reset({ date: this.todayString() });
    }
  }

  parse(raw: string): ObservationEntry[] {
    return this.getRawBlocks(raw)
      .map((block, i) => {
        const [date, doctor, ...rest] = block.split('|');
        return {
          date: date?.trim() || '',
          doctor: doctor?.trim() || '',
          text: rest.join('|').trim(),
          rawIndex: i,
        };
      })
      .filter((e) => e.text.length > 0)
      .reverse();
  }

  formatDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  save(): void {
    this.saveRequested.emit();
  }

  private getRawBlocks(raw?: string): string[] {
    const source = raw ?? this.form().get('observations')?.value ?? '';
    if (!source || typeof source !== 'string') return [];
    return source.split(SEPARATOR).map((b) => b.trim()).filter(Boolean);
  }

  private replaceEntry(index: number, newBlock: string): void {
    const blocks = this.getRawBlocks();
    blocks[index] = newBlock;
    const updated = blocks.join(SEPARATOR);
    this.form().patchValue({ observations: updated }, { emitEvent: false });
  }

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
