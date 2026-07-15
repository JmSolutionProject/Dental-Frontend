export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'restoration'
  | 'extraction'
  | 'crown'
  | 'missing';

export interface FdiTooth {
  fdiNumber: number;
  condition: ToothCondition;
  notes?: string;
}

export interface Odontogram {
  patientId: string;
  teeth: FdiTooth[];
  quadrant: 'adult' | 'child';
}

/** All 32 adult FDI tooth numbers. */
export const FDI_ADULT_TEETH: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

/** All 20 child FDI tooth numbers. */
export const FDI_CHILD_TEETH: number[] = [
  55, 54, 53, 52, 51,
  61, 62, 63, 64, 65,
  85, 84, 83, 82, 81,
  71, 72, 73, 74, 75,
];

/**
 * Maps an FDI tooth number to a 2×16 grid position for SVG rendering.
 *
 * Grid layout (adult, 32 teeth):
 *   Row 0 (upper): cols 0–7 = quad 1 (right-to-left 18→11), cols 8–15 = quad 2 (left-to-right 21→28)
 *   Row 1 (lower): cols 0–7 = quad 4 (right-to-left 48→41), cols 8–15 = quad 3 (left-to-right 31→38)
 *
 * Child teeth use a 2×10 grid with the same quadrant ordering.
 */
export function fdiToGridPosition(fdi: number): { row: number; col: number } | null {
  const quadrant = Math.floor(fdi / 10); // 1,2,3,4 for adult; 5,6,7,8 for child
  const index = fdi % 10; // 1-8 for adult, 1-5 for child

  if (FDI_CHILD_TEETH.includes(fdi)) {
    // Child teeth
    const childColsPerQuad = 5;
    switch (quadrant) {
      case 5: // upper right — reversed: 55→col0, 54→col1, …, 51→col4
        return { row: 0, col: childColsPerQuad - index };
      case 6: // upper left — 61→col5, 62→col6, …, 65→col9
        return { row: 0, col: childColsPerQuad + index - 1 };
      case 8: // lower right — reversed: 85→col0, …, 81→col4
        return { row: 1, col: childColsPerQuad - index };
      case 7: // lower left — 71→col5, …, 75→col9
        return { row: 1, col: childColsPerQuad + index - 1 };
      default:
        return null;
    }
  }

  if (FDI_ADULT_TEETH.includes(fdi)) {
    const adultColsPerQuad = 8;
    switch (quadrant) {
      case 1: // upper right — reversed: 18→col0, 17→col1, …, 11→col7
        return { row: 0, col: adultColsPerQuad - index };
      case 2: // upper left — 21→col8, 22→col9, …, 28→col15
        return { row: 0, col: adultColsPerQuad + index - 1 };
      case 4: // lower right — reversed: 48→col0, …, 41→col7
        return { row: 1, col: adultColsPerQuad - index };
      case 3: // lower left — 31→col8, …, 38→col15
        return { row: 1, col: adultColsPerQuad + index - 1 };
      default:
        return null;
    }
  }

  return null;
}

/** Returns the full set of FDI numbers for the given quadrant. */
export function fdiTeethForQuadrant(quadrant: 'adult' | 'child'): number[] {
  return quadrant === 'adult' ? FDI_ADULT_TEETH : FDI_CHILD_TEETH;
}

/** Returns a human-readable label for a tooth condition. */
export function toothConditionLabel(condition: ToothCondition): string {
  const labels: Record<ToothCondition, string> = {
    healthy: 'Healthy',
    caries: 'Caries',
    restoration: 'Restoration',
    extraction: 'Extraction',
    crown: 'Crown',
    missing: 'Missing',
  };
  return labels[condition];
}

/** Default set of teeth for an adult odontogram (all healthy). */
export function createDefaultAdultTeeth(): FdiTooth[] {
  return FDI_ADULT_TEETH.map((fdi) => ({ fdiNumber: fdi, condition: 'healthy' as ToothCondition }));
}

/** Default set of teeth for a child odontogram (all healthy). */
export function createDefaultChildTeeth(): FdiTooth[] {
  return FDI_CHILD_TEETH.map((fdi) => ({ fdiNumber: fdi, condition: 'healthy' as ToothCondition }));
}
