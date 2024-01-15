import { useRef } from 'react';

import Header from '@components/ApplicationManager/Header';
import CodeMatrix from '@components/Applications/CodeMatrix';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { ContainerStyle, ContentStyle, InnerStyle } from '@components/ApplicationManager/index.style';
import { HEADER_HEIGHT } from '@components/ApplicationManager/index.style';

function Test() {
  const containerRef = useRef(null);

  return (
    <ContainerStyle
      ref={containerRef}
      style={{
        // border: '1px solid red',
        height: '90vh',
        overflow: 'hidden',
        width: '90vw',
        margin: 'auto',
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
      }}
    >
      <Header
        applications={[{
          applicationConfiguration: {
            item: {
              title: 'Code Matrix',
            },
          },
          uuid: ApplicationExpansionUUIDEnum.CodeMatrix,
        }]}
        closeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => console.log(uuidApp)}
        maximizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => console.log(uuidApp)}
        minimizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => console.log(uuidApp)}
        // setSelectedTab={setSelectedTab}
      />

      <ContentStyle>
        <InnerStyle>
          <CodeMatrix
            containerRef={containerRef}
            headerOffset={HEADER_HEIGHT}
            onMount={() => true}
            uuid={ApplicationExpansionUUIDEnum.CodeMatrix}
          />
        </InnerStyle>
      </ContentStyle>
    </ContainerStyle>
  );
}

export default Test;
