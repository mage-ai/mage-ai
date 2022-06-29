import React, { useContext, useEffect, useState } from 'react';
import ReactLoading from 'react-loading';

import light from '@oracle/styles/themes/light';
import { ThemeContext } from 'styled-components';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT, PADDING } from '@oracle/styles/units/spacing';

export type SpinnerProps = {
  fullScreen?: boolean;
  inverted?: boolean;
  large?: boolean;
  left?: number;
  relative?: boolean;
  right?: number;
  small?: boolean;
  top?: number;
};

const Spinner = ({
  fullScreen,
  large,
  left = 0,
  relative,
  right = 0,
  small,
  top = 0,
}: SpinnerProps) => {
  const [bodyHeight, setBodyHeight] = useState(undefined);
  const [bodyWidth, setBodyWidth] = useState(undefined);
  const themeContext: ThemeType = useContext(ThemeContext);

  let size: number = UNIT * 3;
  if (large) {
    size = UNIT * 5;
  } else if (small) {
    size = UNIT * 2;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBodyHeight(window.document.body.offsetHeight);
      setBodyWidth(window.document.body.offsetWidth);
    }
  }, [bodyHeight, bodyWidth]);

  if (bodyHeight && bodyWidth) {
    const bodyHeightAdjusted: number = bodyHeight - (PADDING);
    const loadingEl = (
      // @ts-ignore
      <ReactLoading
        color={
          (themeContext.loader || light.loader).color
        }
        height={size}
        type="spin"
        width={size}
      />
    );

    if (!fullScreen) {
      return loadingEl;
    }

    return (
      <div
        style={{
          left: !relative ? (left + ((bodyWidth - size) / 2)) - right : null,
          position: 'fixed',
          top: top + (bodyHeightAdjusted / 2) - (size / 2),
          zIndex: 50,
        }}
      >
        {loadingEl}
      </div>
    );
  }

  return <div />;
};

export default Spinner;
