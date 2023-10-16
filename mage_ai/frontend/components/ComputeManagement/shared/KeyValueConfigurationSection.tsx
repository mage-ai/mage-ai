import { useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Divider from '@oracle/elements/Divider';
import { Add, Edit, Trash } from '@oracle/icons';
import { ICON_SIZE } from '@components/shared/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';

type KeyValueConfigurationSectionProps = {
  addButtonText?: string;
  addTextInputPlaceholder?: string;
  alreadyExistsMessage?: string;
  configurationValuePlaceholder?: string;
  configurations?: {
    [key: string]: boolean | number | string;
  };
  createButtonText?: string;
  description?: any | string;
  emptyState?: string;
  setConfigurations?: (configurations: {
    [key: string]: boolean | number | string;
  }) => void;
  title?: string;
};

function KeyValueConfigurationSection({
  addButtonText,
  addTextInputPlaceholder,
  alreadyExistsMessage,
  configurationValuePlaceholder,
  configurations,
  createButtonText,
  description,
  emptyState,
  setConfigurations,
  title,
}: KeyValueConfigurationSectionProps) {
  const refNewConfigurationUUID = useRef(null);
  const [isAddingNewConfigurations, setIsAddingNewConfigurations] = useState(false);
  const [newConfiguration, setNewConfiguration] = useState<string>(null);

  const hasConfigurations =
    useMemo(() => Object.keys(configurations || {})?.length >= 1, [configurations]);
  const configurationExists =
    useMemo(() => newConfiguration in (configurations || {}), [
      configurations,
      newConfiguration,
    ]);

  const addButton = useMemo(() => (
    <FlexContainer alignItems="center">
      {!isAddingNewConfigurations && (
        <Button
          beforeIcon={<Add />}
          compact
          onClick={(e) => {
            pauseEvent(e);
            setIsAddingNewConfigurations(true);
            setTimeout(() => refNewConfigurationUUID?.current?.focus(), 1);
          }}
          secondary={!hasConfigurations}
          small
        >
          {addButtonText || 'Add configuration'}
        </Button>
      )}

      {isAddingNewConfigurations && (
        <>
          {configurationExists && (
            <>
              <Text danger small>
                {alreadyExistsMessage || 'Already exists'}
              </Text>

              <Spacing mr={1} />
            </>
          )}

          <TextInput
            autoComplete="off"
            compact
            meta={{
              touched: !!configurationExists,
              error: '',
            }}
            monospace
            onClick={e => pauseEvent(e)}
            paddingVertical={(UNIT / 2) - 2}
            placeholder={addTextInputPlaceholder}
            onChange={(e) => {
              pauseEvent(e);
              setNewConfiguration(e.target.value);
            }}
            ref={refNewConfigurationUUID}
            small
            value={newConfiguration || ''}
          />

          <Spacing mr={1} />

          <Button
            disabled={configurationExists}
            compact
            onClick={(e) => {
              pauseEvent(e);

              if (!configurationExists) {
                setConfigurations({
                  ...configurations,
                  [newConfiguration]: '',
                });

                setIsAddingNewConfigurations(false);
                setNewConfiguration(null);
              }
            }}
            primary
            small
          >
            {createButtonText || 'Create configuration'}
          </Button>

          <Spacing mr={1} />

          <Button
            compact
            onClick={(e) => {
              pauseEvent(e);

              setIsAddingNewConfigurations(false);
              setNewConfiguration(null);
            }}
            secondary
            small
          >
            Cancel
          </Button>
        </>
      )}
    </FlexContainer>
  ), [
    addButtonText,
    configurationExists,
    configurations,
    hasConfigurations,
    isAddingNewConfigurations,
    newConfiguration,
    refNewConfigurationUUID,
    setIsAddingNewConfigurations,
    setNewConfiguration,
  ]);

  const configurationsMemo = useMemo(() => Object.entries(configurations || {}).map(([
    key,
    value,
  ]) => (
    <div key={key}>
      <Divider light />

      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              const updated = { ...configurations };
              delete updated?.[key];
              setConfigurations(updated);
            }}
          >
            <Trash default size={ICON_SIZE} />
          </Button>

          <Spacing mr={PADDING_UNITS} />

          <Text
            default
            large
            monospace
          >
            {key}
          </Text>

          <Spacing mr={PADDING_UNITS} />

          <Flex flex={1}>
            <TextInput
              afterIcon={<Edit />}
              afterIconClick={(_, inputRef) => {
                inputRef?.current?.focus();
              }}
              afterIconSize={ICON_SIZE}
              alignRight
              fullWidth
              large
              monospace
              noBackground
              noBorder
              onChange={e => setConfigurations({
                ...configurations,
                [key]: e.target.value,
              })}
              paddingHorizontal={0}
              paddingVertical={0}
              placeholder={configurationValuePlaceholder}
              value={value || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
    </div>
  )), [
    configurations,
    setConfigurations,
  ]);

  return (
    <Panel noPadding>
      <Spacing p={PADDING_UNITS}>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex flex={1} flexDirection="column">
            <Headline level={4}>
              {title}
            </Headline>

            {description && (
              <Spacing mt={1}>
                {description}
              </Spacing>
            )}
          </Flex>

          <Spacing mr={PADDING_UNITS} />

          {hasConfigurations && (
            <FlexContainer alignItems="center">
              {addButton}
            </FlexContainer>
          )}
        </FlexContainer>
      </Spacing>

      {!hasConfigurations && (
        <>
          <Divider light />

          <Spacing p={PADDING_UNITS}>
            {emptyState && (
              <Spacing mb={PADDING_UNITS}>
                <Text default>
                  {emptyState}
                </Text>
              </Spacing>
            )}

            <FlexContainer alignItems="center">
              {addButton}
            </FlexContainer>
          </Spacing>
        </>
      )}

      {hasConfigurations && configurationsMemo}
    </Panel>
  );
}

export default KeyValueConfigurationSection;
