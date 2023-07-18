import { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientButton from '@oracle/elements/Button/GradientButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { TabsContainerStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';

export type TabType = {
  Icon?: any;
  IconSelected?: any;
  label?: () => string;
  uuid: string;
};

type ButtonTabsProps = {
  allowScroll?: boolean;
  compact?: boolean;
  contained?: boolean;
  noPadding?: boolean;
  onClickTab: (tab: TabType) => void;
  regularSizeText?: boolean;
  selectedTabUUID?: string;
  small?: boolean;
  tabs: TabType[];
};

function ButtonTabs({
  allowScroll,
  compact,
  contained,
  noPadding,
  onClickTab,
  regularSizeText,
  selectedTabUUID,
  small,
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

          <Text
            bold
            default={!selected}
            noWrapping
            small={!regularSizeText}
          >
            {displayText}
          </Text>
        </FlexContainer>
      );

      if (idx >= 1 && tabCount >= 2) {
        arr.push(
          <div
            key={`spacing-${uuid}`}
            style={{ marginLeft: 1.5 * UNIT }}
          />,
        );
      }

      if (selected) {
        arr.push(
          <GradientButton
            backgroundGradient={PURPLE_BLUE}
            backgroundPanel
            borderLess
            borderWidth={2}
            compact={compact || small}
            key={uuid}
            onClick={(e) => {
              pauseEvent(e);
              onClickTab(tab);
            }}
            paddingUnitsHorizontal={1.75}
            paddingUnitsVertical={1.25}
            small={small}
          >
            {el}
          </GradientButton>,
        );
      } else {
        arr.push(
          <div key={`button-tab-${uuid}`} style={{ padding: 2 }}>
            <Button
              borderLess
              compact={compact || small}
              default
              onClick={(e) => {
                pauseEvent(e);
                onClickTab(tab);
              }}
              outline
              small={small}
            >
              {el}
            </Button>
          </div>,
        );
      }
    });

    return arr;
  }, [
    compact,
    onClickTab,
    selectedTabUUID,
    small,
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
    <TabsContainerStyle
      allowScroll={allowScroll}
      noPadding={noPadding}
    >
      {el}
    </TabsContainerStyle>
  );
}

export default ButtonTabs;
