/**
 * Componentes compartilhados (design system).
 *
 * Estrutura:
 * - primitives/  componentes base do design system (Button, Input, Badge, etc)
 * - layout/      layout primitives (Stack, Cluster, Container, Grid)
 * - display/     componentes de exibicao (KpiCard, EmptyState, ProgressBar, Kbd)
 * - inputs/      inputs especializados (SearchInput)
 * - a11y/        acessibilidade (SkipLink, VisuallyHidden, LiveRegion)
 *
 * Definido nos upgrades 19 e 20.
 */

export * from './primitives'
export * from './layout'
export * from './display'
export * from './inputs'
export * from './a11y'
