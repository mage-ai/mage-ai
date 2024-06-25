import React, { useEffect, useRef } from 'react';

import useDebounce from '@utils/hooks/useDebounce';
import { CommandType, CustomKeyboardEventType, PredicateType } from './interfaces';
import { EventEnum } from './types';
import { sortByKey } from '@utils/array';
import { isEqual, selectKeys } from '@utils/hash';

type KeyMapType = Record<string, CustomKeyboardEventType[]>;

export default function useKeyboardShortcuts({
  target,
  timeout = 1000,
}: {
  target: React.MutableRefObject<any | null>;
  timeout?: number;
}): {
  deregisterCommands: () => void;
  registerCommands: (commands: Record<string, CommandType>) => void;
} {
  const [debouncer, cancel] = useDebounce();

  const commandsRef = useRef<Record<string, CommandType>>({});
  const shouldClearAllRef = useRef<boolean>(false);
  const timeoutRef = useRef(null);

  const eventsHistoryRef = useRef<Record<EventEnum, KeyMapType>>({
    [EventEnum.KEYDOWN]: {},
    [EventEnum.KEYUP]: {},
  });
  const eventsRef = useRef<Record<EventEnum, KeyMapType>>({
    [EventEnum.KEYDOWN]: {},
    [EventEnum.KEYUP]: {},
  });
  const eventsSeriesRef = useRef<CustomKeyboardEventType[][]>([]);

  function registerCommands(commands: Record<string, CommandType>) {
    commandsRef.current = commands;
  }

  function clearAll() {
    eventsHistoryRef.current = {
      [EventEnum.KEYDOWN]: {},
      [EventEnum.KEYUP]: {},
    };
    eventsRef.current = {
      [EventEnum.KEYDOWN]: {},
      [EventEnum.KEYUP]: {},
    };
    eventsSeriesRef.current = [];
  }

  function resetTimer() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(clearAll, timeout);
  }

  function validatePredicate(predicate: PredicateType, events: CustomKeyboardEventType[]): boolean {
    const { key, predicates, present, type = EventEnum.KEYDOWN } = predicate;

    // console.log(predicates, present, key, type, events);

    if (predicates?.length) {
      return predicates?.every((pred: PredicateType, position: number) =>
        validatePredicate(pred, [events[position]]),
      );
    } else if (present) {
      return key in (eventsHistoryRef?.current?.[type] ?? {});
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

  function executeCommands(event: CustomKeyboardEventType) {
    // console.log('series', eventsSeriesRef.current);
    // console.log('history', eventsHistoryRef.current);

    const commandsToExecute = {};

    Object.entries(commandsRef?.current ?? {})?.forEach(
      ([uuid, command]: [string, CommandType]) => {
        if (!command?.predicate || !command?.handler) return;

        let valid = false;

        const events = eventsSeriesRef?.current ?? [];

        if (EventEnum.KEYDOWN === event.type) {
          events.push(buildEventSeries());
        }

        const predicates = command?.predicate?.predicates ?? [];

        if (predicates.length >= 2) {
          valid = predicates.every(
            (predicate: PredicateType, position: number) =>
              position >= events?.length && validatePredicate(predicate, events[position]),
          );
        } else {
          valid = events.some((arr1: CustomKeyboardEventType[]) =>
            predicates.length === 1
              ? validatePredicate(command.predicate, arr1)
              : arr1?.some((event: CustomKeyboardEventType) =>
                  validatePredicate(command.predicate, [event]),
                ),
          );
        }

        // console.log('valid', valid);

        if (valid) {
          commandsToExecute[uuid] = command;
        }
      },
    );

    const command = sortByKey(
      Object.values(commandsToExecute ?? {}),
      ({ priority }) => priority,
    )?.[0];

    if (command) {
      command?.handler?.(event);
      cancel();
      clearAll();
      shouldClearAllRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }

  function buildKey(eventInit: KeyboardEvent, eventType: EventEnum): CustomKeyboardEventType {
    return {
      altKey: eventInit.altKey,
      ctrlKey: eventInit.ctrlKey,
      key: eventInit.key,
      metaKey: eventInit.metaKey,
      shiftKey: eventInit.shiftKey,
      timestamp: Number(new Date()),
      type: eventType,
    } as CustomKeyboardEventType;
  }

  function buildEventSeries() {
    const events: CustomKeyboardEventType[] = [];

    Object.values(eventsRef?.current ?? {}).forEach((map: KeyMapType) => {
      Object.values(map).forEach((keys: CustomKeyboardEventType[]) => {
        events.push(sortByKey(keys, (event: CustomKeyboardEventType) => event.timestamp)[0]);
      });
    });

    return events;
  }

  function updateState(event: CustomKeyboardEventType) {
    const { key, type } = event;

    eventsHistoryRef.current[type][key] ||= [];
    eventsHistoryRef.current[type][key].push(event);
    eventsRef.current[type][key] ||= [];
    eventsRef.current[type][key].push(event);

    if (EventEnum.KEYDOWN === event.type) {
    }

    if (EventEnum.KEYUP === event.type) {
      eventsSeriesRef.current.push(buildEventSeries());

      eventsRef.current = {
        [EventEnum.KEYDOWN]: {},
        [EventEnum.KEYUP]: {},
      };
    }
  }

  function processEvent(eventInit: KeyboardEvent) {
    if (!target?.current) return;

    const event = buildKey(
      eventInit,
      EventEnum.KEYDOWN === eventInit.type
        ? EventEnum.KEYDOWN
        : EventEnum.KEYUP === eventInit.type
          ? EventEnum.KEYUP
          : undefined,
    );

    if (shouldClearAllRef.current) {
      clearAll();
      shouldClearAllRef.current = false;

      if (EventEnum.KEYUP === event.type) return;
    }

    updateState(event);
    debouncer(() => executeCommands(event), 1);

    EventEnum.KEYDOWN !== event.type && resetTimer();
  }

  function deregisterCommands() {
    commandsRef.current = {};
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => processEvent(event);
    const handleKeyUp = (event: KeyboardEvent) => processEvent(event);

    document.addEventListener(EventEnum.KEYDOWN, handleKeyDown);
    document.addEventListener(EventEnum.KEYUP, handleKeyUp);

    return () => {
      document.removeEventListener(EventEnum.KEYDOWN, handleKeyDown);
      document.removeEventListener(EventEnum.KEYUP, handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    deregisterCommands,
    registerCommands,
  };
}
