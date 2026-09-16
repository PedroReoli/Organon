import { Card, SprintMetadata, CardLocation } from '@types'

export type PlanningTask = Card;
export type PlanningSprint = SprintMetadata;
export type { CardLocation };

export interface DualBufferState<T> {
  data: T;
  isSyncing: boolean;
  error: Error | null;
}
