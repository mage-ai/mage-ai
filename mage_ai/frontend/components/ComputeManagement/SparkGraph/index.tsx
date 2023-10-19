import { CanvasRef } from 'reaflow';
import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useRef } from 'react';

import GraphNode from './GraphNode';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  Canvas,
  Edge,
  Node,
  Port,
} from '@components/DependencyGraph';
import {
  EdgeType,
  NodeType,
  PortType,
  SHARED_PORT_PROPS,
  SideEnum,
  ZOOMABLE_CANVAS_SIZE,
} from '@components/DependencyGraph/constants';
import { GraphContainerStyle } from '@components/DependencyGraph/index.style';
import { SparkStageAttemptType, SparkJobType, SparkSQLType } from '@interfaces/SparkType';
import { getNodeHeight, getNodeWidth } from './utils';
import { indexBy, groupBy } from '@utils/array';

type SparkGraphProps = {
  height: number;
  heightOffset?: number;
  model: SparkSQLType;
  treeRef?: any;
};

function SparkGraph({
  height,
  heightOffset,
  model,
  treeRef,
}: SparkGraphProps) {
  const treeInnerRef = useRef<CanvasRef>(null);
  const canvasRef = treeRef || treeInnerRef;
  const themeContext = useContext(ThemeContext);

  const { data } = api.spark_sqls.detail(model?.id, {
    include_jobs_and_stages: 1,
    _format: 'with_jobs_and_stages',
  });
  const sql = useMemo(() => data?.spark_sql, [data]);
  const jobsMapping =
    useMemo(() => indexBy(sql?.jobs || [], ({ job_id: jobId }) => jobId), [sql]);
  const stagesMapping =
    useMemo(() => indexBy(sql?.stages || [], ({ stage_id: stageId }) => stageId), [sql]);

  const {
    edges,
    nodes,
  } = useMemo(() => {
    const nodesInner: NodeType[] = [];
    const edgesInner: EdgeType[] = [];

    const sqlEdges = sql?.edges || [];
    const edgesMappingUpstream = groupBy(sqlEdges, ({ from_id: fromID }) => fromID);
    const edgesMappingDownstream = groupBy(sqlEdges, ({ to_id: toID }) => toID);
    const portsMapping = {};

    sqlEdges?.forEach(({
      from_id: fromID,
      to_id: toID,
    }) => {
      edgesInner.push({
        from: fromID,
        fromPort: `${fromID}-${toID}-from`,
        id: `${fromID}-${toID}`,
        to: toID,
        toPort: `${fromID}-${toID}-to`,
      });

      if (!(fromID in portsMapping)) {
        portsMapping[fromID] = [];
      }

      portsMapping[fromID].push({
        ...SHARED_PORT_PROPS,
        id: `${fromID}-${toID}-from`,
        side: SideEnum.SOUTH,
      });

      if (!(toID in portsMapping)) {
        portsMapping[toID] = [];
      }

      portsMapping[toID].push({
        ...SHARED_PORT_PROPS,
        id: `${fromID}-${toID}-to`,
        side: SideEnum.NORTH,
      });
    });

    sql?.nodes?.forEach((sqlNode) => {
      const nodeId = sqlNode?.node_id;
      const ports = [...(portsMapping?.[nodeId] || [])];

      nodesInner.push({
        data: {
          sqlNode,
        },
        height: getNodeHeight(sqlNode),
        id: nodeId,
        ports,
        width: getNodeWidth(sqlNode),
      });
    });

    return {
      edges: edgesInner,
      nodes: nodesInner,
    };
  }, [
    jobsMapping,
    sql,
    stagesMapping,
  ]);

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

  return (
    <GraphContainerStyle
      height={containerHeight}
      onDoubleClick={() => canvasRef?.current?.fitCanvas?.()}
    >
      <Canvas
        arrow={null}
        edge={(edge) => {
          return (
            <Edge
              {...edge}
              style={{
                stroke: themeContext?.accent?.purple,
              }}
            />
          );
        }}
        edges={edges}
        fit
        forwardedRef={canvasRef}
        maxHeight={ZOOMABLE_CANVAS_SIZE}
        maxWidth={ZOOMABLE_CANVAS_SIZE}
        maxZoom={1}
        minZoom={-0.7}
        node={(node) => (
          <Node
            {...node}
            dragType="port"
            linkable
            // onClick={(event, {
            //   data: {
            //     block,
            //   },
            // }) => {
            //   setActivePort(null);
            //   const disabled = blockEditing?.uuid === block.uuid;
            //   if (!disabled) {
            //     if (blockEditing) {
            //       onClickWhenEditingUpstreamBlocks(block);
            //     } else {
            //       onClickNode?.({
            //         block,
            //       });

            //       // This is required because if the block is hidden, it needs to be un-hidden
            //       // before scrolling to it or else the scrollIntoView won’t scroll to the top
            //       // of the block.
            //       setTimeout(() => {
            //         onClick(block);
            //       }, 1);
            //     }
            //   }
            // }}
            // onEnter={() => {
            //   if (!editingBlock?.upstreamBlocks) {
            //     setShowPorts(true);
            //   }
            // }}
            // onLeave={() => {
            //   if (!activePort) {
            //     setShowPorts(false);
            //   }
            // }}
            port={(
              <Port
                // onDrag={() => setShowPorts(true)}
                // onDragEnd={() => {
                //   setShowPorts(false);
                //   setActivePort(null);
                // }}
                // onDragStart={(e, initial, port) => {
                //   const side = port?.side as SideEnum;
                //   setActivePort({ id: port?.id, side });
                // }}
                // onEnter={() => setShowPorts(true)}
                rx={10}
                ry={10}
                style={{
                  fill: themeContext?.borders?.light,
                  stroke: themeContext?.accent?.purple,
                  strokeWidth: '1px',
                }}
              />
            )}
            style={{
              fill: 'transparent',
              stroke: 'transparent',
              strokeWidth: 0,
            }}
          >
            {(event) => {
              const {
                height: nodeHeight,
                node: {
                  data: {
                    sqlNode,
                  },
                },
              } = event;

              return (
                <foreignObject
                  height={nodeHeight}
                  style={{
                    // https://reaflow.dev/?path=/story/docs-advanced-custom-nodes--page#the-foreignobject-will-steal-events-onclick-onenter-onleave-etc-that-are-bound-to-the-rect-node
                    pointerEvents: 'none',
                  }}
                  width={event.width}
                  x={0}
                  y={0}
                >
                  <GraphNode
                    height={nodeHeight}
                    node={sqlNode}
                  />
                </foreignObject>
              );
            }}
          </Node>
        )}
        nodes={nodes}
        // onNodeLink={(_event, from, to, port) => {
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
        // onNodeLinkCheck={(event, from, to) => !edges.some(e => e.from === from.id && e.to === to.id)}
        // onZoomChange={z => setZoom?.(z)}
        // pannable={pannable}
        // selections={edgeSelections}
        // zoomable={zoomable}
      />
    </GraphContainerStyle>
  );
}

export default SparkGraph;
