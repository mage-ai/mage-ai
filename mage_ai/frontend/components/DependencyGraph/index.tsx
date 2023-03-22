import dynamic from 'next/dynamic';
import { ThemeContext } from 'styled-components';
import { parse } from 'yaml';
import {
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import BlockType, {
  BlockLanguageEnum,
  BlockTypeEnum,
  SetEditingBlockType,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import FlexContainer from '@oracle/components/FlexContainer';
import GraphNode from './GraphNode';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';

import {
  EdgeType,
  NodeType,
  PortType,
  SideEnum,
  SHARED_PORT_PROPS,
  ZOOMABLE_CANVAS_SIZE,
} from './constants';
import { GraphContainerStyle } from './index.style';
import { RunStatus } from '@interfaces/BlockRunType';
import { ThemeType } from '@oracle/styles/themes/constants';
import {
  PADDING_UNITS,
  UNIT,
  WIDTH_OF_SINGLE_CHARACTER_SMALL,
} from '@oracle/styles/units/spacing';
import { find, indexBy, removeAtIndex } from '@utils/array';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getModelName } from '@utils/models/dbt';
import { isActivePort } from './utils';
import { onSuccess } from '@api/utils/response';
import { useDynamicUpstreamBlocks } from '@utils/models/block';

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
  blockStatus?: {
    [uuid: string]: {
      status: RunStatus,
      runtime?: number,
    };
  };
  disabled?: boolean;
  editingBlock?: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  };
  enablePorts?: boolean;
  fetchPipeline?: () => void;
  height: number;
  heightOffset?: number;
  noStatus?: boolean;
  pannable?: boolean;
  pipeline: PipelineType;
  runningBlocks?: BlockType[];
  selectedBlock?: BlockType;
  setErrors?: (opts: {
    errors: any;
    response: any;
  }) => void;
  setSelectedBlock?: (block: BlockType) => void;
  showDynamicBlocks?: boolean;
  zoomable?: boolean;
} & SetEditingBlockType;

function DependencyGraph({
  blockRefs,
  blockStatus,
  disabled: disabledProp,
  editingBlock,
  enablePorts = false,
  fetchPipeline,
  height,
  heightOffset = UNIT * 10,
  noStatus,
  pannable = true,
  pipeline,
  runningBlocks = [],
  selectedBlock,
  setEditingBlock,
  setErrors,
  setSelectedBlock,
  showDynamicBlocks = false,
  zoomable = true,
}: DependencyGraphProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const [edgeSelections, setEdgeSelections] = useState<string[]>([]);
  const [showPortsState, setShowPorts] = useState<boolean>(false);
  const [activePort, setActivePort] = useState<{ id: string, side: SideEnum }>(null);
  const showPorts = enablePorts && showPortsState;
  const {
    block: blockEditing,
    values: upstreamBlocksEditing = [],
  } = editingBlock?.upstreamBlocks || {};
  const upstreamBlocksEditingCount = useMemo(() => upstreamBlocksEditing.length, [
    upstreamBlocksEditing,
  ]);

  const blocksInit = useMemo(() => pipeline?.blocks?.filter(({
    type,
  }) => BlockTypeEnum.SCRATCHPAD !== type) || [], [
    pipeline?.blocks,
  ]);
  const dynamicUpstreamBlocksData =
    indexBy(useDynamicUpstreamBlocks(blocksInit, blocksInit), ({ block }) => block.uuid);

  const blocks = useMemo(() => {
    const arr = blocksInit;

    if (showDynamicBlocks) {
      // TODO (tommy dang): recreate all the blocks to include all the dynamically created blocks
    }

    return arr;
  }, [
    blocksInit,
    // dynamicUpstreamBlocksData,
    showDynamicBlocks,
  ]);

  const blockUUIDMapping = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const runningBlocksMapping =
    useMemo(() => indexBy(runningBlocks, ({ uuid }) => uuid), [runningBlocks]);

  const [updateBlock, { isLoading: isLoadingUpdateBlock }] = useMutation(
    api.blocks.pipelines.useUpdate(
      pipeline?.uuid,
      encodeURIComponent(blockEditing?.uuid),
    ),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setEditingBlock({
              upstreamBlocks: null,
            });
            fetchPipeline?.();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [updateBlockByDragAndDrop] = useMutation(
    // @ts-ignore
    ({ fromBlock, toBlock, removeDependency }:
      {
        fromBlock: BlockType;
        toBlock: BlockType;
        removeDependency?: boolean;
      },
    ) => api.blocks.pipelines.useUpdate(
      pipeline?.uuid,
      encodeURIComponent(toBlock.uuid),
    )({
      block: {
        ...toBlock,
        upstream_blocks: removeDependency
          ? toBlock.upstream_blocks.filter(uuid => uuid !== fromBlock.uuid)
          : toBlock.upstream_blocks.concat(fromBlock.uuid),
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline?.();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const onClick = useCallback((block: BlockType) => {
    const {
      type,
      uuid,
    } = block;
    setSelectedBlock?.(block);
    setEdgeSelections([]);
    if (blockRefs?.current) {
      const blockRef = blockRefs.current[`${type}s/${uuid}.py`];
      blockRef?.current?.scrollIntoView();
    }
  }, [
    blockRefs,
    setSelectedBlock,
  ]);
  const onClickWhenEditingUpstreamBlocks = useCallback((block: BlockType) => {
    setEdgeSelections([]);
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

  const displayTextForBlock = useCallback((block: BlockType): string => {
    let displayText;

    if (PipelineTypeEnum.INTEGRATION === pipeline?.type && BlockTypeEnum.TRANSFORMER !== block.type) {
      let contentParsed: {
        destination?: string;
        source?: string;
      } = {};
      if (BlockLanguageEnum.YAML === block.language) {
        contentParsed = parse(block.content);
      }

      if (BlockTypeEnum.DATA_LOADER === block.type) {
        displayText = `${block.uuid}: ${contentParsed?.source}`;
      } else if (BlockTypeEnum.DATA_EXPORTER === block.type) {
        displayText = `${block.uuid}: ${contentParsed?.destination}`;
      }
    } else if (BlockTypeEnum.DBT === block.type && BlockLanguageEnum.SQL === block.language) {
      displayText = getModelName(block, { fullPath: true });
    }

    const {
      dynamic,
      dynamicUpstreamBlock,
      reduceOutput,
      reduceOutputUpstreamBlock,
    } = dynamicUpstreamBlocksData?.[block.uuid] || {};

    if (!displayText) {
      displayText = block.uuid;

      if (dynamic) {
        displayText = `[dynamic] ${displayText}`;
      } else if (dynamicUpstreamBlock && !reduceOutputUpstreamBlock) {
        displayText = `[dynamic child] ${displayText}`;
      }
    }

    return displayText;
  }, [
    dynamicUpstreamBlocksData,
    pipeline,
  ]);

  const {
    edges,
    nodes,
  } = useMemo(() => {
    const nodesInner: NodeType[] = [];
    const edgesInner: EdgeType[] = [];

    blocks.forEach((block: BlockType) => {
      const displayText = displayTextForBlock(block);

      const {
        type: blockType,
        upstream_blocks: upstreamBlocks = [],
        uuid,
      } = block;
      const downstreamBlocks = downstreamBlocksMapping[uuid];
      const ports: PortType[] = [];

      if (downstreamBlocks) {
        ports.push(...downstreamBlocks.map((block2: BlockType) => ({
          ...SHARED_PORT_PROPS,
          id: `${uuid}-${block2.uuid}-from`,
          side: SideEnum.SOUTH,
        })));
      } else if (blockType !== BlockTypeEnum.DATA_EXPORTER) {
        ports.push({
          ...SHARED_PORT_PROPS,
          id: `${uuid}-from`,
          side: SideEnum.SOUTH,
        });
      }

      if (upstreamBlocks.length === 0 && blockType !== BlockTypeEnum.DATA_LOADER) {
        ports.push({
          ...SHARED_PORT_PROPS,
          id: `${uuid}-to`,
          side: SideEnum.NORTH,
        });
      }

      upstreamBlocks?.forEach((uuidUp: string) => {
        ports.push({
          ...SHARED_PORT_PROPS,
          id: `${uuidUp}-${uuid}-to`,
          side: SideEnum.NORTH,
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
        data: {
          block,
        },
        height: 37,
        id: uuid,
        ports,
        width: (displayText.length * WIDTH_OF_SINGLE_CHARACTER_SMALL)
          + (disabledProp ? 0 : UNIT * 5)
          + (blockEditing?.uuid === block.uuid ? (19 * WIDTH_OF_SINGLE_CHARACTER_SMALL) : 0)
          + (blockStatus?.[block.uuid]?.runtime ? 50 : 0),
      });

    });

    return {
      edges: edgesInner,
      nodes: nodesInner,
    };
  }, [
    blockEditing?.uuid,
    blockStatus,
    blocks,
    disabledProp,
    displayTextForBlock,
    downstreamBlocksMapping,
  ]);

  const getBlockStatus = useCallback((block: BlockType) => {
    if (noStatus) {
      return {};
    } else if (blockStatus) {
      const {
        status,
        runtime,
      } = blockStatus[block.uuid] || {};
      return {
        hasFailed: RunStatus.FAILED === status,
        isCancelled: RunStatus.CANCELLED === status,
        isInProgress: RunStatus.RUNNING === status,
        isQueued: RunStatus.INITIAL === status,
        isSuccessful: RunStatus.COMPLETED === status,
        runtime,
      };
    } else {
      return {
        hasFailed: StatusTypeEnum.FAILED === block.status,
        isInProgress: runningBlocksMapping[block.uuid],
        isQueued: runningBlocksMapping[block.uuid]
          && runningBlocks[0]?.uuid !== block.uuid,
        isSuccessful: StatusTypeEnum.EXECUTED === block.status,
      };
    }
  }, [
    blockStatus,
    noStatus,
    runningBlocks,
    runningBlocksMapping,
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
                    blockColor: blockEditing.color,
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
                      blockColor: blockUUIDMapping[uuid]?.type,
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
              onClick={() => {
                setEdgeSelections([]);
                setEditingBlock({
                  upstreamBlocks: null,
                });
              }}
              uuid="DependencyGraph/cancel_save_parents"
            >
              Cancel
            </KeyboardShortcutButton>
          </FlexContainer>
        </Spacing>
      )}

      <GraphContainerStyle height={height - (heightOffset)}>
        <Canvas
          arrow={null}
          disabled={disabledProp}
          edge={(edge) => {
            const block = blockUUIDMapping[edge.source];

            return (
              <Edge
                {...edge}
                onClick={(event, edge) => {
                  setActivePort(null);
                  setEdgeSelections([edge.id]);
                }}
                onRemove={(event, edge) => {
                  const fromBlock = blockUUIDMapping[edge.from];
                  const toBlock = blockUUIDMapping[edge.to];

                  updateBlockByDragAndDrop({
                    fromBlock,
                    removeDependency: true,
                    toBlock,
                  });
                  setEdgeSelections([]);
                }}
                removable={enablePorts && !editingBlock?.upstreamBlocks}
                style={{
                  stroke: getColorsForBlockType(
                    block?.type,
                    { blockColor: block?.color, theme: themeContext },
                  )?.accent,
                }}
              />
            );
          }}
          edges={edges}
          fit
          maxHeight={ZOOMABLE_CANVAS_SIZE}
          maxWidth={ZOOMABLE_CANVAS_SIZE}
          node={(node) => (
            <Node
              {...node}
                dragType="port"
                linkable
                onClick={(event, {
                  data: {
                    block,
                  },
                }) => {
                  setActivePort(null);
                  const disabled = blockEditing?.uuid === block.uuid;
                  if (!disabled) {
                    if (blockEditing) {
                      onClickWhenEditingUpstreamBlocks(block);
                    } else {
                      onClick(block);
                    }
                  }
                }}
                onEnter={() => {
                  if (!editingBlock?.upstreamBlocks) {
                    setShowPorts(true);
                  }
                }}
                onLeave={() => setShowPorts(false)}
                port={(showPorts && (
                  activePort === null || isActivePort(activePort, node)))
                  ?
                    <Port
                      onDrag={() => setShowPorts(true)}
                      onDragEnd={() => {
                        setShowPorts(false);
                        setActivePort(null);
                      }}
                      onDragStart={(e, initial, port) => {
                        // @ts-ignore
                        setActivePort({ id: port?.id, side: port?.side });
                      }}
                      onEnter={() => setShowPorts(true)}
                      rx={10}
                      ry={10}
                      style={{
                        fill: getColorsForBlockType(
                          node?.properties?.data?.block?.type,
                          {
                            blockColor: node?.properties?.data?.block?.color,
                            theme: themeContext,
                          },
                        ).accent,
                        stroke: 'white',
                        strokeWidth: '1px',
                      }}
                    />
                  : null
                }
                style={{
                  fill: 'transparent',
                  stroke: 'transparent',
                  strokeWidth: 0,
                }}
              >
              {(event) => {
                const {
                  node: {
                    data: {
                      block,
                    },
                  },
                } = event;

                const blockStatus = getBlockStatus(block);

                return (
                  <foreignObject
                    height={event.height}
                    style={{
                      // https://reaflow.dev/?path=/story/docs-advanced-custom-nodes--page#the-foreignobject-will-steal-events-onclick-onenter-onleave-etc-that-are-bound-to-the-rect-node
                      pointerEvents: 'none',
                    }}
                    width={event.width}
                    x={0}
                    y={0}
                  >
                    <GraphNode
                      block={block}
                      disabled={blockEditing?.uuid === block.uuid}
                      hideStatus={disabledProp}
                      key={block.uuid}
                      selected={blockEditing
                        ? !!find(upstreamBlocksEditing, ({ uuid }) => uuid === block.uuid)
                        : selectedBlock?.uuid === block.uuid
                      }
                      {...blockStatus}
                    >
                      {displayTextForBlock(block)}{blockEditing?.uuid === block.uuid && ' (editing)'}
                    </GraphNode>
                  </foreignObject>
                );
              }}
            </Node>
          )}
          nodes={nodes}
          onNodeLink={(_event, from, to, port) => {
            const fromBlock: BlockType = blockUUIDMapping[from.id];
            const toBlock: BlockType = blockUUIDMapping[to.id];

            const isConnectingIntegrationSourceAndDestination = (
              pipeline?.type === PipelineTypeEnum.INTEGRATION
                && (fromBlock?.type === BlockTypeEnum.DATA_EXPORTER
                  || (fromBlock?.type === BlockTypeEnum.DATA_LOADER
                    && toBlock?.type === BlockTypeEnum.DATA_EXPORTER)
                  )
            );
            if (fromBlock?.upstream_blocks?.includes(toBlock.uuid)
             || from.id === to.id
             || isConnectingIntegrationSourceAndDestination
            ) {
              return;
            }

            // @ts-ignore
            updateBlockByDragAndDrop({ fromBlock, toBlock });
          }}
          onNodeLinkCheck={(event, from, to) => !edges.some(e => e.from === from.id && e.to === to.id)}
          pannable={pannable}
          selections={edgeSelections}
          zoomable={zoomable}
        />
      </GraphContainerStyle>
    </>
  );
}

export default DependencyGraph;
