import { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientButton from '@oracle/elements/Button/GradientButton';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';

export type TabType = {
  label?: () => string;
  uuid: string;
};

type ButtonTabsProps = {
  onClickTab: (tab: TabType) => void;
  selectedTabUUID?: string;
  tabs: TabType[];
};

function ButtonTabs({
  onClickTab,
  selectedTabUUID,
  tabs,
}: ButtonTabsProps) {
  const tabEls = useMemo(() => {
    const tabCount: number = tabs.length;
    const arr = [];

    tabs.forEach((tab: TabType, idx: number) => {
      const {
        label,
        uuid,
      } = tab;
      const displayText = label ? label() : uuid;

      if (idx >= 1 && tabCount >= 2) {
        arr.push(
          <div
            key={`spacing-${uuid}`}
            style={{ marginLeft: 1.5 * UNIT }}
          />
        );
      }

      if (uuid === selectedTabUUID) {
        arr.push(
          <GradientButton
            backgroundGradient={PURPLE_BLUE}
            backgroundPanel
            borderLess
            borderWidth={2}
            key={uuid}
            onClick={() => onClickTab(tab)}
            paddingUnitsHorizontal={2}
            paddingUnitsVertical={1.25}
          >
            {displayText}
          </GradientButton>
        );
      } else {
        arr.push(
          <div style={{ padding: 4 }}>
            <Button
              borderLess
              default
              key={`button-tab-${uuid}`}
              onClick={() => onClickTab(tab)}
              outline
            >
              {displayText}
            </Button>
          </div>
        );
      }
    });

    return arr;
  }, [
    onClickTab,
    selectedTabUUID,
    tabs,
  ])

  return (
    <FlexContainer alignItems="center">
      {tabEls}
    </FlexContainer>
  );
}

export default ButtonTabs;
