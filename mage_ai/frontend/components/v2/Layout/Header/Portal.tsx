import React from 'react';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { WithOnMount } from '@mana/hooks/useWithOnMount';
import { useLayout } from '@context/v2/Layout';

function HeaderPortal({ headerRef }: { headerRef: React.RefObject<HTMLDivElement> }) {
  const { initialize } = useLayout();

  return (
    <WithOnMount onMount={() => initialize({ headerRef })}>
      <header
        className={stylesHeader.header}
        ref={headerRef}
      />
    </WithOnMount >
  );
}

export default React.forwardRef(HeaderPortal);
