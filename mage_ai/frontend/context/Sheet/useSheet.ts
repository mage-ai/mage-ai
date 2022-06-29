import {
  DependencyList,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  SheetContext,
  SheetProps,
  SheetType,
  UseSheetOptionsType,
} from './SheetContext';
import {
  generateKey,
  isFunctionalComponent,
} from '@context/shared/utils';

type ShowSheet = () => void;
type HideSheet = () => void;

export const useSheet = (
  component: SheetType,
  sheetProps: SheetProps,
  inputs: DependencyList = [],
  opts: UseSheetOptionsType = {},
): [ShowSheet, HideSheet] => {
  if (!isFunctionalComponent(component)) {
    throw new Error(
      'Only stateless components can be used as an argument to useSheet. ' +
      'You have probably passed a class component where a function was expected.'
    );
  }

  const key = useMemo(generateKey, []);
  const sheet = useMemo(() => component, inputs);
  const context = useContext(SheetContext);
  const [isShown, setShown] = useState<boolean>(false);
  const showSheet = useCallback(() => setShown(true), []);
  const hideSheet = useCallback(() => setShown(false), []);

  useEffect(() => {
    if (isShown) {
      context.showSheet(key, sheet, hideSheet, sheetProps, opts);
    } else {
      context.hideSheet(key, opts);
    }

    return () => context.hideSheet(key, opts);
  }, [isShown, sheet]);

  return [showSheet, hideSheet];
};
