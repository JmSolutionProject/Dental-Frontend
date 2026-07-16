import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { SVG, type Svg } from '@svgdotjs/svg.js';

import {
  FdiTooth,
  ToothCondition,
  ToothSurface,
  ToothSurfaceSelection,
} from '../../../features/odontogram/domain/odontogram';

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

const SURFACE_LABELS: Record<ToothSurface, string> = {
  vestibular: 'Vestibular',
  lingualPalatal: 'Lingual / Palatal',
  mesial: 'Mesial',
  distal: 'Distal',
  occlusal: 'Occlusal',
};

type SurfaceShape = {
  surface: ToothSurface;
  path: string;
};

type ToothFamily = 'incisor' | 'canine' | 'premolar' | 'molar';

@Component({
  selector: 'app-tooth-chart',
  imports: [],
  templateUrl: './tooth-chart.html',
  styleUrl: './tooth-chart.css',
})
export class ToothChart {
  private readonly platformId = inject(PLATFORM_ID);
  private draw: Svg | null = null;

  @ViewChild('canvas', { static: true })
  private readonly canvas?: ElementRef<HTMLDivElement>;

  readonly tooth = input.required<FdiTooth>();
  readonly selected = input(false);
  readonly selectedSurface = input<ToothSurface | null>(null);
  readonly quadrant = input<'adult' | 'child'>('adult');

  readonly toothClick = output<FdiTooth>();
  readonly surfaceClick = output<ToothSurfaceSelection>();

  readonly colors = computed(() => CONDITION_COLORS[this.tooth().condition]);

  readonly displayLabel = computed(() => String(this.tooth().fdiNumber));

  constructor() {
    effect(() => {
      this.tooth();
      this.selected();
      this.selectedSurface();
      this.renderTooth();
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId) || !this.canvas) return;

    this.draw = SVG()
      .addTo(this.canvas.nativeElement)
      .viewbox(0, 0, 64, 150)
      .size(56, 132)
      .attr({ role: 'img', 'aria-hidden': 'true' });
    this.renderTooth();
  }

  ngOnDestroy() {
    this.draw?.remove();
    this.draw = null;
  }

  onClick() {
    this.toothClick.emit(this.tooth());
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onClick();
  }

  private renderTooth() {
    if (!this.draw) return;

    this.draw.clear();

    const colors = this.colors();
    const selectedSurface = this.selectedSurface();
    const tooth = this.tooth();
    const isUpper = this.isUpperTooth(tooth.fdiNumber);
    const anatomyY = isUpper ? 6 : 84;
    const surfacesY = isUpper ? 88 : 18;
    const labelY = isUpper ? 140 : 74;

    this.renderAnatomy(anatomyY, isUpper);
    this.renderSurfaces(surfacesY, selectedSurface, colors, tooth);
    this.renderConditionOverlay(surfacesY, anatomyY, isUpper);
    this.renderLabel(labelY);
    this.renderSelectionIndicator();
  }

  private renderSurfaces(
    y: number,
    selectedSurface: ToothSurface | null,
    colors: { fill: string; stroke: string },
    tooth: FdiTooth,
  ) {
    if (!this.draw) return;

    const surfaceShapes = this.surfaceShapes(y);
    const surfaces = this.draw.group().addClass('tooth-surfaces');
    for (const shape of surfaceShapes) {
      const isSelectedSurface = selectedSurface === shape.surface;
      const surfaceCondition = tooth.surfaceConditions?.[shape.surface];
      const surfaceColors = surfaceCondition ? CONDITION_COLORS[surfaceCondition] : colors;
      const surfaceElement = surfaces
        .path(shape.path)
        .addClass('tooth-surface')
        .attr({
          cursor: 'pointer',
          'data-surface': shape.surface,
          'aria-label': `${SURFACE_LABELS[shape.surface]} surface`,
        })
        .fill(isSelectedSurface ? '#c7d2fe' : surfaceColors.fill)
        .stroke({
          color: isSelectedSurface ? '#4f46e5' : surfaceColors.stroke,
          width: isSelectedSurface ? 2 : 1.5,
          linejoin: 'round',
        })
        .on('click', (event: Event) => {
          event.stopPropagation();
          this.toothClick.emit(tooth);
          this.surfaceClick.emit({ fdiNumber: tooth.fdiNumber, surface: shape.surface });
        })
        .on('mouseenter', () => {
          surfaceElement.fill(isSelectedSurface ? '#c7d2fe' : '#eef2ff');
        })
        .on('mouseleave', () => {
          surfaceElement.fill(isSelectedSurface ? '#c7d2fe' : surfaceColors.fill);
        });
    }
  }

  private surfaceShapes(y: number): SurfaceShape[] {
    const cy = y + 22;
    const cx = 32;
    const outerRadius = 20;
    const innerRadius = 8;
    const top = cy - outerRadius;
    const right = cx + outerRadius;
    const bottom = cy + outerRadius;
    const left = cx - outerRadius;
    const innerTop = cy - innerRadius;
    const innerRight = cx + innerRadius;
    const innerBottom = cy + innerRadius;
    const innerLeft = cx - innerRadius;

    return [
      {
        surface: 'vestibular',
        path: `M ${cx} ${top} A ${outerRadius} ${outerRadius} 0 0 1 ${right} ${cy} L ${innerRight} ${cy} A ${innerRadius} ${innerRadius} 0 0 0 ${cx} ${innerTop} Z`,
      },
      {
        surface: 'distal',
        path: `M ${right} ${cy} A ${outerRadius} ${outerRadius} 0 0 1 ${cx} ${bottom} L ${cx} ${innerBottom} A ${innerRadius} ${innerRadius} 0 0 0 ${innerRight} ${cy} Z`,
      },
      {
        surface: 'mesial',
        path: `M ${left} ${cy} A ${outerRadius} ${outerRadius} 0 0 1 ${cx} ${top} L ${cx} ${innerTop} A ${innerRadius} ${innerRadius} 0 0 0 ${innerLeft} ${cy} Z`,
      },
      {
        surface: 'lingualPalatal',
        path: `M ${cx} ${bottom} A ${outerRadius} ${outerRadius} 0 0 1 ${left} ${cy} L ${innerLeft} ${cy} A ${innerRadius} ${innerRadius} 0 0 0 ${cx} ${innerBottom} Z`,
      },
      {
        surface: 'occlusal',
        path: `M ${cx} ${innerTop} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${innerBottom} A ${innerRadius} ${innerRadius} 0 1 1 ${cx} ${innerTop} Z`,
      },
    ];
  }

  private renderAnatomy(y: number, isUpper: boolean) {
    if (!this.draw) return;

    const colors = this.colors();
    const family = this.toothFamily(this.tooth().fdiNumber);
    const anatomy = this.draw
      .group()
      .fill('none')
      .stroke({ color: '#cbd5e1', width: 1.15, linejoin: 'round', linecap: 'round' });

    if (family === 'molar') {
      anatomy.path(`M 11 ${y + 42} C 10 ${y + 29}, 16 ${y + 22}, 23 ${y + 24} C 27 ${y + 15}, 37 ${y + 15}, 41 ${y + 24} C 50 ${y + 22}, 55 ${y + 30}, 53 ${y + 43} C 48 ${y + 50}, 18 ${y + 50}, 11 ${y + 42} Z`).fill(colors.fill);
      anatomy.path(`M 18 ${y + 44} C 16 ${y + 58}, 13 ${y + 67}, 20 ${y + 72} C 25 ${y + 63}, 26 ${y + 54}, 28 ${y + 45}`);
      anatomy.path(`M 36 ${y + 45} C 38 ${y + 55}, 40 ${y + 64}, 45 ${y + 72} C 52 ${y + 65}, 49 ${y + 55}, 46 ${y + 44}`);
      anatomy.path(`M 25 ${y + 24} C 27 ${y + 35}, 31 ${y + 40}, 32 ${y + 45} C 34 ${y + 38}, 38 ${y + 34}, 40 ${y + 24}`);
    } else if (family === 'premolar') {
      anatomy.path(`M 18 ${y + 44} C 14 ${y + 31}, 20 ${y + 22}, 32 ${y + 24} C 44 ${y + 22}, 50 ${y + 31}, 46 ${y + 44} C 40 ${y + 50}, 24 ${y + 50}, 18 ${y + 44} Z`).fill(colors.fill);
      anatomy.path(`M 28 ${y + 46} C 26 ${y + 57}, 25 ${y + 66}, 32 ${y + 73} C 39 ${y + 66}, 38 ${y + 57}, 36 ${y + 46}`);
      anatomy.path(`M 25 ${y + 24} C 28 ${y + 35}, 31 ${y + 39}, 32 ${y + 44} C 34 ${y + 38}, 37 ${y + 34}, 39 ${y + 24}`);
    } else if (family === 'canine') {
      anatomy.path(`M 21 ${y + 44} C 18 ${y + 32}, 24 ${y + 21}, 32 ${y + 24} C 40 ${y + 21}, 46 ${y + 32}, 43 ${y + 44} C 37 ${y + 49}, 27 ${y + 49}, 21 ${y + 44} Z`).fill(colors.fill);
      anatomy.path(`M 30 ${y + 45} C 27 ${y + 58}, 28 ${y + 71}, 32 ${y + 76} C 36 ${y + 71}, 37 ${y + 58}, 34 ${y + 45}`);
      anatomy.path(`M 32 ${y + 24} C 31 ${y + 34}, 31 ${y + 39}, 32 ${y + 44}`);
    } else {
      anatomy.path(`M 22 ${y + 44} C 19 ${y + 32}, 24 ${y + 22}, 32 ${y + 24} C 40 ${y + 22}, 45 ${y + 32}, 42 ${y + 44} C 37 ${y + 48}, 27 ${y + 48}, 22 ${y + 44} Z`).fill(colors.fill);
      anatomy.path(`M 29 ${y + 45} C 27 ${y + 58}, 28 ${y + 69}, 32 ${y + 74} C 36 ${y + 69}, 37 ${y + 58}, 35 ${y + 45}`);
      anatomy.path(`M 32 ${y + 24} C 31 ${y + 34}, 31 ${y + 39}, 32 ${y + 44}`);
    }

    if (!isUpper) {
      anatomy.transform({ flip: 'y', origin: [32, y + 40] });
    }
  }

  private renderConditionOverlay(surfacesY: number, anatomyY: number, isUpper: boolean) {
    if (!this.draw) return;

    const condition = this.tooth().condition;
    if (condition === 'extraction') {
      this.draw
        .path(`M 10 ${surfacesY + 2} L 54 ${surfacesY + 44} M 54 ${surfacesY + 2} L 10 ${surfacesY + 44}`)
        .fill('none')
        .stroke({ color: '#dc2626', width: 3, linecap: 'round' });
    }
    if (condition === 'endodontics') {
      this.draw
        .path(`M 32 ${anatomyY + (isUpper ? 20 : 54)} L 32 ${anatomyY + (isUpper ? 72 : 12)}`)
        .fill('none')
        .stroke({ color: '#dc2626', width: 2.5, linecap: 'round' });
    }
    if (condition === 'fracture') {
      this.draw
        .path(`M 14 ${surfacesY + 18} L 24 ${surfacesY + 29} L 36 ${surfacesY + 16} L 50 ${surfacesY + 30}`)
        .fill('none')
        .stroke({ color: '#dc2626', width: 2, linecap: 'round' });
    }
  }

  private renderLabel(y: number) {
    if (!this.draw) return;

    this.draw
      .text(this.displayLabel())
      .font({
        anchor: 'middle',
        family: 'sans-serif',
        size: 11,
        weight: 700,
      })
      .fill(this.tooth().condition === 'healthy' ? '#334155' : '#1e293b')
      .center(32, y);
  }

  private renderSelectionIndicator() {
    if (!this.draw || !this.selected()) return;

    this.draw
      .rect(62, 148)
      .move(1, 1)
      .radius(10)
      .fill('none')
      .stroke({ color: '#6366f1', width: 2, dasharray: '4 2' });
  }

  private isUpperTooth(fdiNumber: number): boolean {
    const quadrant = Math.floor(fdiNumber / 10);
    return quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
  }

  private toothFamily(fdiNumber: number): ToothFamily {
    const position = fdiNumber % 10;
    if (position >= 6) return 'molar';
    if (position >= 4) return 'premolar';
    if (position === 3) return 'canine';
    return 'incisor';
  }
}
