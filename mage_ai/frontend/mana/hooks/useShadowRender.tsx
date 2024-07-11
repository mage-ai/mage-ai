import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { WithOnMount } from './useWithOnMount';
import { RectType } from '@mana/shared/interfaces';
import { createPortal } from 'react-dom';

const SHARED_STYLES = {
  height: 9999,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  position: 'absolute',
  visibility: 'hidden',
  width: 9999,
  zIndex: -9999,
};

interface NodeData {
  computedStyle: CSSStyleDeclaration;
  rect: RectType;
}

interface NodeType {
  component: React.ReactNode;
  data?: any;
  id: string;
  onCapture?: (node: NodeType, data: NodeData, element: HTMLElement) => void,
  ref?: React.MutableRefObject<HTMLElement>;
  shouldCapture?: (node: NodeType, element: HTMLElement) => boolean;
  target?: React.ReactNode;
  targetRef?: React.MutableRefObject<HTMLElement>;
}

interface ShadowRendererType {
  nodes: NodeType[];
  handleDataCapture: (node: NodeType, data: NodeData) => void;
  renderNode?: (node: NodeType) => React.ReactNode | null;
  uuid?: string;
}

export function ShadowRenderer({ nodes, handleDataCapture, uuid }: ShadowRendererType) {
  const portalRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef(0);
  const uuidRef = useRef(uuid);
  const shadowContainer = useShadowRender(nodes, handleDataCapture, uuid);
  // const [phase, setPhase] = useState(0);

  // This useEffect will move the nodes out of the shadow DOM and into the main DOM
  // useEffect(() => {
  //   // if (nodes?.length >= 1 && isCompleted && phase === 0) {
  //   //   const shadowContainer = shadowContainerRef.current;
  //   //   console.log('[shadow]', shadowContainer, portalRef.current);
  //   //   if (shadowContainer && portalRef.current) {
  //   //     while ((shadowContainer.firstChild ?? false)) {
  //   //       console.log('shadow child found');
  //   //       if (shadowContainer.firstChild instanceof Node) {
  //   //         portalRef.current.appendChild(shadowContainer.firstChild);
  //   //       }
  //   //     }
  //   //     setPhase(1);
  //   //   }
  //   // }

  //   // if (nodes?.length >= 1 && phase === 1) {
  //   //   let index = 0;
  //   //   while ((portalRef.current.firstChild ?? false)) {
  //   //     if (portalRef.current.firstChild instanceof Node) {
  //   //       const dom = nodes[index].targetRef ?? portalRef;
  //   //       dom?.current?.appendChild(portalRef.current.firstChild);
  //   //       index++;
  //   //     }
  //   //   }
  //   // }
  // }, [isCompleted, nodes, phase, shadowContainerRef]);

  useEffect(() => {
    if (uuidRef.current !== uuid) {
      renderRef.current = 0;
      uuidRef.current = uuid;
    }
  }, [uuid]);

  console.log(`[shadow:${uuid}:${renderRef.current}] starting...`);

  const main = useMemo(() => {
    console.log(
      `[shadow:${uuid}:${renderRef.current}] rendering:`,
      nodes?.length,
      nodes?.map(n => n.id),
    );

    renderRef.current += 1;

    return (
      <>
        <div
          id={`shadow-portal-${uuid}`}
          style={{
            ...SHARED_STYLES,
            height: 0,
            width: 0,
          } as React.CSSProperties}
        >
          <div ref={portalRef} />
        </div>

        {nodes?.map(node => node.target)}

        {shadowContainer}
      </>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, uuid]);

  return main;
}

export default function useShadowRender(
  nodes: ShadowRendererType['nodes'],
  handleDataCapture: ShadowRendererType['handleDataCapture'],
  uuid?: string,
): any {
  const completedNodesRefs = useRef<Record<string, NodeData>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    const timeouts = Object.values(timeoutRefs.current ?? {}) ?? [];

    return () => {
      timeouts?.forEach(clearTimeout);
      timeoutRefs.current = {};
    };
  }, []);

  const containerMemo = useMemo(() => {
    console.log(`[hook:${uuid}] rendering:`, nodes?.length, nodes?.map(n => n.id));

    function captureData(node: NodeType, element: HTMLElement) {
      const report = () => {
        clearTimeout(timeoutRefs.current[node.id]);
        const computedStyle =
          typeof window !== 'undefined' && window.getComputedStyle(element);

        if (!computedStyle) {
          timeoutRefs.current[node.id] = setTimeout(report, 100);
          return;
        }

        console.log(`[hook:${uuid}] report:`, node.id);

        clearTimeout(timeoutRefs.current[node.id]);

        const position = computedStyle.getPropertyValue('position');
        element.style.position = 'absolute';

        const rect = element.getBoundingClientRect();
        const data = { computedStyle, rect };
        handleDataCapture(node, data);
        element.style.position = position;

        completedNodesRefs.current[node.id] = data;

        const { targetRef } = node;
        console.log(`[hook:${uuid}] targetRef:`, targetRef.current);

        if (targetRef) {
          const children = document.querySelectorAll(`[data-node-id="${node.id}"]`);

          console.log(`[hook:${uuid}] targetRef.children:`, children);

          children?.forEach(child => {
            if (child instanceof Node) {
              targetRef.current.appendChild(child.firstChild);
            }
          });
        }

        node?.onCapture && node?.onCapture?.(node, data, element);
      };

      timeoutRefs.current[node.id] = setTimeout(report, 100);
    }

    return (
      <div
        id={`shadow-container-${uuid}`}
        ref={containerRef}
        style={SHARED_STYLES as React.CSSProperties}
      >
        {nodes?.map((node: NodeType) => {
          console.log(`[hook:${uuid}] WithOnMount:`, node.id)

          return (
            <WithOnMount
              key={[node.id, uuid].filter(Boolean).join(':')}
              onMount={(ref) => {
                const { shouldCapture } = node;
                const element = node.ref ? node.ref.current : ref.current;
                const capture = !shouldCapture || shouldCapture(node, element);
                if (capture) {
                  console.log(`[hook:${uuid}:${node.id}] onMount:`, capture, element);
                  captureData(node, element);
                }
              }}
              uuid={uuid}
              withRef={!node.ref}
            >
              <div data-node-id={node.id}>
                {node.component}
              </div>
            </WithOnMount>
          );
        })}
      </div>
    );
  }, [handleDataCapture, nodes, uuid]);


  return containerMemo;
}
