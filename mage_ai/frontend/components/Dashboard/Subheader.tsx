import React from 'react';

import { SubheaderStyle } from './index.style';

type SubheaderProps = {
  children?: any;
  noPadding?: boolean;
};

function Subheader({
  children,
  noPadding,
}: SubheaderProps, ref) {
  return (
    <SubheaderStyle noPadding={noPadding} ref={ref}>
      {children}
    </SubheaderStyle>
  );
}

export default React.forwardRef(Subheader);
