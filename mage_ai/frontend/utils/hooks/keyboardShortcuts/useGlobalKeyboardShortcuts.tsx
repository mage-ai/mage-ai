import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KEY_CODE_METAS } from './constants';
import { isEmptyObject } from '@utils/hash';
import { logRender } from '@utils/environment';

export default function useGlobalKeyboardShortcuts(keyMapping, keyHistory) {
  const [disableGlobalKeyboardShortcuts, setDisableGlobalKeyboardShortcuts] =
    useState<boolean>(false);
  const timeout = useRef(null);

  const onKeyDownDependencies = useMemo(() => ({}), []);
  const onKeyDownRegistry = useMemo(() => ({}), []);
  const onKeyUpDependencies = useMemo(() => ({}), []);
  const onKeyUpRegistry = useMemo(() => ({}), []);

  const registerOnKeyDown = useCallback(
    (uuid, onKeyDown, dependencies = []) => {
      if (!!uuid) {
        onKeyDownDependencies[uuid] = dependencies;
        onKeyDownRegistry[uuid] = onKeyDown;
      }
    },
    [onKeyDownDependencies, onKeyDownRegistry],
  );

  const registerOnKeyUp = useCallback(
    (uuid, onKeyUp, dependencies = []) => {
      if (!!uuid) {
        onKeyUpDependencies[uuid] = dependencies;
        onKeyUpRegistry[uuid] = onKeyUp;
      }
    },
    [onKeyUpDependencies, onKeyUpRegistry],
  );

  const unregisterOnKeyDown = useCallback(
    uuid => {
      delete onKeyDownDependencies?.[uuid];
      delete onKeyDownRegistry?.[uuid];
    },
    [onKeyDownDependencies, onKeyDownRegistry],
  );

  const unregisterOnKeyUp = useCallback(
    uuid => {
      delete onKeyUpDependencies?.[uuid];
      delete onKeyUpRegistry?.[uuid];
    },
    [onKeyUpDependencies, onKeyUpRegistry],
  );

  useEffect(() => {
    const handleKeyDown = event => {
      if (isEmptyObject(onKeyDownRegistry) && isEmptyObject(onKeyUpRegistry)) {
        return;
      }

      const { altKey, ctrlKey, keyCode, metaKey, shiftKey } = event;
      const newMapping = {
        ...keyMapping.current,
        altKey,
        ctrlKey,
        [keyCode]: true,
        metaKey,
        shiftKey,
      };
      const newHistory = [keyCode].concat(keyHistory.current);

      if (!keyMapping.current[keyCode]) {
        keyMapping.current = newMapping;
        keyHistory.current = newHistory;
      }

      Object.entries(onKeyDownRegistry).forEach(([uuid, onKeyDown]) => {
        // @ts-ignore
        onKeyDown(event, newMapping || {}, newHistory);
        // logRender(`[keydown]: ${uuid}`);
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // keyHistory.current,
    // keyMapping.current,
    onKeyDownRegistry,
    onKeyUpRegistry,
    // ...Object.values(onKeyDownDependencies),
  ]);

  useEffect(() => {
    const handleKeyUp = event => {
      if (isEmptyObject(onKeyDownRegistry) && isEmptyObject(onKeyUpRegistry)) {
        return;
      }

      const { altKey, ctrlKey, keyCode, metaKey, shiftKey } = event;
      const previousMapping = keyMapping.current;
      const previousHistory = keyHistory.current;

      // If key up is command, clear all keys.
      // When holding down the command key, onKeyUp for a 2nd key doesn’t work.
      const newMapping = KEY_CODE_METAS.includes(keyCode)
        ? {}
        : {
            ...previousMapping,
            altKey,
            ctrlKey,
            [keyCode]: false,
            metaKey,
            shiftKey,
          };

      keyMapping.current = newMapping;

      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        keyHistory.current = [];
      }, 1000);

      Object.entries(onKeyUpRegistry).forEach(([uuid, onKeyUp]) => {
        // @ts-ignore
        onKeyUp(event, previousMapping || {}, previousHistory, newMapping || {});
        // logRender(`[keyup]  : ${uuid}`);
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // keyHistory.current,
    // keyMapping.current,
    onKeyDownRegistry,
    onKeyUpRegistry,
    // ...Object.values(onKeyUpDependencies),
  ]);

  useEffect(() => {
    const handleFocus = () => {
      keyHistory.current = [];
      keyMapping.current = {};
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);

      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [keyHistory, keyMapping]);

  return {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    setDisableGlobalKeyboardShortcuts,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  };
}
