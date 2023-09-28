import dark from '@oracle/styles/themes/dark';

export enum MonitorTypeEnum {
  BLOCK_RUNS = 'block_runs',
  BLOCK_RUNTIME = 'block_runtime',
  PIPELINE_RUNS = 'pipeline_runs',
}

export const BAR_STACK_COLORS = [
  dark.accent.warning,
  dark.background.success,
  dark.accent.negative,
  dark.content.active,
  dark.interactive.linkPrimary,
];
export const BAR_STACK_STATUSES = ['cancelled', 'completed', 'failed', 'initial', 'running'];

export const TOOLTIP_LEFT_OFFSET = -50;
