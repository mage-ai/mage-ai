import React from 'react';

import { SubheaderStyle } from './index.style';

type SubheaderProps = {
  children?: any;
};

function Subheader({
  children,
}: SubheaderProps, ref) {
  return (
    <SubheaderStyle ref={ref}>
      {children}
    </SubheaderStyle>
  );
}

export default React.forwardRef(Subheader);
