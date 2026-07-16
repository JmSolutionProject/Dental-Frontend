import { Component, computed, input, output } from '@angular/core';

import { FdiTooth, ToothCondition } from '../../../features/odontogram/domain/odontogram';

const CONDITION_COLORS: Record<ToothCondition, { fill: string; stroke: string }> = {
  healthy: { fill: '#f8fafc', stroke: '#cbd5e1' },
  caries: { fill: '#fecaca', stroke: '#ef4444' },
  restoration: { fill: '#bfdbfe', stroke: '#3b82f6' },
  extraction: { fill: '#e2e8f0', stroke: '#64748b' },
  crown: { fill: '#fef3c7', stroke: '#f59e0b' },
  missing: { fill: '#f1f5f9', stroke: '#94a3b8' },
  endodontics: { fill: '#e0e7ff', stroke: '#6366f1' },
  implant: { fill: '#dcfce7', stroke: '#22c55e' },
  sealant: { fill: '#f3e8ff', stroke: '#a855f7' },
  fracture: { fill: '#ffedd5', stroke: '#f97316' },
};

@Component({
  selector: 'app-tooth-chart',
  imports: [],
  templateUrl: './tooth-chart.html',
  styleUrl: './tooth-chart.css',
})
export class ToothChart {
  readonly tooth = input.required<FdiTooth>();
  readonly selected = input(false);
  readonly quadrant = input<'adult' | 'child'>('adult');

  readonly toothClick = output<FdiTooth>();

  readonly colors = computed(() => CONDITION_COLORS[this.tooth().condition]);

  readonly displayLabel = computed(() => String(this.tooth().fdiNumber));

  onClick() {
    this.toothClick.emit(this.tooth());
  }
}
