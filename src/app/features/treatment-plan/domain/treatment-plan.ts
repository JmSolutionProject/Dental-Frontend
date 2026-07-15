// ---------------------------------------------------------------------------
// Treatment Plan — domain types, catalogue, status transitions, helpers
// ---------------------------------------------------------------------------

/** Overall plan lifecycle state. */
export type PlanStatus = 'proposed' | 'in-progress' | 'completed' | 'cancelled';

/** Valid transitions for each plan status. */
export const PLAN_STATUS_TRANSITIONS: Readonly<Record<PlanStatus, readonly PlanStatus[]>> = {
  proposed: ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: ['proposed'],
};

/** Per-procedure progress state. */
export type ProcedureStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';

/** High-level procedure category (ADA-inspired). */
export type ProcedureCategory =
  | 'diagnostic'
  | 'preventive'
  | 'restorative'
  | 'endodontic'
  | 'periodontic'
  | 'prosthodontic'
  | 'surgical'
  | 'orthodontic'
  | 'other';

/** Predefined catalogue item that surfaces in the picker. */
export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  defaultCost: number;
  category: ProcedureCategory;
}

/** A single procedure attached to a phase. */
export interface Procedure {
  id: string;
  phaseId: string;
  toothNumber: number | null; // null = non-tooth-specific (e.g. evaluation)
  catalogItem: CatalogItem;
  cost: number;
  status: ProcedureStatus;
  notes?: string;
}

/** A treatment phase grouping related procedures. */
export interface TreatmentPhase {
  id: string;
  planId: string;
  name: string;
  description: string;
  order: number;
  status: ProcedureStatus;
  procedures: Procedure[];
}

/** Diagnosis linked to a specific tooth (used for plan justification). */
export interface Diagnosis {
  id: string;
  patientId: string;
  toothNumber: number;
  condition: string;
  description: string;
  createdAt: string;
}

/** The full treatment plan aggregate. */
export interface TreatmentPlan {
  id: string;
  patientId: string;
  patientName?: string;
  phases: TreatmentPhase[];
  status: PlanStatus;
  totalCost: number;
  diagnostics: Diagnosis[];
  createdAt: string;
  updatedAt: string;
}

// ---- Request DTOs ----------------------------------------------------------

export interface CreatePlanRequest {
  patientId: string;
}

export interface AddPhaseRequest {
  name: string;
  description: string;
}

export interface AddProcedureRequest {
  toothNumber: number | null;
  catalogItemId: string;
  cost?: number;
  notes?: string;
}

export interface LinkDiagnosisRequest {
  diagnosticId: string;
}

export interface DiagnosisRequest {
  patientId: string;
  toothNumber: number;
  condition: string;
  description: string;
}

// ---- Default catalogue (predefined ADA/CDT reference items) -----------------

/**
 * Seed catalogue used client-side until a backend catalogue endpoint is ready.
 * Non-tooth-specific items are tagged via `NON_TOOTH_CATALOG_IDS`.
 */
export const CATALOG_ITEMS: CatalogItem[] = [
  { id: 'cat-001', code: 'D0120', name: 'Periodic Oral Evaluation', defaultCost: 45, category: 'diagnostic' },
  { id: 'cat-002', code: 'D0140', name: 'Limited Oral Evaluation', defaultCost: 60, category: 'diagnostic' },
  { id: 'cat-003', code: 'D0220', name: 'Intraoral Periapical X-ray', defaultCost: 25, category: 'diagnostic' },
  { id: 'cat-004', code: 'D0274', name: 'Bitewing X-rays (4 films)', defaultCost: 55, category: 'diagnostic' },
  { id: 'cat-005', code: 'D1110', name: 'Prophylaxis – Adult', defaultCost: 90, category: 'preventive' },
  { id: 'cat-006', code: 'D1208', name: 'Fluoride Varnish', defaultCost: 35, category: 'preventive' },
  { id: 'cat-007', code: 'D1351', name: 'Sealant per tooth', defaultCost: 45, category: 'preventive' },
  { id: 'cat-008', code: 'D2140', name: 'Amalgam 1 surface', defaultCost: 110, category: 'restorative' },
  { id: 'cat-009', code: 'D2392', name: 'Composite 2 surfaces (posterior)', defaultCost: 180, category: 'restorative' },
  { id: 'cat-010', code: 'D2740', name: 'Crown – Porcelain/Ceramic', defaultCost: 800, category: 'prosthodontic' },
  { id: 'cat-011', code: 'D3310', name: 'Root Canal – Anterior', defaultCost: 600, category: 'endodontic' },
  { id: 'cat-012', code: 'D3330', name: 'Root Canal – Molar', defaultCost: 950, category: 'endodontic' },
  { id: 'cat-013', code: 'D4341', name: 'Periodontal Scaling per quad', defaultCost: 180, category: 'periodontic' },
  { id: 'cat-014', code: 'D7140', name: 'Simple Extraction', defaultCost: 130, category: 'surgical' },
  { id: 'cat-015', code: 'D7240', name: 'Impacted Tooth Removal', defaultCost: 400, category: 'surgical' },
];

/** Catalogue IDs that do NOT require a tooth assignment. */
export const NON_TOOTH_CATALOG_IDS: ReadonlySet<string> = new Set([
  'cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005', 'cat-006',
]);

// ---- Helpers ---------------------------------------------------------------

/** Returns the human-readable label for a plan status. */
export function planStatusLabel(status: PlanStatus): string {
  const labels: Record<PlanStatus, string> = {
    proposed: 'Proposed',
    'in-progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/** Returns the human-readable label for a procedure status. */
export function procedureStatusLabel(status: ProcedureStatus): string {
  const labels: Record<ProcedureStatus, string> = {
    planned: 'Planned',
    'in-progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/** Returns the human-readable label for a procedure category. */
export function procedureCategoryLabel(category: ProcedureCategory): string {
  const labels: Record<ProcedureCategory, string> = {
    diagnostic: 'Diagnostic',
    preventive: 'Preventive',
    restorative: 'Restorative',
    endodontic: 'Endodontic',
    periodontic: 'Periodontic',
    prosthodontic: 'Prosthodontic',
    surgical: 'Surgical',
    orthodontic: 'Orthodontic',
    other: 'Other',
  };
  return labels[category];
}

/** Checks whether a status transition is valid. */
export function isValidPlanTransition(from: PlanStatus, to: PlanStatus): boolean {
  return (PLAN_STATUS_TRANSITIONS[from] as readonly PlanStatus[]).includes(to);
}

/** Finds a catalogue item by ID. Returns undefined when not found. */
export function findCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((c) => c.id === id);
}

/**
 * Pure domain function — computes the total cost of a treatment plan
 * by summing the cost of every procedure across all phases.
 */
export function calculatePlanTotal(phases: TreatmentPhase[]): number {
  return phases.reduce(
    (sum, ph) =>
      sum + ph.procedures.reduce((phaseSum, proc) => phaseSum + proc.cost, 0),
    0,
  );
}
