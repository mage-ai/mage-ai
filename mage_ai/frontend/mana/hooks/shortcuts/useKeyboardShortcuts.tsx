import React, { useEffect, useRef } from 'react';
import useDebounce from '@utils/hooks/useDebounce';
import { EventEnum } from '../../events/enums';
import { sortByKey } from '@utils/array';
import { validatePredicate } from './utils';
import { isEqual, selectKeys } from '@utils/hash';
import { DEBUG } from '../../utils/debug';
import { KeyMapType } from './interfaces'

export interface KeyboardShortcutsType {
  deregisterCommands: () => void;
  registerCommands: (commands: Record<string, any>, metadata?: Record<string, any>) => void;
}

export interface KeyboardShortcutsProps {
  target: React.MutableRefObject<any | null>;
  timeout?: number;
}

export default function useKeyboardShortcuts({
  target,
  timeout = 1000,
}: KeyboardShortcutsProps): any {
  const [debouncer, cancel] = useDebounce();

  const commandsRef = useRef<Record<string, any>>({});
  const shouldClearAllRef = useRef<boolean>(false);
  const metadataRef = useRef<Record<string, any>>({});
  const timeoutRef = useRef(null);

  const eventsHistoryRef = useRef<Record<string, KeyMapType>>({
    [EventEnum.KEYDOWN]: {} as KeyMapType,
    [EventEnum.KEYUP]: {} as KeyMapType,
  });
  const eventsRef = useRef<Record<string, KeyMapType>>({
    [EventEnum.KEYDOWN]: {} as KeyMapType,
    [EventEnum.KEYUP]: {} as KeyMapType,
  });
  const eventsSeriesRef = useRef<any[][]>([]);

  function registerCommands(commands: Record<string, any>, metadata?: Record<string, any>) {
    commandsRef.current = commands;
    metadataRef.current = metadata;
  }

  function clearAll() {
    eventsHistoryRef.current = {
      [EventEnum.KEYDOWN]: {} as KeyMapType,
      [EventEnum.KEYUP]: {} as KeyMapType,
    };
    eventsRef.current = {
      [EventEnum.KEYDOWN]: {} as KeyMapType,
      [EventEnum.KEYUP]: {} as KeyMapType,
    };
    eventsSeriesRef.current = [];
  }

  function resetTimer() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(clearAll, timeout);
  }

  function executeCommands(event: any) {
    DEBUG.keyboard.shortcuts && console.log('commands', Object.keys(commandsRef.current ?? {}));
    DEBUG.keyboard.shortcuts && console.log('series', eventsSeriesRef.current);
    DEBUG.keyboard.shortcuts && console.log('history', eventsHistoryRef.current);

    const commandsToExecute = {};

    Object.entries(commandsRef?.current ?? {})?.forEach(
      ([uuid, command]: [string, any]) => {
        if (!command?.predicate || !command?.handler) return;

        let valid = false;

        const events = eventsSeriesRef?.current ?? [];

        if (EventEnum.KEYDOWN === event.type) {
          events.push(buildEventSeries());
        }

        const predicates = command?.predicate?.predicates ?? [];

        if (predicates.length >= 2) {
          valid = predicates.every(
            (predicate: any, position: number) =>
              position >= events?.length && validatePredicate(predicate, events[position]),
          );
        } else {
          valid = events.some((arr1: any[]) =>
            predicates.length === 1
              ? validatePredicate(command.predicate, arr1, eventsHistoryRef.current)
              : arr1?.some((event: any) =>
                  validatePredicate(command.predicate, [event], eventsHistoryRef.current),
                ),
          );
        }

        DEBUG.keyboard.shortcuts && console.log('valid', valid);

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

  function buildKey(event3: KeyboardEvent, eventType: any) {
    return {
      altKey: event3.altKey,
      ctrlKey: event3.ctrlKey,
      key: event3.key,
      metaKey: event3.metaKey,
      shiftKey: event3.shiftKey,
      timestamp: Number(new Date()),
      type: eventType,
    } as any;
  }

  function buildEventSeries() {
    const events: any[] = [];

    Object.values(eventsRef?.current ?? {}).forEach((map: KeyMapType) => {
      Object.values(map).forEach((keys: any[]) => {
        events.push(sortByKey(keys, (event: any) => event.timestamp)[0]);
      });
    });

    return events;
  }

  function updateState(event: any) {
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
