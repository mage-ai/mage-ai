import React, { useCallback, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';

type MultiSelectProps = {
  children: any[];
  onChange: (values: string[] | number[], opts?: {
    resetValues?: () => void;
    setValues?: (values: any) => void;
  }) => void;
}

function MultiSelect({
  children,
  onChange,
}: MultiSelectProps) {
  const [values, setValues] = useState<string[] | number[]>(
    React.Children.map(children, () => null),
  );
  const [loads, setLoads] = useState<number>(0);

  return (
    <FlexContainer>
      {React.Children.map(children, (child, idx) => (
        <Spacing
          key={`multi-select-child-${idx}-${loads}`}
          ml={idx >= 1 ? 1 : 0}
          style={{
            display: 'flex',
            flex: 1,
          }}
        >
          {React.cloneElement(child, {
            onChange: (e) => {
              setValues((valuesPrevious) => {
                // @ts-ignore
                valuesPrevious[idx] = e.target.value;

                onChange(valuesPrevious, {
                  resetValues: () => setLoads(loadsPrev => loadsPrev + 1),
                  setValues,
                });

                return valuesPrevious;
              });
            },
            value: values[idx],
          })}
        </Spacing>
      ))}
    </FlexContainer>
  );
}

export default MultiSelect;
