import React, { useContext, useEffect, useState } from 'react';
import ReactLoading from 'react-loading';

import dark from '@oracle/styles/themes/dark';
import { ThemeContext } from 'styled-components';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT, PADDING } from '@oracle/styles/units/spacing';

export type SpinnerProps = {
  color?: string;
  fullScreen?: boolean;
  inverted?: boolean;
  large?: boolean;
  left?: number;
  relative?: boolean;
  right?: number;
  size?: number;
  small?: boolean;
  top?: number;
  type?: 'blank' | 'balls' | 'bars' | 'bubbles' | 'cubes' | 'cylon' | 'spin' | 'spinningBubbles' | 'spokes'
};

const Spinner = ({
  color,
  fullScreen,
  inverted,
  large,
  left = 0,
  relative,
  right = 0,
  size = 24,
  small,
  top = 0,
  type = 'spin',
}: SpinnerProps) => {
  const [bodyHeight, setBodyHeight] = useState(undefined);
  const [bodyWidth, setBodyWidth] = useState(undefined);
  const themeContext: ThemeType = useContext(ThemeContext);

  let finalSize = size;
  if (large) {
    finalSize = UNIT * 5;
  } else if (small) {
    finalSize = UNIT * 2;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBodyHeight(window.document.body.offsetHeight);
      setBodyWidth(window.document.body.offsetWidth);
    }
  }, [bodyHeight, bodyWidth]);

  const loadingEl = (
    // @ts-ignore
    <ReactLoading
      color={color
        ? color
        : inverted
          ? (themeContext.loader || dark.loader).colorInverted
          : (themeContext.loader || dark.loader).color
      }
      height={finalSize}
      type={type}
      width={finalSize}
    />
  );

  if (!fullScreen) {
    return loadingEl;
  }

  if (bodyHeight && bodyWidth) {
    const bodyHeightAdjusted: number = bodyHeight - (PADDING);

    return (
      <div
        style={{
          left: !relative ? (left + ((bodyWidth - finalSize) / 2)) - right : null,
          position: 'fixed',
          top: top + (bodyHeightAdjusted / 2) - (finalSize / 2),
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
