import { createRef, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { MultiOutputStyle } from './index.style';
import { addClassNames, removeClassNames } from '@utils/elements';

type OutputType = {
  render: () => JSX.Element;
  uuid: string;
};

type MultiOutputProps = {
  outputs: OutputType[];
};

function MultiOutput({ outputs }: MultiOutputProps) {
  const outputsRef = useRef({});

  const tabs = useMemo(() => outputs.map(({ uuid }) => ({ uuid }), [outputs]));

  const [selectedTab, setSelectedTab] = useState<TabType>(tabs?.[0]);

  const outputsMemo = useMemo(() => {
    const arr = [];


    outputs?.forEach(({
      render,
      uuid,
    }, idx: number) => {
      outputsRef.current[uuid] = outputsRef?.current?.[uuid] || createRef<HTMLDivElement>();
      const ref = outputsRef?.current?.[uuid];

      arr.push(
        <div className={idx >= 1 ? 'inactive' : null} key={uuid} ref={ref}>
          {render()}
        </div>
      );
    });

    return arr;
  }, [outputs]);

  return (
    <MultiOutputStyle>
      <ButtonTabs
        selectedTabUUID={selectedTab?.uuid}
        onClickTab={(tab) => {
          setSelectedTab(tab);

          Object.entries(outputsRef?.current || {})?.forEach(([uuid, ref]) => {
            if (ref?.current) {
              if (tab?.uuid === uuid) {
                ref.current.className = removeClassNames(
                  ref.current.className || '',
                  [
                    'inactive',
                  ],
                );
              } else {
                ref.current.className = addClassNames(
                  ref.current.className || '',
                  [
                    'inactive',
                  ],
                );
              }
            }
          });
        }}
        tabs={tabs}
        underlineStyle
      />

      {outputsMemo}
    </MultiOutputStyle>
  );
}

export default MultiOutput;
