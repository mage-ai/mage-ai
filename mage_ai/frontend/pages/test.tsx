import { useRef } from 'react';

import CodeMatrix from '@components/Applications/CodeMatrix';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { HEADER_HEIGHT } from '@components/ApplicationManager/index.style';

function Test() {
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid red',
        height: 1200,
        overflow: 'hidden',
        width: '80vw',
      }}
    >
      <CodeMatrix
        containerRef={containerRef}
        headerOffset={HEADER_HEIGHT}
        onMount={() => true}
        uuid={ApplicationExpansionUUIDEnum.CodeMatrix}
      />
    </div>
  );
}

export default Test;
