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
  BlockRequestPayloadType,
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
import ZoomControls, { DEFAULT_ZOOM_LEVEL } from './ZoomControls';
import api from '@api';
import useProject from '@utils/models/project/useProject';
import {
  EdgeType,
  NodeType,
  PortType,
  SideEnum,
  ZOOMABLE_CANVAS_SIZE,
} from './constants';
import { GraphContainerStyle, STROKE_WIDTH, inverseColorsMapping } from './index.style';
import { RunStatus } from '@interfaces/BlockRunType';
import { ThemeType } from '@oracle/styles/themes/constants';
import {
  PADDING_UNITS,
  UNIT,
} from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import {
  buildEdge,
  buildNodesEdgesPorts,
  buildPortIDDownstream,
  buildPortsDownstream,
  buildPortsUpstream,
  getBlockStatus,
  getParentNodeID,
  getParentNodeIDShared,
  isActivePort,
} from './utils';
import { find, indexBy, removeAtIndex, sortByKey } from '@utils/array';
import { getBlockNodeHeight, getBlockNodeWidth } from './BlockNode/utils';
import { getBlockRunBlockUUID } from '@utils/models/blockRun';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getMessagesWithType,
  hasErrorOrOutput,
} from '@components/CodeBlock/utils';
import { getModelAttributes } from '@utils/models/dbt';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

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
  addNewBlockAtIndex?: (
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
  contentByBlockUUID?: {
    current: {
      [blockType: string]: {
        [blockUUID: string]: string;
      };
    };
  };
  contextMenuEnabled?: boolean;
  deleteBlock?: (block: BlockType) => void;
  disabled?: boolean;
  dragEnabled?: boolean;
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
  runBlock?: (payload: {
    block: BlockType;
    code?: string;
    ignoreAlreadyRunning?: boolean;
    runUpstream?: boolean;
  }) => void;
  runningBlocks?: BlockType[];
  selectedBlock?: BlockType;
  setActiveSidekickView?: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => void;
  setErrors?: (opts: {
    errors: any;
    response: any;
  }) => void;
  setSelectedBlock?: (block: BlockType) => void;
  setZoom?: (zoom: number) => void;
  showDynamicBlocks?: boolean;
  showUpdateBlockModal?: (
    block: BlockType,
    name: string,
  ) => void;
  treeRef?: { current?: CanvasRef };
  zoomable?: boolean;
} & SetEditingBlockType;

function DependencyGraph({
  addNewBlockAtIndex,
  blockRefs,
  blockStatus,
  blocksOverride,
  blocks: allBlocksProp,
  contentByBlockUUID,
  contextMenuEnabled,
  deleteBlock,
  disabled: disabledProp,
  dragEnabled,
  editingBlock,
  enablePorts = false,
  fetchPipeline,
  height,
  heightOffset = UNIT * 10,
  messages,
  noStatus,
  onClickNode: onClickNodeProp,
  runBlock,
  pannable = true,
  pipeline,
  runningBlocks = [],
  selectedBlock,
  setActiveSidekickView,
  setEditingBlock,
  setErrors,
  setSelectedBlock,
  setZoom,
  showDynamicBlocks = false,
  showUpdateBlockModal,
  treeRef,
  zoomable = true,
}: DependencyGraphProps) {
  const { featureEnabled, featureUUIDs } = useProject();
  const themeContext: ThemeType = useContext(ThemeContext);
  const colorsInverse = useMemo(() => inverseColorsMapping(themeContext), [themeContext]);

  const containerRef = useRef(null);
  const portRefs = useRef({});
  const timeoutActiveRefs = useRef({});
  const timeoutDraggingRefs = useRef({});
  const treeInnerRef = useRef<CanvasRef>(null);
  const canvasRef = treeRef || treeInnerRef;
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM_LEVEL);

  const [activeEdge, setActiveEdge] = useState<{
    block: BlockType;
    edge: EdgeType;
    event: any;
  }>(null);
  const [activeNodes, setActiveNodes] = useState({});
  const [activePorts, setActivePorts] = useState({});
  const [contextMenuData, setContextMenuData] = useState(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [nodeDragging, setNodeDragging] = useState<{
    data: {
      nodeHeight: number;
      nodeWidth: number;
    };
    event: any;
    node: NodeType;
  }>(null);
  const [nodeHovering, setNodeHovering] = useState<NodeType>(null);
  const [targetNode, setTargetNode] = useState(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (isDragging && nodeDragging) {
        setNodeDragging(prev => ({
          ...prev,
          event,
        }));
      }
    };
    const handleMouseUp = (event) => {
      if (isDragging && nodeDragging) {
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

  const [selectedBlockTwice, setSelectedBlockTwice] = useState(null);
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

      arr2.push(...(pipeline?.blocks || []));
      arr2.push(...(pipeline?.callbacks || []));
      arr2.push(...(pipeline?.conditionals || []));

      Object.values(pipeline?.extensions || {}).forEach(({ blocks }) => {
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

  const [updateBlockByDragAndDrop] = useMutation(({
    block: blockToUpdate,
    downstreamBlocks,
    upstreamBlocks,
  }: {
    block: BlockType;
    blocks?: BlockType[];
    downstreamBlocks?: string[];
    upstreamBlocks?: string[];
  }) => {
    const blockPayload = {
      ...blockToUpdate,
    };

    if (typeof downstreamBlocks !== 'undefined') {
      blockPayload.downstream_blocks = downstreamBlocks;
    }

    if (typeof upstreamBlocks !== 'undefined') {
      blockPayload.upstream_blocks = upstreamBlocks;
    }

    return api.blocks.pipelines.useUpdate(
      encodeURIComponent(pipeline?.uuid),
      encodeURIComponent(blockToUpdate?.uuid),
    )({
      block: blockPayload,
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
  });

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

  const {
    edges,
    nodes,
    ports,
    blocksWithDownstreamBlockSet,
  } = useMemo(() => buildNodesEdgesPorts({
    activeNodes,
    blockStatus,
    blockUUIDMapping,
    blocks,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    downstreamBlocksMapping,
    enablePorts,
    extensionBlocksByBlockUUID,
    nodeHovering,
    pipeline,
    selectedBlock: selectedBlockTwice,
  }), [
    activeNodes,
    blockStatus,
    blockUUIDMapping,
    blocks,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    downstreamBlocksMapping,
    enablePorts,
    extensionBlocksByBlockUUID,
    nodeHovering,
    pipeline,
    selectedBlockTwice,
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

  const onClickNode = useCallback((event, node: any) => {
    pauseEvent(event);

    const {
      data: {
        block: blockInit,
        blocks,
      },
    } = node;

    let block = blockInit;

    if (blocks?.length >= 2 && selectedBlock) {
      const idx = blocks?.findIndex(({ uuid }) => selectedBlock?.uuid === uuid);
      if (idx < blocks?.length - 1) {
        block = blocks?.[idx + 1];
      } else {
        block = blocks?.[0];
      }
    }

    const disabled = blockEditing?.uuid === block.uuid;
    if (!disabled) {
      if (blockEditing) {
        onClickWhenEditingUpstreamBlocks(block);
      } else {
        onClickNodeProp?.({
          block,
        });

        if (selectedBlock
          && selectedBlock?.uuid === block?.uuid
          && (
            ((block?.downstream_blocks?.length || 0) <= 1 && !block?.upstream_blocks?.length)
            || (selectedBlockTwice && selectedBlockTwice?.uuid === selectedBlock?.uuid)
          )
        ) {
          setSelectedBlock?.(null);
          setSelectedBlockTwice(null);
        } else {
          if (selectedBlock) {
            if (selectedBlock?.uuid === block?.uuid) {
              setSelectedBlockTwice(block);
            } else {
              setSelectedBlockTwice(null);
            }
          }

          // This is required because if the block is hidden, it needs to be un-hidden
          // before scrolling to it or else the scrollIntoView won’t scroll to the top
          // of the block.
          setTimeout(() => {
            onClick(block);
          }, 1);
        }
      }
    }
  }, [
    blockEditing,
    onClick,
    onClickNodeProp,
    onClickWhenEditingUpstreamBlocks,
    selectedBlock,
    selectedBlockTwice,
    setSelectedBlockTwice,
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
    pauseEvent(event);

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
        // The node that is being dropped on is a group node.
        if (node?.data?.children?.length >= 1) {
          const upstreamBlocks = fromBlock?.downstream_blocks?.filter(
            (uuid: string) => !toBlock?.upstream_blocks?.includes(uuid),
          );

          updateBlockByDragAndDrop({
            block: toBlock,
            upstreamBlocks,
          });
        } else if (nodeDragging?.node?.data?.children?.length >= 1) {
          // The node that is being dragged is a group node.

          const downstreamBlocks = toBlock?.downstream_blocks?.filter(
            (uuid: string) => !fromBlock?.downstream_blocks?.includes(uuid),
          );

          updateBlockByDragAndDrop({
            block: fromBlock,
            downstreamBlocks,
          });
        } else {
          updateBlockByDragAndDrop({
            block: toBlock,
            upstreamBlocks: (toBlock?.upstream_blocks || []).concat(fromBlock?.uuid),
          });
        }
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
    pauseEvent(event);

    setNodeHovering(null);
    setTimeoutForNode(node);
  }, [
    setNodeHovering,
    setTimeoutForNode,
  ]);

  const onMouseDownNode = useCallback((event, node, opts) => {
    pauseEvent(event);

    if (contextMenuData) {
      return;
    }

    const nodeID = node?.id;
    timeoutDraggingRefs.current[nodeID] = setTimeout(() => {
      if (contextMenuData) {
        return;
      }

      setActiveEdge(null);
      setActiveNodes({});
      setIsDragging(true);
      setNodeDragging({
        data: opts,
        event,
        node,
      });
    }, 500);
  }, [
    contextMenuData,
    setActiveNodes,
    setActiveEdge,
    setIsDragging,
    setNodeDragging,
  ]);

  const onMouseUpNode = useCallback((event, node, opts) => {
    pauseEvent(event);

    const nodeID = node?.id;
    if (nodeID in timeoutDraggingRefs.current) {
      clearTimeout(timeoutDraggingRefs?.current?.[nodeID]);
    }
  }, []);

  const onContextMenuNode = useCallback((event, node, opts) => {
    pauseEvent(event);

    const nodeID = node?.id;

    clearTimeout(timeoutDraggingRefs.current?.[nodeID]);

    setContextMenuData({
      data: opts,
      event,
      node,
    });

    setActiveEdge(null);
  }, [
    setActiveEdge,
    setContextMenuData,
  ]);

  const onEnterPort = useCallback(({
    event,
    node,
    port,
  }) => {
    pauseEvent(event);

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
    pauseEvent(event);

    setNodeHovering(null);
    setTimeoutForNode(node);
  }, [
    setNodeHovering,
    setTimeoutForNode,
  ]);

  const onDragStartPort = useCallback(({
    event,
    node,
    port,
  }) => {
    setActivePorts(prev => ({
      ...prev,
      [node?.id]: {
        event,
        node,
        port,
      },
      }));
  }, [
    setActivePorts,
  ]);

  const onDragEndPort = useCallback(({
    event,
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
        const payload: {
          downstreamBlocks?: string[]
          upstreamBlocks?: string[]
        } = {};

        // If port is south, then update the toBlock’s upstream
        if (SideEnum.SOUTH === port?.side as SideEnum) {
          payload.upstreamBlocks = (toBlock?.upstream_blocks || []).concat(fromBlock?.uuid);
        } else {
          // If port is north, then update the toBlock’s downstream
          payload.downstreamBlocks = (toBlock?.downstream_blocks || []).concat(fromBlock?.uuid);
        }

        updateBlockByDragAndDrop({
          block: toBlock,
          ...payload,
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

  const determineSelectedStatus = useCallback((node: {
    id: string;
  }, block: BlockType, opts?: {
    blocksWithSameDownstreamBlocks?: BlockType[];
  }): {
    anotherBlockSelected: boolean;
    selected: boolean;
  } => {
    if (nodeDragging) {
      return {
        anotherBlockSelected: true,
        selected: false,
      };
    }

    const activePortExists = Object.values(activePorts || {})?.length >= 1;
    const activePort = activePorts?.[node?.id];

    let selected = false;

    if (blockEditing) {
      selected = !!find(upstreamBlocksEditing, ({ uuid }) => uuid === block?.uuid);
    } else if (activePortExists) {
      selected = !!activePort;
    } else if (opts?.blocksWithSameDownstreamBlocks?.length >= 2) {
      selected = opts?.blocksWithSameDownstreamBlocks?.map(
        ({ uuid }) => uuid,
      )?.includes(selectedBlock?.uuid);
    } else {
      selected = selectedBlock?.uuid === block?.uuid;
    }

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
    nodeWidth,
    opacity,
  }) => {
    const {
      data: {
        blocks: blocksWithSameDownstreamBlocks,
        children: downstreamBlocks,
      },
    } = node;

    let blockNodeChildrenEl;

    if (downstreamBlocks?.length >= 1) {
      const blockNodes = [];

      downstreamBlocks?.forEach((downstreamBlock: BlockType) => {
        const {
          anotherBlockSelected,
          selected,
        } = determineSelectedStatus(node, downstreamBlock);

        const {
          hasFailed,
          isInProgress,
          isQueued,
          isSuccessful,
        } = getBlockStatus({
          block: downstreamBlock,
          blockStatus,
          messages,
          noStatus,
          runningBlocks,
          runningBlocksMapping,
        });

        const callbackBlocks = callbackBlocksByBlockUUID?.[downstreamBlock?.uuid];
        const conditionalBlocks = conditionalBlocksByBlockUUID?.[downstreamBlock?.uuid];
        const extensionBlocks = extensionBlocksByBlockUUID?.[downstreamBlock?.uuid];

        blockNodes.push(
          <BlockNode
            anotherBlockSelected={anotherBlockSelected}
            block={downstreamBlock}
            callbackBlocks={callbackBlocksByBlockUUID?.[downstreamBlock?.uuid]}
            conditionalBlocks={conditionalBlocksByBlockUUID?.[downstreamBlock?.uuid]}
            disabled={blockEditing?.uuid === downstreamBlock?.uuid}
            extensionBlocks={extensionBlocksByBlockUUID?.[downstreamBlock?.uuid]}
            hasFailed={hasFailed}
            height={getBlockNodeHeight(downstreamBlock, pipeline, {
              blockStatus,
              callbackBlocks,
              conditionalBlocks,
              extensionBlocks,
            })}
            hideNoStatus
            hideStatus={disabledProp || noStatus}
            isDragging={isDragging}
            isInProgress={isInProgress}
            isQueued={isQueued}
            isSuccessful={isSuccessful}
            key={downstreamBlock?.uuid}
            opacity={opacity}
            pipeline={pipeline}
            selected={selected}
          />,
        );
      });

      blockNodeChildrenEl = (
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
          style={{
            height: nodeHeight,
            width: nodeWidth,
          }}
        >
          <Spacing pr={PADDING_UNITS} />

          {blockNodes}

          <Spacing pr={PADDING_UNITS} />
        </FlexContainer>
      );
    }

    const {
      anotherBlockSelected,
      selected,
    } = determineSelectedStatus(node, block, {
      blocksWithSameDownstreamBlocks,
    });

    const {
      hasFailed,
      isInProgress,
      isQueued,
      isSuccessful,
    } = getBlockStatus({
      block,
      blockStatus,
      messages,
      noStatus,
      runningBlocks,
      runningBlocksMapping,
    });

    let isInProgressFinal;
    if (downstreamBlocks?.length >= 1) {
      isInProgressFinal = downstreamBlocks?.some(
        downstreamBlock => downstreamBlock && getBlockStatus({
          block,
          blockStatus,
          messages,
          noStatus,
          runningBlocks,
          runningBlocksMapping,
        })?.isInProgress,
      );
    } else {
      isInProgressFinal = isInProgress;
    }

    return (
      <BlockNode
        anotherBlockSelected={anotherBlockSelected}
        block={block}
        blocksWithSameDownstreamBlocks={blocksWithSameDownstreamBlocks}
        callbackBlocks={callbackBlocksByBlockUUID?.[block?.uuid]}
        conditionalBlocks={conditionalBlocksByBlockUUID?.[block?.uuid]}
        disabled={blockEditing?.uuid === block?.uuid}
        downstreamBlocks={downstreamBlocks}
        extensionBlocks={extensionBlocksByBlockUUID?.[block?.uuid]}
        hasFailed={hasFailed}
        height={nodeHeight}
        hideNoStatus
        hideStatus={disabledProp || noStatus}
        isDragging={isDragging}
        isInProgress={isInProgressFinal}
        isQueued={isQueued}
        isSuccessful={isSuccessful}
        key={block?.uuid}
        opacity={opacity}
        pipeline={pipeline}
        selected={selected}
      >
        {blockNodeChildrenEl}
      </BlockNode>
    );
  }, [
    blockEditing,
    blockStatus,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    disabledProp,
    extensionBlocksByBlockUUID,
    messages,
    noStatus,
    pipeline,
    runningBlocks,
    runningBlocksMapping,
  ]);

  const nodeDraggingMemo = useMemo(() => {
    if (!isDragging || !nodeDragging) {
      return;
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

    const {
      hasFailed,
      isInProgress,
      isQueued,
      isSuccessful,
    } = getBlockStatus({
      block,
      blockStatus,
      messages,
      noStatus,
      runningBlocks,
      runningBlocksMapping,
    });
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
      nodeWidth: data?.nodeWidth,
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
    blockStatus,
    buildBlockNode,
    callbackBlocksByBlockUUID,
    conditionalBlocksByBlockUUID,
    extensionBlocksByBlockUUID,
    isDragging,
    messages,
    noStatus,
    nodeDragging,
    pipeline,
    runningBlocks,
    runningBlocksMapping,
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

    // @ts-ignore
    const clientX = event?.clientX;
    // @ts-ignore
    const clientY = event?.clientY;

    const {
      x,
      y,
    } = containerRef?.current?.getBoundingClientRect() || {};

    let infos;
    // Upstream is a block, downstream is a group.
    if (fromBlock && !toBlock) {
      infos = blocksWithDownstreamBlockSet?.[fromBlock?.uuid];
    } else if (!fromBlock && toBlock) {
      // Upstream is a group, downstream is a block.
      infos = blocksWithDownstreamBlockSet?.[toBlock?.uuid];
    }

    let removeBlocks = () => {
      updateBlockByDragAndDrop({
        block: toBlock,
        upstreamBlocks: (toBlock?.upstream_blocks || []).filter(uuid => uuid !== fromBlock?.uuid),
      });
    };

    if (infos?.length >= 1) {
      infos?.forEach(({
        downstreamBlocks,
        upstreamBlocks,
      }) => {
        const parentID = getParentNodeIDShared(upstreamBlocks?.map(({ uuid }) => uuid));

        // Upstream is a block, downstream is a group.
        if (fromBlock && !toBlock && edge?.to === parentID) {
          // Update the fromBlock’s downstream to exclude all the downstreamBlocks
          const mapping = indexBy(downstreamBlocks || [], ({ uuid }) => uuid);
          removeBlocks = () => {
            updateBlockByDragAndDrop({
              block: fromBlock,
              downstreamBlocks: (fromBlock?.downstream_blocks || [])
                .filter(uuid => !(uuid in mapping)),
            });
          };
        } else if (!fromBlock && toBlock && edge?.from === parentID) {
          // Upstream is a group, downstream is a block.
          // Update the toBlock’s upstream to exclude all the upstreamBlocks
          const mapping = indexBy(upstreamBlocks || [], ({ uuid }) => uuid);
          removeBlocks = () => {
            updateBlockByDragAndDrop({
              block: toBlock,
              upstreamBlocks: (toBlock?.upstream_blocks || [])
                .filter(uuid => !(uuid in mapping)),
            });
          };
        }
      });
    } else if (!fromBlock && !toBlock) {
      const blocksInGroup = [];

      edge?.to?.split(':')?.forEach((part) => {
        if (part?.length >= 1 && part !== 'parent') {
          const block2 = blockUUIDMapping?.[part];

          if (block2) {
            blocksInGroup.push(block2);
          }
        }
      });

      removeBlocks = () => {
        blocksInGroup?.forEach(block => updateBlockByDragAndDrop({
          block,
          downstreamBlocks: [],
        }));
      };
    }

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
                block
                onClick={() => {
                  const idx = blocks?.findIndex(({ uuid }) => uuid === toBlock?.uuid);

                  addNewBlockAtIndex?.(
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
                block
                onClick={() => {
                  removeBlocks?.();
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

  // @ts-ignore
  const interactionsEnabled: boolean = useMemo(() => featureEnabled?.(featureUUIDs.INTERACTIONS), [
    featureEnabled,
    featureUUIDs,
  ]);

  const contextMenuMemo = useMemo(() => {
    if (!contextMenuData) {
      return;
    }

    const {
      event,
      node,
      data,
    } = contextMenuData;
    const {
      data: {
        block,
        blocks,
        children,
      },
    } = node;

    const {
      clientX,
      clientY,
    } = event;

    const {
      x,
      y,
    } = containerRef?.current?.getBoundingClientRect() || {};

    const allDependenciesShowing = selectedBlock
      && selectedBlock?.uuid === block?.uuid
      && selectedBlockTwice
      && selectedBlockTwice?.uuid === block?.uuid;

    const idx = blocks?.findIndex(({ uuid }) => uuid === block?.uuid);

    const isIntegrationPipeline = PipelineTypeEnum.INTEGRATION === pipeline?.type;

    const menuItems: {
      disabled?: boolean;
      onClick: () => void;
      uuid: string;
    }[] = [];

    if (!isIntegrationPipeline) {
      menuItems.push({
        onClick: () => {
          runBlock?.({
            block,
            code: contentByBlockUUID?.current?.[block?.type]?.[block?.uuid],
          });
        },
        uuid: 'Run block',
      });
    }

    menuItems.push(...[
      {
        onClick: () => {
          showUpdateBlockModal(
            block,
            block?.name,
          );
        },
        uuid: 'Rename block',
      },
    ]);

    if (!isIntegrationPipeline) {
      menuItems.push(...[
        {
          disabled: ((block?.downstream_blocks?.length || 0) <= 1 && !block?.upstream_blocks?.length),
          onClick: () => {
            setSelectedBlock?.(allDependenciesShowing ? null : block);
            setSelectedBlockTwice(allDependenciesShowing ? null : block);
          },
          uuid: allDependenciesShowing ? 'Hide all dependencies' : 'Show all dependencies',
        },
        {
          onClick: () => {
            addNewBlockAtIndex?.(
              {
                downstream_blocks: block ? [block?.uuid] : null,
                language: BlockLanguageEnum.YAML === block?.language
                  ? BlockLanguageEnum.PYTHON
                  : block?.language,
                type: BlockTypeEnum.CUSTOM,
              },
              Math.max(0, idx - 1),
            );
          },
          uuid: 'Add upstream block',
        },
        {
          onClick: () => {
            addNewBlockAtIndex?.(
              {
                language: BlockLanguageEnum.YAML === block?.language
                  ? BlockLanguageEnum.PYTHON
                  : block?.language,
                type: BlockTypeEnum.CUSTOM,
                upstream_blocks: block ? [block?.uuid] : null,
              },
              idx + 1,
            );
          },
          uuid: 'Add downstream block',
        },
        {
          disabled: !block?.upstream_blocks?.length,
          onClick: () => {
            updateBlockByDragAndDrop({
              block,
              upstreamBlocks: [],
            });
          },
          uuid: 'Remove upstream dependencies',
        },
        {
          disabled: !block?.downstream_blocks?.length,
          onClick: () => {
            updateBlockByDragAndDrop({
              block,
              downstreamBlocks: [],
            });
          },
          uuid: 'Remove downstream dependencies',
        },
      ]);
    }

    if (interactionsEnabled) {
      menuItems.push({
        onClick: () => {
          onClick?.(block);
          setActiveSidekickView?.(ViewKeyEnum.INTERACTIONS);
        },
        uuid: 'Add / Edit interactions',
      });
    }

    menuItems.push(...[
      {
        onClick: () => {
          deleteBlock?.(block);
        },
        uuid: 'Delete block',
      },
      {
        onClick: () => {
          deleteBlock?.({
            ...block,
            force: true,
          });
        },
        uuid: 'Delete block (ignore dependencies)',
      },
      {
        onClick: () => {
          onClick?.(block);
          setActiveSidekickView?.(ViewKeyEnum.FILE_VERSIONS);
        },
        uuid: 'View file versions',
      },
    ]);

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
          onClickOutside={() => setContextMenuData(null)}
          open
        >
          <Panel noPadding>
            {menuItems.map(({
              disabled,
              onClick,
              uuid,
            }) => (
              <Spacing key={uuid} px={PADDING_UNITS} py={1}>
                <Link
                  block
                  disabled={disabled}
                  onClick={() => {
                    onClick();
                    setContextMenuData(null);
                  }}
                  preventDefault
                  sameColorAsText
                >
                  {uuid}
                </Link>
              </Spacing>
            ))}
          </Panel>
        </ClickOutside>
      </div>
    );
  }, [
    addNewBlockAtIndex,
    blocks,
    contentByBlockUUID,
    contextMenuData,
    deleteBlock,
    interactionsEnabled,
    onClick,
    pipeline,
    runBlock,
    setActiveSidekickView,
    setContextMenuData,
    setSelectedBlock,
    setSelectedBlockTwice,
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
        <ZoomControls
          canvasRef={canvasRef}
          containerRef={containerRef}
          zoomLevel={zoomLevel}
        />
        <Canvas
          // arrow={<MarkerArrow style={{ fill: themeContext?.borders?.light }} />}
          arrow={null}
          disabled={disabledProp}
          edge={(edge) => {
            let block = blockUUIDMapping[edge?.source];

            const blocks = [];
            if (!block) {
              edge?.id?.replace(edge?.source, '')?.split(':')?.forEach((sourcePart) => {
                if (sourcePart?.length >= 1 && sourcePart !== 'parent') {
                  const block2 = blockUUIDMapping?.[sourcePart];

                  if (block2) {
                    blocks.push(block2);
                  }
                }
              });

              if (blocks?.length) {
                block = blocks[0];
              }
            }

            const blockUUID = block?.uuid;
            let blocksWithSameDownstreamBlocks;
            const downstreamBlocks = [];

            if (blockUUID in (blocksWithDownstreamBlockSet || {})) {
              const infos = blocksWithDownstreamBlockSet?.[blockUUID];

              infos?.map(({
                downstreamBlocks: downstreamBlocksInit,
                upstreamBlocks,
              }) => {
                const blockUUIDs = sortByKey(upstreamBlocks?.map(({ uuid }) => uuid) || [], uuid => uuid);

                if (getParentNodeIDShared(blockUUIDs) === edge?.target) {
                  downstreamBlocks.push(...downstreamBlocksInit);
                  blocksWithSameDownstreamBlocks = upstreamBlocks;
                }
              });
            }

            if (!downstreamBlocks?.length) {
              if (getParentNodeID(blockUUID) === edge?.target) {
                downstreamBlocks.push(
                  ...block?.downstream_blocks?.map((uuid) => blockUUIDMapping?.[uuid]),
                );
              } else {
                const downstreamBlockUUID = block?.downstream_blocks?.find((uuid) => buildPortIDDownstream(blockUUID, uuid) === edge?.sourcePort
                    || getParentNodeID(blockUUID) === edge.target);
                const downstreamBlock = blockUUIDMapping?.[downstreamBlockUUID];
                downstreamBlocks.push(downstreamBlock);
              }
            }

            let isInProgress;
            let isQueued;

            downstreamBlocks?.forEach((downstreamBlock) => {
              if (isInProgress || isQueued) {
                return;
              }

              if (downstreamBlock) {
                const status = getBlockStatus({
                  block: downstreamBlock,
                  blockStatus,
                  messages,
                  noStatus,
                  runningBlocks,
                  runningBlocksMapping,
                });

                if (status?.isInProgress) {
                  isInProgress = status?.isInProgress;
                }

                if (status?.isQueued) {
                  isQueued = status?.isQueued;
                }
              }
            });

            const {
              anotherBlockSelected,
              selected,
            } = determineSelectedStatus(
              {
                id: blockUUID,
              },
              block,
              {
                blocksWithSameDownstreamBlocks,
              },
            );

            const colorData = getColorsForBlockType(block?.type, {
              blockColor: block?.color,
              theme: themeContext,
            });

            const edgeClassNames = [
              'edge',
              isInProgress
                ? (isQueued
                  ? 'activeSlow'
                  : 'active'
                )
                : 'inactive',
            ];

            const blockUUIDs = blocks.map(({ uuid }) => uuid);
            if (selectedBlockTwice) {
              if (selectedBlockTwice?.uuid === blockUUID
                || blockUUIDs?.includes(selectedBlockTwice?.uuid)
                || downstreamBlocks?.map(b => b?.uuid)?.includes(selectedBlockTwice?.uuid)
              ) {
                edgeClassNames.push('selected-twice');
              }
            }

            if (edge?.target?.startsWith('parent')) {
              edgeClassNames.push('group');
            }

            return (
              <Edge
                {...edge}
                className={edgeClassNames.join(' ')}
                onClick={contextMenuEnabled
                  ? (event, edge) => {
                    // @ts-ignore
                    setActiveEdge(prev => prev?.edge?.id === edge?.id ? null : {
                      block,
                      edge,
                      event,
                    });
                    setContextMenuData(null);
                  }
                  : null
                }
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
            'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
            // 'elk.nodeLabels.placement': 'INSIDE V_CENTER H_RIGHT',
            // 'elk.algorithm': 'org.eclipse.elk.layered',
            // 'elk.direction': 'DOWN',
            // nodeLayering: 'INTERACTIVE',
            // 'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
            // 'elk.layered.unnecessaryBendpoints': 'true',
            // 'elk.layered.spacing.edgeNodeBetweenLayers': '500',
            // 'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            // 'org.eclipse.elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
            // 'org.eclipse.elk.insideSelfLoops.activate': 'true',
            // separateConnectedComponents: 'false',
            // 'spacing.componentComponent': '500',
            // spacing: '500',
            // Vertical spacing between a node above and a node below
            // 'spacing.nodeNodeBetweenLayers': '500',
          }}
          maxHeight={ZOOMABLE_CANVAS_SIZE}
          maxWidth={ZOOMABLE_CANVAS_SIZE}
          maxZoom={1}
          minZoom={-1}
          node={(node) => {
            const nodeID = node?.id;
            const {
              block,
              blocks: blocksWithSameDownstreamBlocks,
            } = node?.properties?.data || {};
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
            } = determineSelectedStatus(node, block, {
              blocksWithSameDownstreamBlocks,
            });

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
                    onDragEnd={(event, _, port) => {
                      onDragEndPort({
                        event,
                        node,
                        port,
                      });
                    }}
                    onDragStart={(event, _, port) => {
                      // Build block node, then drag it around.
                      onDragStartPort({
                        event,
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
                  />
                }
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
                    width: nodeWidth,
                  } = event;
                  const {
                    data: {
                      block,
                      blocks: blocksWithSameDownstreamBlocks,
                      children: downstreamBlocks,
                    },
                  } = node;

                  const {
                    anotherBlockSelected,
                    selected,
                  } = determineSelectedStatus(node, block, {
                    blocksWithSameDownstreamBlocks,
                  });

                  const {
                    hasFailed,
                    isInProgress,
                    isQueued,
                    isSuccessful,
                  } = getBlockStatus({
                    block,
                    blockStatus,
                    messages,
                    noStatus,
                    runningBlocks,
                    runningBlocksMapping,
                  });

                  let isInProgressFinal;
                  if (downstreamBlocks?.length >= 1) {
                    isInProgressFinal = downstreamBlocks?.some(
                      downstreamBlock => downstreamBlock && getBlockStatus({
                        block: downstreamBlock,
                        blockStatus,
                        messages,
                        noStatus,
                        runningBlocks,
                        runningBlocksMapping,
                      })?.isInProgress,
                    );
                  } else {
                    isInProgressFinal = isInProgress;
                  }

                  return (
                    <foreignObject
                      height={nodeHeight}
                      onClick={(e) => onClickNode?.(e, node)}
                      onContextMenu={contextMenuEnabled
                        ? (e) => onContextMenuNode(e, node, {
                          nodeHeight,
                          nodeWidth,
                        })
                        : null
                      }
                      onMouseDown={dragEnabled
                        ? (e) => onMouseDownNode(e, node, {
                          nodeHeight,
                          nodeWidth,
                        })
                        : null
                      }
                      onMouseEnter={(e) => onMouseEnterNode(e, node, {
                        nodeHeight,
                        nodeWidth,
                      })}
                      onMouseLeave={(e) => onMouseLeaveNode(e, node, {
                        nodeHeight,
                        nodeWidth,
                      })}
                      onMouseUp={dragEnabled
                        ? (e) => onMouseUpNode(e, node, {
                          nodeHeight,
                          nodeWidth,
                        })
                        : null
                      }
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
                        blocksWithSameDownstreamBlocks={blocksWithSameDownstreamBlocks}
                        callbackBlocks={callbackBlocksByBlockUUID?.[block?.uuid]}
                        conditionalBlocks={conditionalBlocksByBlockUUID?.[block?.uuid]}
                        disabled={blockEditing?.uuid === block.uuid}
                        downstreamBlocks={downstreamBlocks}
                        extensionBlocks={extensionBlocksByBlockUUID?.[block?.uuid]}
                        hasFailed={hasFailed}
                        height={nodeHeight}
                        hideNoStatus
                        hideStatus={disabledProp || noStatus}
                        isInProgress={isInProgressFinal}
                        isQueued={isQueued}
                        isSuccessful={isSuccessful}
                        key={block.uuid}
                        pipeline={pipeline}
                        selected={selected}
                        selectedBlock={selectedBlock}
                      />
                    </foreignObject>
                  );
                }}
              </Node>
            );
          }}
          nodes={nodes}
          onNodeLinkCheck={(event, from, to) => !edges.some(e => e.from === from.id && e.to === to.id)}
          onZoomChange={z => {
            const zFinal = Math.max(z, 0.05)
            setZoom?.(zFinal);
            setZoomLevel(zFinal);
          }}
          pannable={pannable}
          selections={edgeSelections}
          zoomable={zoomable}
        >
        </Canvas>
      </GraphContainerStyle>

      {activeEdgeMenu}
      {contextMenuMemo}
      {nodeDraggingMemo}
    </div>
  );
}

export default DependencyGraph;
