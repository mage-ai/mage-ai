import dynamic from 'next/dynamic';
import { CanvasRef } from 'reaflow';
import { ThemeContext } from 'styled-components';
import { parse } from 'yaml';
import {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import BlockNode from './BlockNode';
import BlockType, {
  BLOCK_TYPES_WITH_NO_PARENTS,
  BlockLanguageEnum,
  BlockTypeEnum,
  SetEditingBlockType,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import ClickOutside from '@oracle/components/ClickOutside';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType  from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  EdgeType,
  NodeType,
  PortType,
  STROKE_WIDTH,
  SideEnum,
  ZOOMABLE_CANVAS_SIZE,
} from './constants';
import { GraphContainerStyle, inverseColorsMapping } from './index.style';
import { RunStatus } from '@interfaces/BlockRunType';
import { ThemeType } from '@oracle/styles/themes/constants';
import {
  PADDING_UNITS,
  UNIT,
} from '@oracle/styles/units/spacing';
import {
  buildEdge,
  buildNodesEdgesPorts,
  buildPortIDDownstream,
  buildPortsDownstream,
  buildPortsUpstream,
  getParentNodeID,
  isActivePort,
} from './utils';
import { find, indexBy, removeAtIndex } from '@utils/array';
import { getBlockNodeHeight, getBlockNodeWidth } from './BlockNode/utils';
import { getBlockRunBlockUUID } from '@utils/models/blockRun';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getMessagesWithType,
  hasErrorOrOutput,
} from '@components/CodeBlock/utils';
import { getModelAttributes } from '@utils/models/dbt';
import { onSuccess } from '@api/utils/response';

export const Canvas = dynamic(
  async () => {
    const { Canvas } = await import('reaflow');

    return ({ forwardedRef, ...props }: any) => (
      <Canvas ref={forwardedRef} {...props} />
    );
  },
  {
    ssr: false,
  },
);

export const Node = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Node;
  },
  {
    ssr: false,
  },
);

export const Edge = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Edge;
  },
  {
    ssr: false,
  },
);

export const Port = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Port;
  },
  {
    ssr: false,
  },
);

export const Add = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Add;
  },
  {
    ssr: false,
  },
);

export const Remove = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.Remove;
  },
  {
    ssr: false,
  },
);

export const MarkerArrow = dynamic(
  async () => {
    const reaflow = await import('reaflow');
    return reaflow.MarkerArrow;
  },
  {
    ssr: false,
  },
);

export type DependencyGraphProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  blockRefs?: {
    [current: string]: any;
  };
  blockStatus?: {
    [uuid: string]: {
      status: RunStatus,
      runtime?: number,
    };
  };
  blocksOverride?: BlockType[];
  blocks?: BlockType[];
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
  messages?: {
    [uuid: string]: KernelOutputType[];
  };
  noStatus?: boolean;
  onClickNode?: (opts: {
    block?: BlockType;
  }) => void;
  pannable?: boolean;
  pipeline: PipelineType;
  runningBlocks?: BlockType[];
  selectedBlock?: BlockType;
  setErrors?: (opts: {
    errors: any;
    response: any;
  }) => void;
  setSelectedBlock?: (block: BlockType) => void;
  setZoom?: (zoom: number) => void;
  showDynamicBlocks?: boolean;
  treeRef?: { current?: CanvasRef };
  zoomable?: boolean;
} & SetEditingBlockType;

function DependencyGraph({
  addNewBlockAtIndex,
  blockRefs,
  blockStatus,
  blocksOverride,
  blocks: allBlocksProp,
  disabled: disabledProp,
  editingBlock,
  enablePorts = false,
  fetchPipeline,
  height,
  heightOffset = UNIT * 10,
  messages,
  noStatus,
  onClickNode: onClickNodeProp,
  pannable = true,
  pipeline,
  runningBlocks = [],
  selectedBlock,
  setEditingBlock,
  setErrors,
  setSelectedBlock,
  setZoom,
  showDynamicBlocks = false,
  treeRef,
  zoomable = true,
}: DependencyGraphProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const colorsInverse = useMemo(() => inverseColorsMapping(themeContext), [themeContext]);

  const containerRef = useRef(null);
  const portRefs = useRef({});
  const timeoutActiveRefs = useRef({});
  const timeoutDraggingRefs = useRef({});
  const treeInnerRef = useRef<CanvasRef>(null);
  const canvasRef = treeRef || treeInnerRef;

  const [activeEdge, setActiveEdge] = useState<{
    block: BlockType;
    edge: EdgeType;
    event: any;
  }>(null);
  const [activeNodes, setActiveNodes] = useState({});
  const [activePorts, setActivePorts] = useState({});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [nodeDragging, setNodeDragging] = useState<{
    data: {
      nodeHeight: number;
    };
    event: any;
    node: NodeType;
  }>(null);
  const [nodeHovering, setNodeHovering] = useState<NodeType>(null);
  const [targetNode, setTargetNode] = useState(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (isDragging, nodeDragging) {
        setNodeDragging(prev => ({
          ...prev,
          event,
        }))
      }
    };
    const handleMouseUp = (event) => {
      if (isDragging, nodeDragging) {
        setIsDragging(false);
        setTimeout(() => setNodeDragging(null), 1);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [
    isDragging,
    nodeDragging,
  ]);

  const [edgeSelections, setEdgeSelections] = useState<string[]>([]);
  const [showPortsState, setShowPorts] = useState<boolean>(false);
  const showPorts = enablePorts && showPortsState;
  const {
    block: blockEditing,
    values: upstreamBlocksEditing = [],
  } = editingBlock?.upstreamBlocks || {};
  const upstreamBlocksEditingCount = useMemo(() => upstreamBlocksEditing.length, [
    upstreamBlocksEditing,
  ]);

  const blocksInit = useMemo(() => (blocksOverride || pipeline?.blocks)?.filter(({
    type,
  }) => !BLOCK_TYPES_WITH_NO_PARENTS.includes(type)) || [], [
    blocksOverride,
    pipeline?.blocks,
  ]);
  // const dynamicUpstreamBlocksData =
  //   indexBy(useDynamicUpstreamBlocks(blocksInit, blocksInit), ({ block }) => block.uuid);

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

  const allBlocks = useMemo(() => {
    const arr = [];

    if (blocksOverride) {
      return blocksOverride;
    } else if (allBlocksProp) {
      return allBlocksProp;
    } else if (pipeline) {
      const mapping = {};
      const arr2 = [];

      arr2.push(...pipeline?.blocks);
      arr2.push(...pipeline?.callbacks);
      arr2.push(...pipeline?.conditionals);

      Object.values(pipeline?.extensions).forEach(({ blocks }) => {
        arr2.push(...blocks);
      });

      return arr2.reduce((acc, b) => {
        if (!mapping[b.uuid]) {
          acc.push(b);
        }

        return acc;
      }, []);
    }

    return arr;
  }, [
    allBlocksProp,
    blocksOverride,
    pipeline,
  ]);
  const blockUUIDMapping =
    useMemo(() => indexBy(allBlocks || [], ({ uuid }) => uuid), [allBlocks]);

  const callbackBlocksByBlockUUID = useMemo(() => {
    const mapping = {};

    blocks?.map((block) => {
      mapping[block.uuid] = block?.callback_blocks?.reduce((acc, uuid) => {
        const b = blockUUIDMapping?.[uuid];
        if (b) {
          return acc.concat(b);
        }

        return acc;
      }, []);
    });

    return mapping;
  }, [
    blocks,
    blockUUIDMapping,
  ]);

  const conditionalBlocksByBlockUUID = useMemo(() => {
    const mapping = {};

    blocks?.map((block) => {
      mapping[block.uuid] = block?.conditional_blocks?.reduce((acc, uuid) => {
        const b = blockUUIDMapping?.[uuid];
        if (b) {
          return acc.concat(b);
        }

        return acc;
      }, []);
    });

    return mapping;
  }, [
    blocks,
    blockUUIDMapping,
  ]);

  const extensionBlocksByBlockUUID = useMemo(() => {
    const mapping = {};

    blocks?.map((block) => {
      const arr = [];

      Object.entries(pipeline?.extensions || {})?.forEach(([
        extensionUUID,
        {
          blocks: blocksForExtension,
        },
      ]) => {
        blocksForExtension?.forEach(({
          upstream_blocks: upstreamBlocks,
          uuid: blockUUID,
        }) => {
          if (upstreamBlocks?.includes(block?.uuid)) {
            const b = blockUUIDMapping?.[blockUUID];
            if (b) {
              arr.push({
                ...b,
                extension_uuid: extensionUUID,
              });
            }
          }
        });
      });

      mapping[block.uuid] = arr;
    });

    return mapping;
  }, [
    blocks,
    blockUUIDMapping,
    pipeline,
  ]);
  const runningBlocksMapping =
    useMemo(() => indexBy(runningBlocks, ({ uuid }) => uuid), [runningBlocks]);

  useEffect(() => {
    setTimeout(() => {
      /*
       * On Chrome browsers, the dep graph would not center automatically when
       * navigating to the Pipeline Editor page even though the "fit" prop was
       * added to the Canvas component. This centers it if it is not already.
       */
      if (canvasRef?.current?.containerRef?.current?.scrollTop === 0) {
        canvasRef?.current?.fitCanvas?.();
      }
    }, 1000);
  }, [canvasRef]);

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
    ({ fromBlock, portSide, toBlock, removeDependency }:
      {
        fromBlock: BlockType;
        portSide?: SideEnum;
        toBlock: BlockType;
        removeDependency?: boolean;
      },
    ) => {
      let blockToUpdate = toBlock;
      let upstreamBlocks = toBlock.upstream_blocks.concat(fromBlock.uuid);
      if (!removeDependency && portSide === SideEnum.NORTH) {
        blockToUpdate = fromBlock;
        upstreamBlocks = fromBlock.upstream_blocks.concat(toBlock.uuid);
      }

      return api.blocks.pipelines.useUpdate(
        pipeline?.uuid,
        encodeURIComponent(blockToUpdate.uuid),
      )({
        block: {
          ...blockToUpdate,
          upstream_blocks: removeDependency
            ? toBlock.upstream_blocks.filter(uuid => uuid !== fromBlock.uuid)
            : upstreamBlocks,
        },
      });
    },
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
    setSelectedBlock?.(selectedBlock?.uuid === block?.uuid ? null : block);
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

  const {
    edges,
    nodes,
    ports,
  } = useMemo(() => buildNodesEdgesPorts({
    activeNodes,
    blockStatus,
    blockUUIDMapping,
    blocks,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    downstreamBlocksMapping,
    extensionBlocksByBlockUUID,
    nodeHovering,
    pipeline,
  }), [
    activeNodes,
    blockStatus,
    blockUUIDMapping,
    blocks,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    downstreamBlocksMapping,
    extensionBlocksByBlockUUID,
    nodeHovering,
    pipeline,
  ]);

  const getBlockStatus = useCallback((block: BlockType): {
    hasFailed: boolean;
    isInProgress: boolean;
    isQueued: boolean;
    isSuccessful: boolean;
  } => {
    if (noStatus || !block) {
      return {};
    } else if (blockStatus) {
      const {
        status,
        runtime,
      } = blockStatus[getBlockRunBlockUUID(block)] || {};

      return {
        hasFailed: RunStatus.FAILED === status,
        isCancelled: RunStatus.CANCELLED === status,
        isConditionFailed: RunStatus.CONDITION_FAILED === status,
        isInProgress: RunStatus.RUNNING === status,
        isQueued: RunStatus.INITIAL === status,
        isSuccessful: RunStatus.COMPLETED === status,
        runtime,
      };
    } else {
      const messagesWithType = getMessagesWithType(messages?.[block?.uuid] || []);
      const {
        hasError,
        hasOutput,
      } = hasErrorOrOutput(messagesWithType);

      const isInProgress = runningBlocksMapping[block?.uuid];

      return {
        hasFailed: !isInProgress && (hasError || StatusTypeEnum.FAILED === block.status),
        isInProgress,
        isQueued: isInProgress && runningBlocks[0]?.uuid !== block.uuid,
        isSuccessful: !isInProgress && ((!hasError && hasOutput) || StatusTypeEnum.EXECUTED === block.status),
      };
    }
  }, [
    blockStatus,
    messages,
    noStatus,
    runningBlocks,
    runningBlocksMapping,
  ]);

  const containerHeight = useMemo(() => {
    let v = 0;
    if (height) {
      v += height;
    }
    if (heightOffset) {
      v -= heightOffset;
    }

    return Math.max(0, v);
  }, [
    height,
    heightOffset,
  ]);

  const onClickNode = useCallback((event, {
    data: {
      block,
    },
  }) => {
    const disabled = blockEditing?.uuid === block.uuid;
    if (!disabled) {
      if (blockEditing) {
        onClickWhenEditingUpstreamBlocks(block);
      } else {
        onClickNodeProp?.({
          block,
        });

        // This is required because if the block is hidden, it needs to be un-hidden
        // before scrolling to it or else the scrollIntoView won’t scroll to the top
        // of the block.
        setTimeout(() => {
          onClick(block);
        }, 1);
      }
    }
  }, [
    blockEditing,
    onClick,
    onClickNodeProp,
    onClickWhenEditingUpstreamBlocks,
  ]);

  const clearTimeoutForNode = useCallback((node) => {
    const nodeID = node?.id;
    if (nodeID in timeoutActiveRefs.current) {
      clearTimeout(timeoutActiveRefs?.current?.[nodeID]);
    }
  }, [activeNodes]);

  const setTimeoutForNode = useCallback((node) => {
    const nodeID = node?.id;
    timeoutActiveRefs.current[nodeID] = setTimeout(() => {
      setActiveNodes((prev) => {
        const mapping = { ...prev };
        delete mapping?.[nodeID];

        return mapping;
      });
    }, 1000);
  }, [setActiveNodes]);

  const onMouseEnterNode = useCallback((event, node, opts) => {
    if (!isDragging && nodeDragging) {
      const fromBlock: BlockType = node?.data?.block;
      const toBlock: BlockType = nodeDragging?.node?.data?.block;

      const isConnectingIntegrationSourceAndDestination = (
        pipeline?.type === PipelineTypeEnum.INTEGRATION
          && (fromBlock?.type === BlockTypeEnum.DATA_EXPORTER
            || (fromBlock?.type === BlockTypeEnum.DATA_LOADER
              && toBlock?.type === BlockTypeEnum.DATA_EXPORTER)
            )
      );

      if (!isConnectingIntegrationSourceAndDestination
        && !fromBlock?.upstream_blocks?.includes(toBlock?.uuid)
        && fromBlock?.uuid !== toBlock?.uuid
      ) {
        updateBlockByDragAndDrop({
          fromBlock,
          portSide: SideEnum.SOUTH,
          toBlock,
        });
      }
    }

    if (editingBlock?.upstreamBlocks) {
      return;
    }

    clearTimeoutForNode(node);
    setNodeHovering(node);

    const nodeID = node?.id;

    if (!Object.keys(activePorts || {})?.length || nodeID in activePorts) {
      setActiveNodes(prev => {
        Object.values(prev || {}).forEach((nodePrev) => {
          setTimeoutForNode(nodePrev);
        });

        return {
          ...prev,
          [nodeID]: node,
        };
      });
    } else {
      setTargetNode(node);
    }
  }, [
    activePorts,
    clearTimeoutForNode,
    editingBlock,
    isDragging,
    nodeDragging,
    pipeline,
    setActiveNodes,
    setNodeHovering,
    setTargetNode,
    setTimeoutForNode,
  ]);

  const onMouseLeaveNode = useCallback((event, node, opts) => {
    setNodeHovering(null);
    setTimeoutForNode(node);
  }, [
    setNodeHovering,
    setTimeoutForNode,
  ]);

  const onMouseDownNode = useCallback((event, node, opts) => {
    const nodeID = node?.id;
    timeoutDraggingRefs.current[nodeID] = setTimeout(() => {
      setActiveEdge(null);
      setActiveNodes({});
      setIsDragging(true);
      setNodeDragging({
        data: opts,
        event,
        node,
      });
    }, 500)
  }, [
    setActiveNodes,
    setActiveEdge,
    setIsDragging,
    setNodeDragging,
  ]);

  const onMouseUpNode = useCallback((event, node, opts) => {
    const nodeID = node?.id;
    if (nodeID in timeoutDraggingRefs.current) {
      clearTimeout(timeoutDraggingRefs?.current?.[nodeID]);
    }
  }, []);

  const onContextMenuNode = useCallback((event, node, opts) => {
    event.preventDefault();
    console.log('SHOW MENU!');
  }, []);

  const onEnterPort = useCallback(({
    event,
    node,
    port,
  }) => {
    clearTimeoutForNode(node);
    setNodeHovering(node);
  }, [
    clearTimeoutForNode,
    setNodeHovering,
  ]);

  const onLeavePort = useCallback(({
    event,
    node,
    port,
  }) => {
    setNodeHovering(null);
    setTimeoutForNode(node);
  }, [
    setNodeHovering,
    setTimeoutForNode,
  ]);

  const onDragStartPort = useCallback(({
    event,
    initial,
    node,
    port,
  }) => {
    setActivePorts(prev => ({
      ...prev,
      [node?.id]: {
        event,
        initial,
        node,
        port,
      },
      }));
  }, [
    setActivePorts,
  ]);

  const onDragEndPort = useCallback(({
    event,
    inital,
    node,
    port,
  }) => {
    const nodeID = node?.id;
    const side = port?.side as SideEnum;

    if (targetNode) {
      const fromBlock: BlockType = node?.properties?.data?.block;
      const toBlock: BlockType = targetNode?.data?.block;

      const isConnectingIntegrationSourceAndDestination = (
        pipeline?.type === PipelineTypeEnum.INTEGRATION
          && (fromBlock?.type === BlockTypeEnum.DATA_EXPORTER
            || (fromBlock?.type === BlockTypeEnum.DATA_LOADER
              && toBlock?.type === BlockTypeEnum.DATA_EXPORTER)
            )
      );

      if (!isConnectingIntegrationSourceAndDestination
        && !fromBlock?.upstream_blocks?.includes(toBlock.uuid)
        && node?.id !== targetNode?.id
      ) {
        const portSide = port?.side as SideEnum;
        updateBlockByDragAndDrop({
          fromBlock,
          portSide: portSide || SideEnum.SOUTH,
          toBlock,
        });
      }
    }

    setActivePorts((prev) => {
      const mapping = { ...prev };
      delete mapping?.[nodeID];

      return mapping;
    });
    setTimeoutForNode(node);
  }, [
    pipeline,
    setActivePorts,
    setTimeoutForNode,
    targetNode,
  ]);

  const determineSelectedStatus: {
    anotherBlockSelected: boolean;
    selected: boolean;
  } = useCallback((node: NodeType, block: BlockType) => {
    if (nodeDragging) {
      return {
        anotherBlockSelected: true,
        selected: false,
      };
    }

    const activePortExists = Object.values(activePorts || {})?.length >= 1;
    const activePort = activePorts?.[node?.id];

    const selected = blockEditing
      ? !!find(upstreamBlocksEditing, ({ uuid }) => uuid === block.uuid)
      : activePortExists
        ? activePort
        : selectedBlock?.uuid === block.uuid;
    const anotherBlockSelected = activePortExists
      ? !activePort
      : !!selectedBlock;

    return {
      anotherBlockSelected,
      selected,
    };
  }, [
    activePorts,
    blockEditing,
    nodeDragging,
    selectedBlock,
    upstreamBlocksEditing,
  ]);

  const buildBlockNode = useCallback((node, block, {
    isDragging,
    nodeHeight,
    opacity,
  }) => {
    const {
      data: {
        children,
      },
    } = node;

    const {
      anotherBlockSelected,
      selected,
    } = determineSelectedStatus(node, block);

    const {
      hasFailed,
      isInProgress,
      isQueued,
      isSuccessful,
    } = getBlockStatus(block);

    return (
      <BlockNode
        anotherBlockSelected={anotherBlockSelected}
        block={block}
        callbackBlocks={callbackBlocksByBlockUUID?.[block?.uuid]}
        conditionalBlocks={conditionalBlocksByBlockUUID?.[block?.uuid]}
        disabled={blockEditing?.uuid === block.uuid}
        downstreamBlocks={children}
        extensionBlocks={extensionBlocksByBlockUUID?.[block?.uuid]}
        hasFailed={hasFailed}
        height={nodeHeight}
        hideNoStatus
        hideStatus={disabledProp || noStatus}
        isDragging={isDragging}
        isInProgress={isInProgress}
        isQueued={isQueued}
        isSuccessful={isSuccessful}
        key={block?.uuid}
        opacity={opacity}
        pipeline={pipeline}
        selected={selected}
      />
    );
  }, [
    blockEditing,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    disabledProp,
    extensionBlocksByBlockUUID,
    getBlockStatus,
    noStatus,
    pipeline,
  ]);

  const nodeDraggingMemo = useMemo(() => {
    if (!isDragging || !nodeDragging) {
      return
    }

    const {
      event,
      node,
      data,
    } = nodeDragging;

    const {
      clientX,
      clientY,
    } = event;

    const {
      x,
      y,
    } = containerRef?.current?.getBoundingClientRect() || {};

    const block = node?.data?.block;

    if (!block) {
      return;
    }

    const blockStatus = getBlockStatus(block);
    const callbackBlocks = callbackBlocksByBlockUUID?.[block?.uuid];
    const conditionalBlocks = conditionalBlocksByBlockUUID?.[block?.uuid];
    const extensionBlocks = extensionBlocksByBlockUUID?.[block?.uuid];

    const opts = {
      blockStatus,
      callbackBlocks,
      conditionalBlocks,
      extensionBlocks,
    };
    const nodeHeight = getBlockNodeHeight(block, pipeline, opts);
    const nodeWidth = getBlockNodeWidth(block, pipeline, opts);

    const blockNode = buildBlockNode(node, block, {
      isDragging: true,
      nodeHeight: data?.nodeHeight,
      opacity: 0.5,
    });

    return (
      <div
        style={{
          left: (clientX - x) - (nodeWidth / 2),
          position: 'absolute',
          top: (clientY - y) - (nodeHeight / 2),
        }}
      >
        {blockNode}
      </div>
    );
  }, [
    buildBlockNode,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    extensionBlocksByBlockUUID,
    isDragging,
    nodeDragging,
    pipeline,
  ]);

  // Show a menu to add a block between or delete the connection.
  const activeEdgeMenu = useMemo(() => {
    if (!activeEdge) {
      return;
    }

    const {
      edge,
    } = activeEdge;
    const fromBlock = blockUUIDMapping[edge?.from];
    const toBlock = blockUUIDMapping[edge?.to];

    const {
      clientX,
      clientY,
    } = event;

    const {
      x,
      y,
    } = containerRef?.current?.getBoundingClientRect() || {};

    return (
      <div
        style={{
          left: clientX - x,
          position: 'absolute',
          top: clientY - y,
        }}
      >
        <ClickOutside
          disableEscape
          onClickOutside={() => setActiveEdge(null)}
          open
        >
          <Panel noPadding>
            <Spacing px={PADDING_UNITS} py={1}>
              <Link
                onClick={() => {
                  const idx = blocks?.findIndex(({ uuid }) => uuid === toBlock?.uuid);

                  addNewBlockAtIndex(
                    {
                      downstream_blocks: toBlock ? [toBlock?.uuid] : null,
                      language: toBlock?.language,
                      type: BlockTypeEnum.CUSTOM,
                      upstream_blocks: fromBlock ? [fromBlock?.uuid] : null,
                    },
                    idx,
                    () => {
                      setActiveEdge(null);
                    },
                  );
                }}
                preventDefault
                sameColorAsText
              >
                Add new block between
              </Link>
            </Spacing>

            <Divider light />

            <Spacing px={PADDING_UNITS} py={1}>
              <Link
                onClick={() => {
                  updateBlockByDragAndDrop({
                    fromBlock,
                    removeDependency: true,
                    toBlock,
                  });
                  setActiveEdge(null);
                }}
                preventDefault
                sameColorAsText
              >
                Remove connection
              </Link>
            </Spacing>
          </Panel>
        </ClickOutside>
      </div>
    );
  }, [
    activeEdge,
    blocks,
    setActiveEdge,
    updateBlockByDragAndDrop,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
      }}
    >
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

      <GraphContainerStyle
        height={containerHeight}
        onDoubleClick={() => canvasRef?.current?.fitCanvas?.()}
      >
        <Canvas
          // arrow={<MarkerArrow style={{ fill: themeContext?.borders?.light }} />}
          arrow={null}
          disabled={disabledProp}
          edge={(edge) => {
            const block = blockUUIDMapping[edge.source];
            const colorData = getColorsForBlockType(block?.type, {
              blockColor: block?.color,
              theme: themeContext,
            });

            const downstreamBlockUUID = block?.downstream_blocks?.find(
              uuid => buildPortIDDownstream(block?.uuid, uuid) === edge?.sourcePort,
            );
            const downstreamBlock = blockUUIDMapping?.[downstreamBlockUUID];
            const {
              isInProgress,
            } = getBlockStatus(downstreamBlock);

            const {
              anotherBlockSelected,
              selected,
            } = determineSelectedStatus({
              id: block?.uuid,
            }, block);

            return (
              <Edge
                {...edge}
                className={`edge ${isInProgress ? 'active' : 'inactive'}`}
                onClick={(event, edge) => {
                  setActiveEdge(prev => prev?.edge?.id === edge?.id ? null : {
                    block,
                    edge,
                    event,
                  });
                }}
                // onKeyDown={() => {

                // }}
                // onEnter={(e) => {
                //   // function getAllSiblings(elem, filter) {
                //   //     var sibs = [];
                //   //     elem = elem.parentNode.firstChild;
                //   //     do {
                //   //         if (elem.nodeType === 3) continue; // text node
                //   //         if (!filter || filter(elem)) sibs.push(elem);
                //   //     } while (elem = elem.nextSibling)
                //   //     return sibs;
                //   // }
                //   // getAllSiblings(e.target)?.forEach(el => {
                //   //   const classNames = new Set(...el.className?.baseVal?.split(' '));
                //   //   classNames.add('show');
                //   //   // el.className = [...classNames].join(' ');
                //   //   // el.style.opacity = '1 !important';
                //   //   console.log(edge)
                //   // });

                //   setActiveEdges({
                //     [edge.id]: edge,
                //   });
                // }}
                // onLeave={() => {
                //   setActiveEdges({});
                // }}
                // onAdd={(event, edge) => {
                //   const fromBlock = blockUUIDMapping[edge.from];
                //   const toBlock = blockUUIDMapping[edge.to];
                //   const idx = blocks?.findIndex(({ uuid }) => uuid === toBlock?.uuid);

                //   addNewBlockAtIndex(
                //     {
                //       downstream_blocks: [toBlock?.uuid],
                //       language: toBlock?.language,
                //       type: BlockTypeEnum.CUSTOM,
                //       upstream_blocks: [fromBlock?.uuid],
                //     },
                //     idx,
                //     () => {

                //     },
                //   );
                // }}
                // add={
                //   <Add
                //     className={`edge-rect edge-rect-${colorsInverse?.[colorData?.accentLight]} edge-line edge-line-${colorsInverse?.[colorData?.accent]}`}
                //     hidden={!!activeEdges?.[edge?.id]}
                //     size={2 * UNIT}
                //   />
                // }
                // remove={
                //   <Remove
                //     className={`edge-rect edge-line edge-line-remove`}
                //     // hidden={!activeEdges?.[edge?.id]}
                //     hidden={false}
                //     size={2 * UNIT}
                //   />
                // }
                // onRemove={(event, edge) => {
                //   console.log('WTFF')
                //   const fromBlock = blockUUIDMapping[edge.from];
                //   const toBlock = blockUUIDMapping[edge.to];

                //   updateBlockByDragAndDrop({
                //     fromBlock,
                //     removeDependency: true,
                //     toBlock,
                //   });
                //   setEdgeSelections([]);
                // }}
                // removable={enablePorts && !editingBlock?.upstreamBlocks}
                // removable={true}
                style={{
                  stroke: anotherBlockSelected && !selected
                    ? colorData?.accentLight
                    : colorData?.accent,
                  strokeWidth: STROKE_WIDTH,
                }}
              />
            );
          }}
          edges={edges}
          fit
          forwardedRef={canvasRef}
          // https://github.com/reaviz/reaflow/blob/master/src/layout/elkLayout.ts
          layoutOptions={{
            // 'elk.nodeLabels.placement': 'INSIDE V_CENTER H_RIGHT',
            // 'elk.algorithm': 'org.eclipse.elk.layered',
            // 'elk.direction': 'DOWN',
            // nodeLayering: 'INTERACTIVE',
            // 'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
            // 'elk.layered.unnecessaryBendpoints': 'true',
            // 'elk.layered.spacing.edgeNodeBetweenLayers': '20',
            // 'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            // 'org.eclipse.elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
            // 'org.eclipse.elk.insideSelfLoops.activate': 'true',
            // separateConnectedComponents: 'false',
            // 'spacing.componentComponent': '20',
            // spacing: '25',
            // 'spacing.nodeNodeBetweenLayers': '20'
          }}
          maxHeight={ZOOMABLE_CANVAS_SIZE}
          maxWidth={ZOOMABLE_CANVAS_SIZE}
          maxZoom={1}
          minZoom={-0.7}
          node={(node) => {
            const nodeID = node?.id;
            const block = node?.properties?.data?.block;
            const blockUUID = block?.uuid;

            const color = getColorsForBlockType(
              block?.type,
              {
                blockColor: block?.color,
                theme: themeContext,
              },
            );
            const isActive = nodeHovering?.id === node?.id || !!activeNodes?.[blockUUID];

            const {
              anotherBlockSelected,
              selected,
            } = determineSelectedStatus(node, block);

            return (
              <Node
                {...node}
                dragType="port"
                linkable
                port={
                  <Port
                    onDrag={() => {
                      setActiveEdge(null);
                      clearTimeoutForNode(node);
                    }}
                    onDragEnd={(event, initial, port) => {
                      onDragEndPort({
                        event,
                        initial,
                        node,
                        port,
                      });
                    }}
                    onDragStart={(event, initial, port) => {
                      // Build block node, then drag it around.
                      onDragStartPort({
                        event,
                        initial,
                        node,
                        port,
                      });
                    }}
                    onEnter={(event, port) => {
                      onEnterPort({
                        event,
                        node,
                        port,
                      });
                    }}
                    onLeave={(event, port) => {
                      onLeavePort({
                        event,
                        node,
                        port,
                      });
                    }}
                    rx={isActive ? 10 : 0}
                    ry={isActive ? 10 : 0}
                    style={{
                      fill: color?.accentLight,
                      stroke: anotherBlockSelected && !selected ? color?.accentLight : color?.accent,
                      strokeWidth: 1,
                    }}
                  >
                    <h1>HELLO</h1>
                    {(portData) => {
                      console.log(portData);
                      return (
                        <Port>
                        </Port>
                      );
                    }}
                  </Port>
                }
                // port={(showPorts && (
                //   activePort === null || isActivePort(activePort, node)))
                //   ?
                //     <Port
                //       onDrag={() => setShowPorts(true)}
                //       onDragEnd={() => {
                //         setShowPorts(false);
                //         setActivePorts(null);
                //       }}
                //       onDragStart={(e, initial, port) => {
                //         const side = port?.side as SideEnum;
                //         setActivePorts({ id: port?.id, side });
                //       }}
                //       onEnter={() => setShowPorts(true)}
                //       rx={10}
                //       ry={10}
                //       style={{
                //         fill: getColorsForBlockType(
                //           node?.properties?.data?.block?.type,
                //           {
                //             blockColor: node?.properties?.data?.block?.color,
                //             theme: themeContext,
                //           },
                //         ).accent,
                //         stroke: 'white',
                //         strokeWidth: '1px',
                //       }}
                //     />
                //   : null
                // }
                style={{
                  fill: 'transparent',
                  stroke: 'transparent',
                  strokeWidth: 0,
                }}
              >
                {(event) => {
                  const {
                    height: nodeHeight,
                    node,
                  } = event;
                  const {
                    data: {
                      block,
                      children,
                    },
                  } = node;

                  const {
                    anotherBlockSelected,
                    selected,
                  } = determineSelectedStatus(node, block);

                  const {
                    hasFailed,
                    isInProgress,
                    isQueued,
                    isSuccessful,
                  } = getBlockStatus(block);

                  return (
                    <foreignObject
                      height={nodeHeight}
                      onClick={(e) => onClickNode(e, node)}
                      onContextMenu={(e) => onContextMenuNode(e, node, {
                        nodeHeight,
                      })}
                      onMouseEnter={(e) => onMouseEnterNode(e, node, {
                        nodeHeight,
                      })}
                      onMouseLeave={(e) => onMouseLeaveNode(e, node, {
                        nodeHeight,
                      })}
                      onMouseDown={(e) => onMouseDownNode(e, node, {
                        nodeHeight,
                      })}
                      onMouseUp={(e) => onMouseUpNode(e, node, {
                        nodeHeight,
                      })}
                      style={{
                        // https://reaflow.dev/?path=/story/docs-advanced-custom-nodes--page#the-foreignobject-will-steal-events-onclick-onenter-onleave-etc-that-are-bound-to-the-rect-node
                        // pointerEvents: 'none',
                      }}
                      width={event.width}
                      x={0}
                      y={0}
                    >
                      <BlockNode
                        anotherBlockSelected={anotherBlockSelected}
                        block={block}
                        callbackBlocks={callbackBlocksByBlockUUID?.[block?.uuid]}
                        conditionalBlocks={conditionalBlocksByBlockUUID?.[block?.uuid]}
                        disabled={blockEditing?.uuid === block.uuid}
                        downstreamBlocks={children}
                        extensionBlocks={extensionBlocksByBlockUUID?.[block?.uuid]}
                        hasFailed={hasFailed}
                        height={nodeHeight}
                        hideNoStatus
                        hideStatus={disabledProp || noStatus}
                        isInProgress={isInProgress}
                        isQueued={isQueued}
                        isSuccessful={isSuccessful}
                        key={block.uuid}
                        pipeline={pipeline}
                        selected={selected}
                      />
                    </foreignObject>
                  );
                }}
              </Node>
            );
          }}
          nodes={nodes}
          // onNodeLink={(_event, from, to, port) => {
          //   console.log('wtf', _event)
          //   const fromBlock: BlockType = blockUUIDMapping[from.id];
          //   const toBlock: BlockType = blockUUIDMapping[to.id];

          //   const isConnectingIntegrationSourceAndDestination = (
          //     pipeline?.type === PipelineTypeEnum.INTEGRATION
          //       && (fromBlock?.type === BlockTypeEnum.DATA_EXPORTER
          //         || (fromBlock?.type === BlockTypeEnum.DATA_LOADER
          //           && toBlock?.type === BlockTypeEnum.DATA_EXPORTER)
          //         )
          //   );
          //   if (fromBlock?.upstream_blocks?.includes(toBlock.uuid)
          //     || from.id === to.id
          //     || isConnectingIntegrationSourceAndDestination
          //   ) {
          //     return;
          //   }

          //   const portSide = port?.side as SideEnum;
          //   updateBlockByDragAndDrop({
          //     fromBlock,
          //     portSide: portSide || SideEnum.SOUTH,
          //     toBlock,
          //   });
          // }}
          onNodeLinkCheck={(event, from, to) => !edges.some(e => e.from === from.id && e.to === to.id)}
          onZoomChange={z => setZoom?.(z)}
          pannable={pannable}
          selections={edgeSelections}
          zoomable={zoomable}
        >
        </Canvas>
      </GraphContainerStyle>

      {activeEdgeMenu}
      {nodeDraggingMemo}
    </div>
  );
}

export default DependencyGraph;
