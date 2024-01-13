import {
  useEffect,
  useRef,
  useState,
} from 'react';

import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import { KEY_CODE_METAS } from './constants';
import { logRender } from '@utils/environment';

export function useKeyboardShortcuts(uuid, elementToListen, {
  dependencies = [],
  onKeyDown = undefined,
  onKeyUp = undefined,
}: {
  dependencies?: any[],
  onKeyDown?: (event: any, newMapping: any, newHistory: any) => void,
  onKeyUp?: (event: any, oldMapping: any, newHistory: any, newMapping: any) => void,
}): KeyboardShortcutType {
  const timeout = useRef(null);
  const [keyMapping, setKeyMapping] = useState({});
  const [keyHistory, setKeyHistory] = useState([]);

  useEffect(() => {
    const handleKeyUp = (event) => {
      const {
        altKey,
        ctrlKey,
        keyCode,
        metaKey,
        shiftKey,
      } = event;
      // If key up is command, clear all keys.
      // When holding down the command key, onKeyUp for a 2nd key doesn’t work.
      const newMapping = KEY_CODE_METAS.includes(keyCode)
        ? {
          ...keyMapping,
          [uuid]: {},
        }
        : {
          ...keyMapping,
          [uuid]: {
            ...keyMapping[uuid],
            altKey,
            ctrlKey,
            [keyCode]: false,
            metaKey,
            shiftKey,
          },
        };

      setKeyMapping(newMapping);

      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        setKeyHistory([]);
      }, 1000);

      onKeyUp?.(event, keyMapping[uuid] || {}, keyHistory, newMapping[uuid] || {});
    };

    const handleKeyDown = (event) => {
      const {
        altKey,
        ctrlKey,
        keyCode,
        metaKey,
        shiftKey,
      } = event;
      const newMapping = {
        ...keyMapping,
        [uuid]: {
          ...keyMapping[uuid],
          altKey,
          ctrlKey,
          [keyCode]: true,
          metaKey,
          shiftKey,
        },
      };
      const newHistory = [keyCode].concat(keyHistory);

      if (!keyMapping[keyCode]) {
        setKeyMapping(newMapping);
        setKeyHistory(newHistory);
      }

      onKeyDown?.(event, newMapping[uuid] || {}, newHistory);

      // logRender(`keyboardShortcuts keydown ${uuid}`);
    };

    const el = elementToListen?.current || elementToListen;

    el?.addEventListener('keydown', handleKeyDown);
    el?.addEventListener('keyup', handleKeyUp);

    return () => {
      el?.removeEventListener('keydown', handleKeyDown);
      el?.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    elementToListen,
    keyHistory,
    keyMapping,
    onKeyDown,
    setKeyHistory,
    setKeyMapping,
  ].concat(dependencies));

  return {
    keyHistory,
    keyMapping,
  };
}
