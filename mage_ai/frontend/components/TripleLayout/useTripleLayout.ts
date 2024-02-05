import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import usePrevious from '@utils/usePrevious';
import { UNIT } from '@oracle/styles/units/spacing';
import { get, set, setLocalStorageValue } from '@storage/localStorage';
import { useWindowSize } from '@utils/sizes';

const DEFAULT_ASIDE_WIDTH = 25 * UNIT;
const MINIMUM_WIDTH_MAIN_CONTAINER = DEFAULT_ASIDE_WIDTH * 2;
export const DEFAULT_BEFORE_RESIZE_OFFSET = 72;

function useAside(uuid, refData, {
  disable,
  hidden: hiddenProp,
  mainContainerWidth,
  refOther,
  resizeOffset = 0,
  setWidth: setWidthProp,
  width: widthProp,
  widthOverride,
  widthWindow,
}: {
  disable?: boolean;
  hidden?: boolean;
  mainContainerWidth?: number;
  refOther?: {
    current: {
      disable?: boolean;
      widthOverride?: boolean;
      width?: number;
      widthProp?: number;
    };
  };
  resizeOffset?: number;
  setWidth?: (value: number) => void;
  width?: number;
  widthOverride?: boolean;
  widthWindow?: number;
}): {
  hidden?: boolean;
  mousedownActive: boolean;
  setHidden: (value: boolean | ((value: boolean) => boolean)) => void;
  setMousedownActive: (value: boolean | ((value: boolean) => boolean)) => void;
  setWidth: (value: number | ((value: number) => number)) => void;
  width: number;
} {
  const key = useMemo(() => `${uuid}_width`, [uuid]);
  const keyHidden = useMemo(() => `${uuid}_hidden`, [uuid]);
  const hiddenLocal = get(keyHidden);
  const widthLocal = get(key);

  const [hidden, setHiddenState] = useState([
    hiddenLocal,
    hiddenProp,
    false,
  ].find(v => typeof v !== 'undefined' && v !== null));
  const [mousedownActive, setMousedownActive] = useState(false);
  const [widthState, setWidthState] = useState(
    typeof widthLocal !== 'undefined'
        ? widthLocal : typeof widthProp !== 'undefined'
          ? widthProp
          : DEFAULT_ASIDE_WIDTH,
  );

  const setHidden = useCallback((prev) => {
    setHiddenState(prev);
    set(keyHidden, typeof prev === 'function' ? prev?.() : prev);
  }, [keyHidden]);

  const width = useMemo(() => {
    let value = (typeof widthProp !== 'undefined' && widthOverride) ? widthProp : widthState;


    if (typeof widthWindow !== 'undefined') {
      value = Math.min(value, widthWindow - (MINIMUM_WIDTH_MAIN_CONTAINER + DEFAULT_ASIDE_WIDTH));
    }

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
        widthWindow - (MINIMUM_WIDTH_MAIN_CONTAINER + (refOther?.current?.disable
          ? 0
          : (refOther?.current?.widthOverride ? refOther?.current?.widthProp : refOther?.current?.width) || DEFAULT_ASIDE_WIDTH
        )),
        DEFAULT_ASIDE_WIDTH + MINIMUM_WIDTH_MAIN_CONTAINER + (refOther?.current?.disable ? 0 : DEFAULT_ASIDE_WIDTH),
      );

      // May need to add a resize offset to previous width so the aside panel
      // doesn't jump when resizing it. The panel might jump about 72px.
      let value = prev + resizeOffset;
      if (value < DEFAULT_ASIDE_WIDTH) {
        value = DEFAULT_ASIDE_WIDTH;
      } else if (value > maxWidth) {
        value = prev;
      }

      if (!!prev) {
        setWidthState(value);
        setLocalStorageValue(key, value);

        if (setWidthProp) {
          setWidthProp(value);
        }
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
    refData,
    refOther,
    resizeOffset,
    setWidthProp,
    widthWindow,
  ]);

  const widthWindowPrev = usePrevious(widthWindow);
  useEffect(() => {
    if (typeof widthWindow !== 'undefined'
      && typeof widthWindowPrev !== 'undefined'
      && widthWindow !== widthWindowPrev
    ) {
      setWidth(widthWindow * (width / widthWindowPrev));
    }
  }, [width, widthWindow, widthWindowPrev]);

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
    hidden,
    mousedownActive,
    setHidden,
    setMousedownActive,
    setWidth,
    width,
  };
}

export type UseTripleLayoutType = {
  hiddenAfter?: boolean;
  hiddenBefore?: boolean;
  mainContainerRef: {
    current: any;
  };
  mousedownActiveAfter: boolean;
  mousedownActiveBefore: boolean;
  setHiddenAfter: (value: boolean | ((value: boolean) => boolean)) => void;
  setHiddenBefore: (value: boolean | ((value: boolean) => boolean)) => void;
  setMousedownActiveAfter: (value: boolean | ((value: boolean) => boolean)) => void;
  setMousedownActiveBefore: (value: boolean | ((value: boolean) => boolean)) => void;
  setWidthAfter: (value: number | ((value: number) => number)) => void;
  setWidthBefore: (value: number | ((value: number) => number)) => void;
  widthAfter: number;
  widthBefore: number;
};

export type UseTripleLayoutProps = {
  beforeResizeOffset?: number;
  disableAfter?: boolean;
  disableBefore?: boolean;
  hiddenAfter?: boolean;
  hiddenBefore?: boolean;
  mainContainerRef?: any;
  setWidthAfter?: (value: number) => void;
  setWidthBefore?: (value: number) => void;
  widthAfter?: number;
  widthBefore?: number;
  widthOverrideAfter?: boolean;
  widthOverrideBefore?: boolean;
};

export default function useTripleLayout(uuid: string, {
  beforeResizeOffset,
  disableAfter,
  disableBefore,
  hiddenAfter: hiddenAfterProp,
  hiddenBefore: hiddenBeforeProp,
  mainContainerRef: mainContainerRefProp,
  setWidthAfter: setWidthAfterProp,
  setWidthBefore: setWidthBeforeProp,
  widthAfter: widthAfterProp,
  widthBefore: widthBeforeProp,
  widthOverrideAfter: widthOverrideAfterProp,
  widthOverrideBefore: widthOverrideBeforeProp,
}: UseTripleLayoutProps = {}): UseTripleLayoutType {
  const { width: widthWindow } = useWindowSize();
  const keyAfter = useMemo(() => `layout_after_${uuid}`, [uuid]);
  const keyBefore = useMemo(() => `layout_before_${uuid}`, [uuid]);

  const mainContainerRef = mainContainerRefProp || useRef(null);
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
    hidden: hiddenAfter,
    mousedownActive: mousedownActiveAfter,
    setHidden: setHiddenAfter,
    setMousedownActive: setMousedownActiveAfter,
    setWidth: setWidthAfter,
    width: widthAfter,
  } = useAside(keyAfter, refAfter, {
    disable: disableAfter,
    hidden: hiddenAfterProp,
    mainContainerWidth,
    refOther: refBefore,
    setWidth: setWidthAfterProp,
    width: widthAfterProp,
    widthOverride: widthOverrideAfterProp,
    widthWindow,
  });

  const {
    hidden: hiddenBefore,
    mousedownActive: mousedownActiveBefore,
    setHidden: setHiddenBefore,
    setMousedownActive: setMousedownActiveBefore,
    setWidth: setWidthBefore,
    width: widthBefore,
  } = useAside(keyBefore, refBefore, {
    disable: disableBefore,
    hidden: hiddenBeforeProp,
    mainContainerWidth,
    refOther: refAfter,
    resizeOffset: beforeResizeOffset,
    setWidth: setWidthBeforeProp,
    width: widthBeforeProp,
    widthOverride: widthOverrideBeforeProp,
    widthWindow,
  });

  useEffect(() => {
    refBefore.current = {
      disable: disableBefore,
      width: widthBefore,
      widthOverride: widthOverrideBeforeProp,
      widthProp: widthBeforeProp,
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
    hiddenAfter,
    hiddenBefore,
    mainContainerRef,
    mousedownActiveAfter,
    mousedownActiveBefore,
    setHiddenAfter,
    setHiddenBefore,
    setMousedownActiveAfter,
    setMousedownActiveBefore,
    setWidthAfter,
    setWidthBefore,
    widthAfter,
    widthBefore,
  };
}
