import { EventEnum } from '../../events/enums';
import { isEqual, selectKeys } from '@utils/hash';
import { sortByKey } from '@utils/array';
import { KeyMapType } from './interfaces'

export function validatePredicate(predicate: any, events: any[], eventHistory?: Record<string, KeyMapType>): boolean {
  const { key, predicates, present, type = EventEnum.KEYDOWN } = predicate;

  if (predicates?.length) {
    return predicates?.every((pred: any, position: number) =>
      validatePredicate(pred, [events[position]], eventHistory),
    );
  } else if (present) {
    return key in (eventHistory?.[type] ?? {});
  }

  const keys = ['altKey', 'ctrlKey', 'key', 'metaKey', 'shiftKey', 'type'];
  const event = events?.[0] ?? false;

  return (
    event &&
    isEqual(
      selectKeys(
        {
          altKey: false,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          type,
          ...predicate,
        },
        keys,
      ),
      selectKeys(event, keys),
    )
  );
}
