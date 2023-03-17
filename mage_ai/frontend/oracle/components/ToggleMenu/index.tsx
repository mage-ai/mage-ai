import React, { useEffect, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import {
  BeforeStyle,
  ContainerStyle,
  ContentStyle,
  MainStyle,
  OptionStyle,
  ToggleValueStyle,
} from './index.style';
import { ChevronRight } from '@oracle/icons';
import { goToWithFilters } from '@utils/routing';
import { capitalize, removeUnderscore } from '@utils/string';

type ToggleMenuProps = {
  children: any;
  compact?: boolean;
  onClickCallback: () => void;
  onClickOutside: () => void;
  onSecondaryClick: () => void;
  open: boolean;
  options: {
    [keyof: string]: {
      [keyof: string]: boolean;
    };
  };
  parentRef: React.RefObject<any>;
  query: { [keyof: string]: string[] };
  setOpen: (open: boolean) => void;
  toggleValueMapping?: {
    [keyof: string]: string;
  };
};

function ToggleMenu({
  children,
  compact,
  onClickCallback,
  onClickOutside,
  onSecondaryClick,
  open,
  options = {},
  parentRef,
  query,
  setOpen,
  toggleValueMapping,
}: ToggleMenuProps) {
  const [highlightedOptionKey, setHighlightedOptionKey] = useState<string>(null);
  const [optionsState, setOptionsState] = useState(options);

  useEffect(() => {
    setOptionsState(options);
  }, [options]);

  const {
    top = 0,
  } = parentRef?.current?.getBoundingClientRect?.() || {};
  const optionKeys = Object.keys(options);

  return (
    <ClickOutside
      onClickOutside={onClickOutside}
      open
    >
      <div ref={parentRef}>
        {children}
      </div>
      <ContainerStyle
        compact={compact}
        display={open}
        top={top - 5}
      >
        <MainStyle compact={compact}>
          <Flex flex="1">
            <BeforeStyle>
              {optionKeys.map(optionKey => (
                <OptionStyle
                  highlighted={highlightedOptionKey === optionKey}
                  key={optionKey}
                  onMouseEnter={() => setHighlightedOptionKey(optionKey)}
                >
                  <Text>
                    {capitalize(optionKey)}
                  </Text>
                  <ChevronRight />
                </OptionStyle>
              ))}
            </BeforeStyle>
          </Flex>
          <Flex flex="2">
            <ContentStyle>
              {highlightedOptionKey && (
                Object.entries((optionsState || options)?.[highlightedOptionKey] || {}).map(([value, enabled]) => (
                  <ToggleValueStyle key={value}>
                    <Text>
                      {toggleValueMapping?.[value] || removeUnderscore(capitalize(value))}
                    </Text>
                    <ToggleSwitch
                      checked={enabled}
                      onCheck={() => setOptionsState(prevState => ({
                        ...prevState,
                        [highlightedOptionKey]: {
                          ...prevState?.[highlightedOptionKey],
                          [value]: !enabled,
                        },
                      }))}
                    />
                  </ToggleValueStyle>
                ))
              )}
            </ContentStyle>
          </Flex>
        </MainStyle>
        <Spacing m={1}>
          <FlexContainer>
            <Button
              onClick={() => {
                const updatedQuery = Object.entries(optionsState)
                  .reduce((query, [optionKey, enabledValueMapping]) => {
                    const filteredValues = [];
                    Object.entries(enabledValueMapping)
                      .forEach(([value, enabled]) => enabled && filteredValues.push(value));
                    query[optionKey] = filteredValues;

                    return query;
                  }, {});

                onClickCallback?.();
                goToWithFilters(
                  query,
                  updatedQuery,
                  {
                    addingMultipleValues: true,
                    pushHistory: true,
                  });
              }}
              secondary
            >
              Apply
            </Button>
            <Spacing mr={1} />
            <Button
              noBackground
              onClick={() => {
                setOpen(false);
                onSecondaryClick?.();
              }}
            >
              Defaults
            </Button>
          </FlexContainer>
        </Spacing>
      </ContainerStyle>
    </ClickOutside>
  );
}

export default ToggleMenu;
