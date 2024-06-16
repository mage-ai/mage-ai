import update from 'immutability-helper';
import { CSSProperties, FC, useRef } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';

import { DraggableBlock } from '../../Canvas/Draggable/DraggableBlock';
import type { DragItem } from '../../Canvas/interfaces';
import { ItemTypeEnum } from '../../Canvas/types';
import { snapToGrid as doSnapToGrid } from '../../Canvas/utils/snapToGrid';
import { ColorEnum } from '../../Canvas/types';
import GroupNode from '../../Canvas/Nodes/GroupNode';
import BoxNode from '../../Canvas/Nodes/BoxNode';
import TargetBox from '../../Canvas/Targets/TargetBox';
import NestedTargetBox from '../../Canvas/Targets/NestedTargetBox';


import { ConnectionType, NodeType } from './interfaces';
import { Node } from './Nodes/Node';
// import { ItemTypeEnum } from './types';
import { throttle } from '../../Canvas/utils/throttle';
import { getPath } from './Path/utils';
import { CanvasStyled } from './index.style';
import { ConnectionsPathStyled } from './Path/index.style';
import { Canvas } from '../../Canvas';
import { BoxContainer } from '../../Canvas/Containers/BoxContainer';


function PipelineBuilderCanvas() {
  const [renderTrigger, setRenderTrigger] = useState(0);

  const [boxes, setBoxes] = useState({
    a: { top: 20, left: 80, title: 'Drag me around' },
    b: { top: 180, left: 20, title: 'Drag me too' },
  });

  const moveBox = useCallback(
    (id: number | string, left: number, top: number) => {
      setBoxes(
        update(boxes, {
          [id]: {
            $merge: { left, top },
          },
        }),
      );
    },
    [boxes],
  );

  console.log(boxes);
  const nodesRef = useRef<NodeType[]>([]);
  const connectionsRef = useRef<ConnectionType[]>([]);
  const connectingRef = useRef<number | null>(null);

  function moveNode(id: number | string, left: number, top: number) {
    throttle(() => {
      console.log('Nodes', nodesRef.current);
      const node = nodesRef.current.find((node) => node.id === id);
      if (node) {
        node.left = left;
        node.top = top;
        setRenderTrigger((prev: number) => prev + 1); // Trigger a re-render
      }
    }, 100);
  }

  function addNode(left: number, top: number) {
    const newNode: NodeType = {
      children: `Node ${nodesRef.current.length}`,
      id: nodesRef.current.length,
      left,
      top,
    };
    nodesRef.current.push(newNode);
    setRenderTrigger((prev: number) => prev + 1); // Trigger a re-render
  }

  function startConnect(event: React.MouseEvent, id: number) {
    event.stopPropagation();
    connectingRef.current = id;
    console.log('START CONNECTING FROM NODE:', id);
  }

  function endConnect(event: React.MouseEvent, id: number) {
    event.stopPropagation();

    console.log(
      'END CONNECTING TO NODE:',
      id,
      connectingRef.current,
      id,
    ); // Debug output

    if (connectingRef.current !== null && connectingRef.current !== id) {
      const fromNode = nodesRef.current.find((node) => node.id === connectingRef.current);
      const toNode = nodesRef.current.find((node) => node.id === id);

      if (fromNode && toNode) {
        connectionsRef.current.push({ from: fromNode, to: toNode });
        console.log('ADD CONNECTION FROM NODE:', fromNode.id, 'TO NODE:', toNode.id); // Debug output
        setRenderTrigger((prev: number) => prev + 1); // Trigger a re-render
      }
    }

    connectingRef.current = null;
  }

  const [, drop] = useDrop(() => ({
    accept: ItemTypeEnum.NODE,
    drop: (item: NodeType, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset() as {
        x: number
        y: number
      };

      let left = Math.round(item.left + delta.x);
      let top = Math.round(item.top + delta.y);
      [left, top] = doSnapToGrid(left, top);

      moveBox(item.id, left, top);
      // moveNode(item.id, left, top);

      return undefined;
    },
  }));

  return (
    <div ref={drop}>
      <CanvasStyled

      // onDoubleClick={(event: React.MouseEvent) => addNode(event.clientX, event.clientY)}
      // ref={drop}
    >
        {/* {nodesRef.current.map((node) => (
          <Node
          {...node}
          key={node.id}
          onEndConnect={endConnect}
          onStartConnect={startConnect}
        />
      ))} */}

        {Object.keys(boxes).map((key) => (
          <DraggableBlock
          // activeItemRef={activeItemRef}
          id={key}
          key={key}
          // showCopyIcon
          {...(boxes[key] as { top: number; left: number; title: string })}
        />
      ))}

        {/* <ConnectionsPathStyled
        className="canvas-connections"
        style={{
          height: '100%',
          left: 0,
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          width: '100%',
        }}
      >
        {connectionsRef.current.map((connection, index) => (
          <path
            d={getPath(connection.from, connection.to)}
            fill="none"
            key={index}
            stroke="black"
            strokeWidth="2"
            style={{ pointerEvents: 'auto' }} // Allow events on the path itself if needed
          />
        ))}
      </ConnectionsPathStyled> */}
      </CanvasStyled>
    </div>
  );
}

export default function Wrapper() {
  return (
    <Canvas>
      <PipelineBuilderCanvas />
    </Canvas>
  );
}
