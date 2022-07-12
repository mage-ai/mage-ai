import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';
import dynamic from 'next/dynamic';
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
import {
  PADDING_UNITS,
  UNIT,
  WIDTH_OF_SINGLE_CHARACTER_SMALL,
} from '@oracle/styles/units/spacing';
import { find, indexBy, removeAtIndex } from '@utils/array';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getFinalLevelIndex } from './utils';
import { onSuccess } from '@api/utils/response';

const Canvas = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Canvas;
  },
  {
    ssr: false,
  },
);

const Node = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Node;
  },
  {
    ssr: false,
  },
);

const Edge = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Edge;
  },
  {
    ssr: false,
  },
);


const MarkerArrow = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.MarkerArrow;
  },
  {
    ssr: false,
  },
);

const Port = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Port;
  },
  {
    ssr: false,
  },
);

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
  height: number;
  pipeline: PipelineType;
  runningBlocks: BlockType[];
  selectedBlock: BlockType;
  setSelectedBlock: (block: BlockType) => void;
} & SetEditingBlockType;

function DependencyGraph({
  blockRefs,
  editingBlock,
  fetchPipeline,
  height,
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
  const upstreamBlocksEditingCount = useMemo(() => upstreamBlocksEditing.length, [
    upstreamBlocksEditing,
  ]);
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

  const downstreamBlocksMapping = useMemo(() => {
    const mapping = {};

    blocks.forEach((block: BlockType) => {
      const {
        upstream_blocks: upstreamBlocks,
      } = block;
      upstreamBlocks.forEach((uuidUp: string) => {
        if (!mapping[uuidUp]) {
          mapping[uuidUp] = [];
        }
        mapping[uuidUp].push(block);
      });
    });

    return mapping;
  }, [blocks]);

  const {
    edges,
    nodes,
  } = useMemo(() => {
    const nodesInner = [];
    const edgesInner = [];

    blocks.forEach((block: BlockType) => {
      const {
        upstream_blocks: upstreamBlocks = [],
        uuid,
      } = block;
      const downstreamBlocks = downstreamBlocksMapping[uuid];
      const ports = [];

      if (downstreamBlocks) {
        ports.push(...downstreamBlocks.map((block2: BlockType) => ({
          height: 10,
          id: `${uuid}-${block2.uuid}-from`,
          side: 'SOUTH',
          width: 10,
        })))
      }

      upstreamBlocks?.forEach((uuidUp: string) => {
        ports.push({
          height: 10,
          id: `${uuidUp}-${uuid}-to`,
          side: 'NORTH',
          width: 10,
        });

        edgesInner.push({
          from: uuidUp,
          fromPort: `${uuidUp}-${uuid}-from`,
          id: `${uuidUp}-${uuid}`,
          to: uuid,
          toPort: `${uuidUp}-${uuid}-to`,
        });
      });

      nodesInner.push({
        id: uuid,
        data: {
          block,
        },
        height: 37,
        ports,
        width: (block.uuid.length * WIDTH_OF_SINGLE_CHARACTER_SMALL)
          + (UNIT * 5)
          + (blockEditing?.uuid === block.uuid ? (19 * WIDTH_OF_SINGLE_CHARACTER_SMALL) : 0),
      });

    });

    return {
      nodes: nodesInner,
      edges: edgesInner,
    }
  }, [
    blockEditing,
    blocks,
  ]);

  return (
    <>
      {blockEditing && (
        <Spacing my={3} px={PADDING_UNITS}>
          <Spacing mb={PADDING_UNITS}>
            <Text>
              Select parent block(s) for <Text
                color={getColorsForBlockType(
                  blockEditing.type,
                  {
                    theme: themeContext,
                  },
                ).accent}
                inline
                monospace
              >
                {blockEditing.uuid}
              </Text>:
            </Text>

            <Spacing mt={1}>
              {upstreamBlocksEditing.map(({ uuid }: BlockType, idx: number) => (
                <Text
                  color={getColorsForBlockType(
                    blockUUIDMapping[uuid]?.type,
                    {
                      theme: themeContext,
                    },
                  ).accent}
                  inline
                  key={uuid}
                  monospace
                >
                  {uuid}{upstreamBlocksEditingCount >= 2 && idx <= upstreamBlocksEditingCount - 2
                    ? <Text inline>
                      ,&nbsp;
                    </Text>
                    : null
                  }
                </Text>
              ))}
            </Spacing>
          </Spacing>

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

      <div style={{ height: height - (UNIT * 10) }}>
        <Canvas
          // arrow={<MarkerArrow style={{ fill: '#b1b1b7' }} />}
          arrow={null}
          disabled={false}
          edge={(edge) => {
            const block = blockUUIDMapping[edge.source];

            return (
              <Edge
                {...edge}
                style={{
                  stroke: getColorsForBlockType(block?.type, { theme: themeContext })?.accent,
                }}
              />
            );
          }}
          edges={edges}
          fit
          node={(node) => {
            return (
              <Node
                {...node}
                onClick={(event, {
                  data: {
                    block,
                  },
                }) => {
                  const disabled = blockEditing?.uuid === block.uuid;
                  if (!disabled) {
                    if (blockEditing) {
                      onClickWhenEditingUpstreamBlocks(block);
                    } else {
                      onClick(block);
                    }
                  }
                }}
                // port={(
                //   <Port
                //     rx={10}
                //     ry={10}
                //     style={{
                //       fill: themeContext.accent.alert,
                //       stroke: themeContext.accent.alert,
                //     }}
                //   />
                // )}
                port={null}
                style={{
                  stroke: 'transparent',
                  fill: 'transparent',
                  strokeWidth: 0,
                }}
                // label={<div style={{ display: 'none' }} />}
              >
                {(event) => {
                  const {
                    node: {
                      data: {
                        block,
                      },
                    },
                  } = event;

                  return (
                    <foreignObject
                      height={event.height}
                      width={event.width}
                      x={0}
                      y={0}
                      style={{
                        // https://reaflow.dev/?path=/story/docs-advanced-custom-nodes--page#the-foreignobject-will-steal-events-onclick-onenter-onleave-etc-that-are-bound-to-the-rect-node
                        pointerEvents: 'none',
                      }}
                    >
                      <GraphNode
                        block={block}
                        disabled={blockEditing?.uuid === block.uuid}
                        hasFailed={StatusTypeEnum.FAILED === block.status}
                        isInProgress={runningBlocksMapping[block.uuid]
                          && runningBlocks[0]?.uuid === block.uuid
                        }
                        isQueued={runningBlocksMapping[block.uuid]
                          && runningBlocks[0]?.uuid !== block.uuid
                        }
                        isSuccessful={StatusTypeEnum.EXECUTED === block.status}
                        key={block.uuid}
                        selected={blockEditing
                          ? find(upstreamBlocksEditing, ({ uuid }) => uuid === block.uuid)
                          : selectedBlock?.uuid === block.uuid
                        }
                      >
                        {block.uuid}{blockEditing?.uuid === block.uuid && ' (currently editing)'}
                      </GraphNode>
                    </foreignObject>
                  );
                }}
              </Node>
            );
          }}
          nodes={nodes}
          zoomable
        />
      </div>
    </>
  );
}

export default DependencyGraph;
