import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import Develop from '@oracle/icons/custom/Develop';
import Orchestrate from '@oracle/icons/custom/Orchestrate';
import React from 'react';

type HeaderProps = {
  page: string;
  setPage: (page: string) => void;
};

function Header({
  page,
  setPage,
}: HeaderProps) {
  return (
    <FlexContainer flexDirection="row">
      <Button
        beforeIcon={Develop}
        onClick={() => setPage('develop')}
      >
        Develop
      </Button>
      <Button
        beforeIcon={Orchestrate}
        onClick={() => setPage('orchestrate')}
      >
        Jobs
      </Button>
    </FlexContainer>
  );
}

export default Header;
