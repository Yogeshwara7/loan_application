import type { LoanTimelineStep } from '../../services/LoanTimelineService';

export type StepState = 'completed' | 'current' | 'pending';

/**
 * Resolve the visual state of a timeline step:
 * - `completed` → status is explicitly "Completed"
 * - `current`   → the final step, or a step named like "Current Status"
 * - `pending`   → everything else (not yet reached)
 */
export function getStepState(step: LoanTimelineStep, index: number, total: number): StepState {
  if (step.status.trim().toLowerCase() === 'completed') return 'completed';
  if (index === total - 1 || /current/i.test(step.step)) return 'current';
  return 'pending';
}
