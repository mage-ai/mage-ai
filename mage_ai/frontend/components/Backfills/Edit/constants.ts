import {
  BACKFILL_TYPE_DATETIME,
  BACKFILL_TYPE_CODE,
} from '@interfaces/BackfillType';

export const BACKFILL_TYPES = [
  {
    label: () => 'Date and time window',
    description: () => 'Backfill between a date and time range.',
    uuid: BACKFILL_TYPE_DATETIME,
  },
  // {
  //   label: () => 'Custom code',
  //   description: () => 'Use the output of a block to generate backfills.',
  //   uuid: BACKFILL_TYPE_CODE,
  // },
];
