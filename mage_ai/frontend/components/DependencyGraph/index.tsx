import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';
import { ThemeContext } from 'styled-components';
import {
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useMutation } from 'react-query';

import BlockType, {
  BlockTypeEnum,
  SetEditingBlockType,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import FlexContainer from '@oracle/components/FlexContainer';
import GraphNode from './GraphNode';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';

import { GraphContainerStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { find, indexBy, removeAtIndex } from '@utils/array';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getFinalLevelIndex } from './utils';
import { onSuccess } from '@api/utils/response';

export type DependencyGraphProps = {
  blockRefs?: {
    [current: string]: any;
  };
  editingBlock: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  };
  fetchPipeline: () => void;
  pipeline: PipelineType;
  runningBlocks: BlockType[];
  selectedBlock: BlockType;
  setSelectedBlock: (block: BlockType) => void;
} & SetEditingBlockType;

function DependencyGraph({
  blockRefs,
  editingBlock,
  fetchPipeline,
  pipeline,
  runningBlocks,
  selectedBlock,
  setEditingBlock,
  setSelectedBlock,
}: DependencyGraphProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const updateXarrow = useXarrow();
  const {
    block: blockEditing,
    values: upstreamBlocksEditing = [],
  } = editingBlock?.upstreamBlocks || {};
  const blocks = useMemo(
    () => pipeline?.blocks?.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type) || [],
    [
      pipeline?.blocks,
    ],
  );
  const blockUUIDMapping = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const upstreamBlocksEditingMapping = useMemo(
    () => indexBy(upstreamBlocksEditing, ({ uuid }) => uuid),
    [
      upstreamBlocksEditing,
    ],
  );
  const runningBlocksMapping =
    useMemo(() => indexBy(runningBlocks, ({ uuid }) => uuid), [runningBlocks]);

  const arrows: {
    color: string;
    end: string;
    start: string;
  }[] = blocks.reduce((acc, block) => {
    const {
      downstream_blocks: downstreamBlocks,
      type,
      uuid: startBlockUUID,
    } = block;
    const isSelected = selectedBlock?.uuid === startBlockUUID;
    const arrowsToDownstreamBlocks = downstreamBlocks.map(endBlockUUID => ({
      color: getColorsForBlockType(
        type,
        { isSelected, theme: themeContext },
      ).accent,
      end: endBlockUUID,
      start: startBlockUUID,
    }));

    return [...acc, ...arrowsToDownstreamBlocks];
  }, []);

  const nodeLevels: BlockType[][] = blocks.reduce((acc, block) => {
    const {
      upstream_blocks: upstreamBlocks,
    } = block;
    const finalLevelIndex = getFinalLevelIndex(upstreamBlocks, blockUUIDMapping);
    acc[finalLevelIndex] = [...(acc[finalLevelIndex] || []), block];

    return acc;
  }, []);

  const [updateBlock, { isLoading: isLoadingUpdateBlock }] = useMutation(
    api.blocks.pipelines.useUpdate(pipeline?.uuid, blockEditing?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setEditingBlock({
              upstreamBlocks: null,
            });
            // @ts-ignore
            fetchPipeline().then(() => {
              updateXarrow();
            });
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const onClick = useCallback((block: BlockType) => {
    const {
      type,
      uuid,
    } = block;
    setSelectedBlock(block);
    if (blockRefs?.current) {
      const blockRef = blockRefs.current[`${type}s/${uuid}.py`];
      blockRef?.current?.scrollIntoView();
    }
  }, [
    blockRefs,
    setSelectedBlock,
  ]);
  const onClickWhenEditingUpstreamBlocks = useCallback((block: BlockType) => {
    // @ts-ignore
    setEditingBlock((prev) => {
      const values = prev.upstreamBlocks.values || [];
      const idx = values.findIndex(({ uuid }) => block.uuid === uuid);

      return {
        ...prev,
        upstreamBlocks: {
          ...prev.upstreamBlocks,
          values: idx >= 0 ? removeAtIndex(values, idx) : values.concat(block),
        },
      };
    });
  }, [
    setEditingBlock,
  ]);

  return (
    <>
      {blockEditing && (
        <Spacing pt={PADDING_UNITS} px={1}>
          <Spacing mb={1} px={1}>
            <Text bold>
              Currently editing block
            </Text>
          </Spacing>

          <FlexContainer>
            <GraphNode
              block={blockEditing}
            />
          </FlexContainer>

          <Spacing mt={PADDING_UNITS} px={1}>
            <Text>
              <Text bold inline>
                Select parent block(s) for <Text bold inline monospace>
                  {blockEditing.uuid}
                </Text>
              </Text>: {upstreamBlocksEditing.map(({ uuid }) => uuid).join(', ')}
            </Text>
          </Spacing>
        </Spacing>
      )}

      <GraphContainerStyle onScroll={updateXarrow}>
        <Xwrapper>
          <FlexContainer alignItems="center" flexDirection="column" fullWidth>
            {nodeLevels.map((nodeLevel, index) => (
              <Spacing key={index} mb={(index === nodeLevels.length - 1) ? 0 : 6}>
                <FlexContainer alignItems="center">
                  {nodeLevel.map((block: BlockType) => (
                    <GraphNode
                      block={block}
                      disabled={blockEditing?.uuid === block.uuid}
                      isInProgress={runningBlocksMapping[block.uuid]
                        && runningBlocks[0]?.uuid === block.uuid
                      }
                      isQueued={runningBlocksMapping[block.uuid]
                        && runningBlocks[0]?.uuid !== block.uuid
                      }
                      isSuccessful={StatusTypeEnum.EXECUTED === block.status}
                      key={block.uuid}
                      onClick={blockEditing
                        ? onClickWhenEditingUpstreamBlocks
                        : onClick
                      }
                      selected={blockEditing
                        ? find(upstreamBlocksEditing, ({ uuid }) => uuid === block.uuid)
                        : selectedBlock?.uuid === block.uuid
                      }
                    />
                  ))}
                </FlexContainer>
              </Spacing>
            ))}
          </FlexContainer>
          {arrows.map(({ color, end, start }) => (
            <Xarrow
              animateDrawing={0.2}
              color={color}
              curveness={0.8}
              dashness={false}
              end={end}
              headSize={5}
              key={`${start}_${end}`}
              start={start}
              strokeWidth={1.5}
            />
          ))}
        </Xwrapper>
      </GraphContainerStyle>

      {blockEditing && (
        <Spacing my={3} px={PADDING_UNITS}>
          <FlexContainer
            alignItems="center"
          >
            <KeyboardShortcutButton
              compact
              inline
              loading={isLoadingUpdateBlock}
              // @ts-ignore
              onClick={() => updateBlock({
                block: {
                  ...blockEditing,
                  upstream_blocks: upstreamBlocksEditing.map(({ uuid }) => uuid),
                },
              })}
              uuid="DependencyGraph/save_parents"
            >
              Save dependencies
            </KeyboardShortcutButton>

            <Spacing ml={1} />

            <KeyboardShortcutButton
              compact
              inline
              noBackground
              onClick={() => setEditingBlock({
                upstreamBlocks: null,
              })}
              uuid="DependencyGraph/cancel_save_parents"
            >
              Cancel
            </KeyboardShortcutButton>
          </FlexContainer>
        </Spacing>
      )}
    </>
  );
}

export default DependencyGraph;
