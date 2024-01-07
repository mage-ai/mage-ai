import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import usePrevious from '@utils/usePrevious';
import { UNIT } from '@oracle/styles/units/spacing';
import { get, set, setLocalStorageValue } from '@storage/localStorage';
import { useWindowSize } from '@utils/sizes';

const DEFAULT_ASIDE_WIDTH = 25 * UNIT;
const MINIMUM_WIDTH_MAIN_CONTAINER = DEFAULT_ASIDE_WIDTH * 2;

function useAside(uuid, refData, {
  disable,
  refOther,
  setWidth: setWidthProp,
  width: widthProp,
  widthOverride,
  widthWindow,
}: {
  disable?: boolean;
  refOther?: {
    current: {
      disable?: boolean;
      widthOverride?: boolean;
      width?: number;
      widthProp?: number;
    };
  };
  setWidth?: (value: number) => void;
  width?: number;
  widthOverride?: boolean;
  widthWindow?: number;
}): {
  mousedownActive: boolean;
  setMousedownActive: (value: boolean) => void;
  setWidth: (value: number) => void;
  width: number;
} {
  const key = useMemo(() => `${uuid}_width`, [uuid]);
  const widthLocal = get(key);

  const [mousedownActive, setMousedownActive] = useState(false);
  const [widthState, setWidthState] = useState(widthLocal || widthProp);

  const width = useMemo(() => {
    const value = (typeof widthProp !== 'undefined' && widthOverride) ? widthProp : widthState;

    refData.current = {
      ...refData.current,
      widthOverride,
      widthProp,
    };

    return value || DEFAULT_ASIDE_WIDTH;
  }, [
    setWidthProp,
    widthOverride,
    widthProp,
    widthState,
  ]);

  const setWidth = useCallback((prev) => {
    if (!disable) {
      const maxWidth = Math.max(
        widthWindow - (MINIMUM_WIDTH_MAIN_CONTAINER + (refOther?.disable
          ? 0
          : (refOther?.widthOverride ? refOther?.widthProp : refOther?.width) || DEFAULT_ASIDE_WIDTH
        )),
        DEFAULT_ASIDE_WIDTH + MINIMUM_WIDTH_MAIN_CONTAINER + (refOther?.disable ? 0 : DEFAULT_ASIDE_WIDTH),
      );

      const value = Math.max(DEFAULT_ASIDE_WIDTH, Math.min(maxWidth, prev));

      setWidthState(value);
      setLocalStorageValue(key, value);

      if (setWidthProp) {
        setWidthProp(value);
      }

      refData.current = {
        ...refData.current,
        disable,
        width: value,
      };
    }
  }, [
    disable,
    key,
    refOther,
    setWidthProp,
    widthWindow,
  ]);

  const widthPropPrev = usePrevious(widthProp);
  useEffect(() => {
    if (!disable && widthOverride && widthPropPrev !== widthProp) {
      setWidth(widthProp);
    }
  }, [
    disable,
    setWidth,
    widthOverride,
    widthProp,
    widthPropPrev,
  ]);

  return {
    mousedownActive,
    setMousedownActive,
    setWidth,
    width,
  };
}

export type UseTripleLayoutType = {
  mainContainerRef: {
    current: any;
  };
  mousedownActiveAfter: boolean;
  mousedownActiveBefore: boolean;
  setMousedownActiveAfter: (value: boolean) => void;
  setMousedownActiveBefore: (value: boolean) => void;
  setWidthAfter: (value: number) => void;
  setWidthBefore: (value: number) => void;
  widthAfter: number;
  widthBefore: number;
}

export type UseTripleLayoutProps = {
  disableAfter?: boolean;
  disableBefore?: boolean;
  setWidthAfter?: (value: number) => void;
  setWidthBefore?: (value: number) => void;
  widthAfter?: number;
  widthBefore?: number;
  widthOverrideAfter?: boolean;
  widthOverrideBefore?: boolean;
};

export default function useTripleLayout(uuid: string, {
  disableAfter,
  disableBefore,
  setWidthAfter: setWidthAfterProp,
  setWidthBefore: setWidthBeforeProp,
  widthAfter: widthAfterProp,
  widthBefore: widthBeforeProp,
  widthOverrideAfter: widthOverrideAfterProp,
  widthOverrideBefore: widthOverrideBeforeProp,
}: UseTripleLayoutProps): UseTripleLayoutType {
  const { width: widthWindow } = useWindowSize();
  const keyAfter = useMemo(() => `layout_after_${uuid}`, [uuid]);
  const keyBefore = useMemo(() => `layout_before_${uuid}`, [uuid]);

  const mainContainerRef = useRef(null);
  const [mainContainerWidthInit, setMainContainerWidth] = useState<number>(null);
  const mainContainerWidth = useMemo(() => Math.max(
    mainContainerWidthInit - MINIMUM_WIDTH_MAIN_CONTAINER,
    MINIMUM_WIDTH_MAIN_CONTAINER,
  ), [mainContainerWidthInit]);

  const refAfter = useRef({
    disable: disableAfter,
    widthOverride: widthOverrideAfterProp,
    width: null,
    widthProp: widthAfterProp,
  });
  const refBefore = useRef({
    disable: disableBefore,
    widthOverride: widthOverrideBeforeProp,
    width: null,
    widthProp: widthBeforeProp,
  });

  const {
    mousedownActive: mousedownActiveAfter,
    setMousedownActive: setMousedownActiveAfter,
    setWidth: setWidthAfter,
    width: widthAfter,
  } = useAside(keyAfter, refAfter, {
    disable: disableAfter,
    refOther: refBefore,
    setWidth: setWidthAfterProp,
    width: widthAfterProp,
    widthOverride: widthOverrideAfterProp,
    widthWindow,
  });

  const {
    mousedownActive: mousedownActiveBefore,
    setMousedownActive: setMousedownActiveBefore,
    setWidth: setWidthBefore,
    width: widthBefore,
  } = useAside(keyBefore, refBefore, {
    disable: disableBefore,
    refOther: refAfter,
    setWidth: setWidthBeforeProp,
    width: widthBeforeProp,
    widthOverride: widthOverrideBeforeProp,
    widthWindow,
  });

  useEffect(() => {
    refBefore.current = {
      disableBefore,
      widthBefore,
      widthOverrideBeforeProp,
    };
  }, [
    disableBefore,
    widthBefore,
    widthOverrideBeforeProp,
  ]);

  useEffect(() => {
    if (mainContainerRef?.current && !(mousedownActiveAfter || mousedownActiveBefore)) {
      setMainContainerWidth?.(mainContainerRef?.current?.getBoundingClientRect()?.width);
    }
  }, [
    mousedownActiveAfter,
    mousedownActiveBefore,
    setMainContainerWidth,
    widthAfter,
    widthBefore,
    widthWindow,
  ]);

  // What is this used for? It keeps resetting the widths...

  // useEffect(() => {
  //   if (!afterMousedownActive) {
  //     set(localStorageKeyAfter, afterWidth);
  //   }
  // }, [
  //   afterHidden,
  //   afterMousedownActive,
  //   afterWidth,
  //   localStorageKeyAfter,
  // ]);

  // useEffect(() => {
  //   if (!beforeMousedownActive) {
  //     set(localStorageKeyBefore, beforeWidth);
  //   }
  // }, [
  //   beforeMousedownActive,
  //   beforeWidth,
  //   localStorageKeyBefore,
  // ]);

  return {
    mainContainerRef,
    mousedownActiveAfter,
    mousedownActiveBefore,
    setMousedownActiveAfter,
    setMousedownActiveBefore,
    setWidthAfter,
    setWidthBefore,
    widthAfter,
    widthBefore,
  };
}
