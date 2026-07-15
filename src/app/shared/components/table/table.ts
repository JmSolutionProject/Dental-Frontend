import { Component, input, output } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-table',
  imports: [],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table {
  columns = input.required<TableColumn[]>();
  data = input.required<unknown[]>();
  currentPage = input(1);
  pageSize = input(10);
  totalItems = input(0);
  sortKey = input<string | null>(null);
  sortDir = input<'asc' | 'desc'>('asc');

  sortChange = output<{ key: string; dir: 'asc' | 'desc' }>();
  pageChange = output<number>();
  rowClick = output<unknown>();

  get totalPages(): number {
    if (this.totalItems() <= 0 || this.pageSize() <= 0) return 1;
    return Math.ceil(this.totalItems() / this.pageSize());
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
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

  onRowClick(row: unknown) {
    this.rowClick.emit(row);
  }

  getCellValue(row: unknown, key: string): string {
    if (typeof row === 'object' && row !== null && key in row) {
      const val = (row as Record<string, unknown>)[key];
      return val != null ? String(val) : '—';
    }
    return '—';
  }
}
