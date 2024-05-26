import { createRef, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import { MultiOutputStyle } from './index.style';
import { addClassNames, removeClassNames } from '@utils/elements';

type OutputType = {
  render: () => JSX.Element;
  uuid: string;
};

type MultiOutputProps = {
  color?: string;
  header?: JSX.Element;
  hideTabs?: boolean;
  outputs: OutputType[];
  onTabChange?: (tab: TabType) => void;
};

function MultiOutput({ color, header, hideTabs, outputs, onTabChange }: MultiOutputProps) {
  const outputsRef = useRef({});

  const tabs = useMemo(
    () =>
      outputs.map(({ uuid }, idx) => ({
        index: idx,
        label: () => uuid,
        uuid: `${uuid}_${idx}`,
      })),
    [outputs],
  );

  const [selectedTab, setSelectedTab] = useState<TabType>(tabs?.[0]);

  const outputsMemo = useMemo(() => {
    const arr = [];

    outputs?.forEach(({ render, uuid: uuidInit }, idx: number) => {
      const uuid = `${uuidInit}_${idx}`;
      outputsRef.current[uuid] = outputsRef?.current?.[uuid] || createRef<HTMLDivElement>();
      const ref = outputsRef?.current?.[uuid];

      arr.push(
        <div className={idx >= 1 ? 'inactive' : null} key={uuid} ref={ref}>
          {render()}
        </div>,
      );
    });

    return arr;
  }, [outputs]);

  return (
    <MultiOutputStyle>
      <FlexContainer alignItems="center" justifyContent="space-between">
        <Flex flex={1}>
          {!hideTabs && (
            <ButtonTabs
              allowScroll
              onClickTab={tab => {
                setSelectedTab(tab);

                Object.entries(outputsRef?.current || {})?.forEach(([uuid, ref]) => {
                  // @ts-ignore
                  if (ref?.current) {
                    if (tab?.uuid === uuid) {
                      // @ts-ignore
                      ref.current.className = removeClassNames(
                        // @ts-ignore
                        ref.current.className || '',
                        ['inactive'],
                      );
                    } else {
                      // @ts-ignore
                      ref.current.className = addClassNames(
                        // @ts-ignore
                        ref.current.className || '',
                        ['inactive'],
                      );
                    }
                  }
                });

                if (onTabChange) {
                  onTabChange?.(tab);
                }
              }}
              selectedTabUUID={selectedTab?.uuid}
              tabs={tabs}
              underlineColor={color}
              underlineStyle
            />
          )}
        </Flex>

        {header}
      </FlexContainer>

      {outputsMemo}
    </MultiOutputStyle>
  );
}

export default MultiOutput;
