import { NgTemplateOutlet } from '@angular/common';
import { Component, Directive, TemplateRef, computed, contentChildren, input, output } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  value?: (row: unknown) => unknown;
}

@Directive({
  selector: 'ng-template[appTableCell]',
})
export class TableCell {
  readonly key = input.required<string>({ alias: 'appTableCell' });

  constructor(readonly template: TemplateRef<unknown>) {}
}

@Component({
  selector: 'app-table',
  imports: [NgTemplateOutlet],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table {
  columns = input.required<TableColumn[]>();
  data = input.required<unknown[]>();
  currentPage = input(1);
  pageSize = input(10);
  pageSizeOptions = input<number[]>([10, 20, 50]);
  totalItems = input(0);
  sortKey = input<string | null>(null);
  sortDir = input<'asc' | 'desc'>('asc');
  rowClickable = input(false);
  emptyMessage = input('No data available.');
  showPagination = input(true);

  sortChange = output<{ key: string; dir: 'asc' | 'desc' }>();
  pageChange = output<number>();
  pageSizeChange = output<number>();
  rowClick = output<unknown>();

  private readonly cellTemplates = contentChildren(TableCell);
  readonly cellTemplateMap = computed(() => {
    const map = new Map<string, TemplateRef<unknown>>();
    for (const cell of this.cellTemplates()) {
      map.set(cell.key(), cell.template);
    }
    return map;
  });

  get totalPages(): number {
    if (this.totalItems() <= 0 || this.pageSize() <= 0) return 1;
    return Math.ceil(this.totalItems() / this.pageSize());
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();
    const first = Math.max(1, Math.min(current - 3, total - 6));
    const last = Math.min(total, first + 6);
    const pages: number[] = [];

    for (let i = first; i <= last; i++) {
      pages.push(i);
    }

    return pages;
  }

  get firstItem(): number {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  get lastItem(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  }

  toggleSort(col: TableColumn) {
    if (!col.sortable) return;

    const newDir =
      this.sortKey() === col.key && this.sortDir() === 'asc' ? 'desc' : 'asc';

    this.sortChange.emit({ key: col.key, dir: newDir });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.pageChange.emit(page);
  }

  changePageSize(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(value) || value <= 0) return;
    this.pageSizeChange.emit(value);
  }

  onRowClick(row: unknown) {
    if (!this.rowClickable()) return;
    this.rowClick.emit(row);
  }

  getCellValue(row: unknown, col: TableColumn): string {
    const val = col.value ? col.value(row) : this.getValueByKey(row, col.key);
    return val != null && val !== '' ? String(val) : '—';
  }

  getCellTemplate(key: string): TemplateRef<unknown> | null {
    return this.cellTemplateMap().get(key) ?? null;
  }

  private getValueByKey(row: unknown, key: string): unknown {
    if (typeof row === 'object' && row !== null && key in row) {
      const val = (row as Record<string, unknown>)[key];
      return val != null ? String(val) : '—';
    }
    return null;
  }
}
