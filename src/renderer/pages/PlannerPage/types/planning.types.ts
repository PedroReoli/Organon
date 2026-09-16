import { Card, ProjectSprint, CardLocation } from '@types'

export type PlanningTask = Card;
export type PlanningSprint = ProjectSprint;

export interface DualBufferState<T> {
  data: T;
  isSyncing: boolean;
  error: Error | null;
}
