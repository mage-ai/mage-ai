import { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientButton from '@oracle/elements/Button/GradientButton';
import Spacing from '@oracle/elements/Spacing';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export type TabType = {
  Icon?: any;
  IconSelected?: any;
  label?: () => string;
  uuid: string;
};

type ButtonTabsProps = {
  contained?: boolean;
  onClickTab: (tab: TabType) => void;
  selectedTabUUID?: string;
  tabs: TabType[];
};

function ButtonTabs({
  contained,
  onClickTab,
  selectedTabUUID,
  tabs,
}: ButtonTabsProps) {
  const tabEls = useMemo(() => {
    const tabCount: number = tabs.length;
    const arr = [];

    tabs.forEach((tab: TabType, idx: number) => {
      const {
        Icon,
        IconSelected,
        label,
        uuid,
      } = tab;
      const selected = uuid === selectedTabUUID;
      const IconToUse = selected ? (IconSelected || Icon) : Icon;
      const displayText = label ? label() : uuid;
      const el = (
        <FlexContainer alignItems="center">
          {IconToUse && (
            <>
              <IconToUse
                default={!selected}
                size={2 * UNIT}
              />
              <Spacing mr={1} />
            </>
          )}

          {displayText}
        </FlexContainer>
      );

      if (idx >= 1 && tabCount >= 2) {
        arr.push(
          <div
            key={`spacing-${uuid}`}
            style={{ marginLeft: 1.5 * UNIT }}
          />
        );
      }

      if (selected) {
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
            {el}
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
              {el}
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
  ]);

  const el = (
    <FlexContainer alignItems="center">
      {tabEls}
    </FlexContainer>
  );

  if (contained) {
    return el;
  }

  return (
    <div
      style={{
        paddingLeft: PADDING_UNITS * UNIT,
        paddingRight: PADDING_UNITS * UNIT,
      }}
    >
      {el}
    </div>
  );
}

export default ButtonTabs;
