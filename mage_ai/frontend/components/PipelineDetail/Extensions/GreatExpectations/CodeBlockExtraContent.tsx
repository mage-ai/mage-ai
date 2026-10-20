import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useState } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { Search } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { pauseEvent } from '@utils/events';

type CodeBlockExtraContentProps = {
  block: BlockType;
  blockActionDescription?: string;
  blocks: BlockType[];
  inputPlaceholder?: string;
  loading?: boolean;
  onClickTag?: (block: BlockType) => void;
  onUpdateCallback?: () => void;
  runBlockAndTrack?: (payload: {
    block: BlockType,
    code?: string,
    disableReset?: boolean,
    runDownstream?: boolean,
    runSettings?: {
      run_model?: boolean;
    },
    runUpstream?: boolean,
    runTests?: boolean,
  }) => void;
  supportedUpstreamBlockLanguages?: BlockLanguageEnum[];
  supportedUpstreamBlockTypes: BlockTypeEnum[];
  updateBlock: (payload: {
    block: BlockType;
    upstream_blocks: string[];
  }) => any;
};

function CodeBlockExtraContent({
  block,
  blockActionDescription,
  blocks,
  inputPlaceholder,
  loading,
  onClickTag,
  runBlockAndTrack,
  supportedUpstreamBlockLanguages,
  supportedUpstreamBlockTypes,
  updateBlock,
}: CodeBlockExtraContentProps) {
  const themeContext = useContext(ThemeContext);
  const [blockNameFilter, setBlockNameFilter] = useState<string>('');
  const [optionsVisible, setOptionsVisible] = useState<boolean>(false);
  const [upstreamBlocksByUUID, setUpstreamBlocksByUUID] = useState<{
    [uuid: string]: string;
  }>(null);

  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  useEffect(() => {
    if (!upstreamBlocksByUUID) {
      setUpstreamBlocksByUUID(indexBy(block?.upstream_blocks || [], uuid => uuid));
    }
  }, [
    block,
    upstreamBlocksByUUID,
  ]);

  const blocksFiltered = useMemo(() => blocks?.filter(({
    name,
    type,
    uuid,
  }) => (
    name?.toLowerCase().includes(blockNameFilter?.toLowerCase())
    || uuid?.toLowerCase().includes(blockNameFilter?.toLowerCase())
  ) && supportedUpstreamBlockTypes?.includes(type),
  ) || [], [
    blockNameFilter,
    blocks,
    supportedUpstreamBlockTypes,
  ]);

  const blockOptions = useMemo(() => {
    const arr = [];

    blocksFiltered?.forEach(({
      color: colorInit,
      language,
      type,
      uuid,
    }, idx: number) => {
      const color = getColorsForBlockType(
        type,
        {
          blockColor: colorInit,
          theme: themeContext,
        },
      ).accent;

      if (idx >= 1) {
        arr.push(<Divider key={`divider-${uuid}`} light />);
      }

      const checked: boolean = !!upstreamBlocksByUUID?.[uuid];
      const disabled: boolean = supportedUpstreamBlockLanguages !== null
        && typeof supportedUpstreamBlockLanguages !== 'undefined'
        && !supportedUpstreamBlockLanguages?.includes(language);

      arr.push(
        <Spacing
          key={`option-${uuid}`}
          px={2}
          py={1}
        >
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <Flex alignItems="center">
              <Circle
                color={color}
                size={UNIT * 1.5}
                square
              />

              <Spacing mr={1} />

              <Text monospace muted={disabled} small>
                {uuid}
              </Text>
            </Flex>

            {disabled && (
              <Text inline monospace muted small>
                {language} support coming soon
              </Text>
            )}
            {!disabled && (
              <Checkbox
                checked={!disabled && checked}
                disabled={disabled}
                onClick={() => {
                  setUpstreamBlocksByUUID((prev) => {
                    const d = { ...prev };
                    if (checked) {
                      delete d[uuid];
                    } else {
                      d[uuid] = uuid;
                    }

                    return d;
                  });
                }}
              />
            )}
          </FlexContainer>
        </Spacing>,
      );
    });

    return arr;
  }, [
    blocksFiltered,
    themeContext,
    upstreamBlocksByUUID,
  ]);

  return (
    <>
      <ClickOutside
        onClickOutside={() => setOptionsVisible(false)}
        open
      >
        <TextInput
          beforeIcon={<Search />}
          borderless
          compact
          onChange={e => setBlockNameFilter(e.target.value)}
          onClick={(e) => {
            pauseEvent(e);
            setOptionsVisible(true);
          }}
          onFocus={(e) => {
            pauseEvent(e);
            setOptionsVisible(true);
          }}
          placeholder={inputPlaceholder}
          small
          value={blockNameFilter}
        />

        {optionsVisible && (
          <>
            {blockOptions}

            <Spacing p={1}>
              <FlexContainer justifyContent="flex-end">
                <Button
                  compact
                  loading={loading}
                  onClick={() => updateBlock({
                    block,
                    upstream_blocks: Object.keys(upstreamBlocksByUUID),
                  }).then(() => setOptionsVisible(false))}
                  small
                >
                  Save selected blocks
                </Button>
              </FlexContainer>
            </Spacing>
          </>
        )}
      </ClickOutside>

      {!optionsVisible && block?.upstream_blocks?.length >= 1 && (
        <Spacing pb={1} pr={1}>
          {blockActionDescription && (
            <Spacing mt={1} pl={1}>
              <Text muted small>
                {blockActionDescription}
              </Text>
            </Spacing>
          )}

          <FlexContainer alignItems="center">
            {block?.upstream_blocks?.map((uuid: string) => {
              const b = blocksByUUID?.[uuid];

              if (!b) {
                return <div key={uuid} />;
              }

              const {
                color: colorInit,
                type,
              } = b;
              const color = getColorsForBlockType(
                type,
                {
                  blockColor: colorInit,
                  theme: themeContext,
                },
              ).accentLight;

              return (
                <Spacing key={uuid} ml={1} mt={1}>
                  <Button
                    backgroundColor={color}
                    compact
                    disabled={!runBlockAndTrack}
                    onClick={(e) => {
                      pauseEvent(e);

                      if (onClickTag) {
                        onClickTag(b);
                      } else {
                        runBlockAndTrack?.({
                          block: {
                            ...block,
                            upstream_blocks: [b?.uuid],
                          },
                        });
                      }
                    }}
                    small
                  >
                    <Text monospace small>
                      {uuid}
                    </Text>
                  </Button>
                </Spacing>
              );
            })}
          </FlexContainer>
        </Spacing>
      )}
    </>
  );
}

export default CodeBlockExtraContent;
