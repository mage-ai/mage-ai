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

export interface ShadowNodeType {
  component: React.ReactNode;
  data?: any;
  id: string;
  onCapture?: (node: ShadowNodeType, data: NodeData, element: HTMLElement) => void,
  ref?: React.MutableRefObject<HTMLElement>;
  shouldCapture?: (node: ShadowNodeType, element: HTMLElement) => boolean;
  targetRef?: (node: ShadowNodeType) => React.MutableRefObject<HTMLElement>;
}

interface ShadowRendererType {
  nodes: ShadowNodeType[];
  handleDataCapture: (node: ShadowNodeType, data: NodeData) => void;
  maxAttempts?: number;
  pollInterval?: number;
  renderNode?: (node: ShadowNodeType) => React.ReactNode | null;
  uuid?: string;
  waitUntil?: (nodes: ShadowNodeType[]) => boolean;
}

export function ShadowRenderer({
  nodes,
  handleDataCapture,
  maxAttempts = 10,
  pollInterval = 100,
  uuid,
  waitUntil,
}: ShadowRendererType) {
  const attemptsRef = useRef(0);
  const portalRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef(0);
  const timeoutRef = useRef<any>(null);
  const uuidPrev = useRef<string>(null);

  const [main, setMain] = useState<React.ReactNode>(null);

  useEffect(() => {
    if (uuid && !uuidPrev.current) {
      uuidPrev.current = uuid;
    }

    if (uuid && uuidPrev.current && uuid !== uuidPrev.current) {
      attemptsRef.current = 0;
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);

      attemptsRef.current = 0;
      portalRef.current = null;
      renderRef.current = 0;
      timeoutRef.current = null;
    }
  }, [uuid]);

  const render = useCallback(() => {
    attemptsRef.current += 1;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    console.log(
      `[shadow:${uuid}:${renderRef.current}] attempting: `,
      `${attemptsRef.current} / ${maxAttempts}`,
    );

    if (attemptsRef.current < maxAttempts && (!waitUntil || waitUntil(nodes))) {
      attemptsRef.current = maxAttempts;

      console.log(
        `[shadow:${uuid}:${renderRef.current}] rendering:`,
        attemptsRef.current,
        nodes?.length,
        nodes?.map(n => n.id),
      );

      renderRef.current += 1;

      setMain(
        <div key={`shadow-portal-${uuid}`}>
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

          <ShadowContainer
            nodes={nodes}
            handleDataCapture={handleDataCapture}
            uuid={uuid}
          />
        </div>
      );

      return;
    }

    if (attemptsRef.current < maxAttempts) {
      timeoutRef.current = setTimeout(render, pollInterval);
    }
  }, [uuid, handleDataCapture, nodes, waitUntil, maxAttempts, pollInterval]);

  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(render, pollInterval);

  return main;
}

function ShadowContainer({ nodes, handleDataCapture, uuid }: {
  nodes: ShadowRendererType['nodes'];
  handleDataCapture: ShadowRendererType['handleDataCapture'];
  uuid?: string;
}): any {
  const completedNodesRefs = useRef<Record<string, NodeData>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutTargetRefs = useRef<Record<string, any>>({});
  const timeoutRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    const timeoutTargets = Object.values(timeoutTargetRefs.current ?? {}) ?? [];
    const timeouts = Object.values(timeoutRefs.current ?? {}) ?? [];

    return () => {
      completedNodesRefs.current = {};
      containerRef.current = null;
      timeoutTargets?.forEach(clearTimeout);
      timeouts?.forEach(clearTimeout);
      timeoutTargetRefs.current = {};
      timeoutRefs.current = {};
    };
  }, []);

  const containerMemo = useMemo(() => {
    console.log(`[hook:${uuid}] rendering:`, nodes?.length, nodes?.map(n => n.id));

    function captureData(node: ShadowNodeType, element: HTMLElement) {
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

        const renderTarget = () => {
          const elementRef = targetRef(node);
          console.log(`[hook:${uuid}] targetRef:`, elementRef?.current);

          if (!elementRef?.current) {
            timeoutTargetRefs.current[node.id] = setTimeout(renderTarget, 100);
            return;
          }

          const children = document.querySelectorAll(`[data-node-id="${node.id}"]`);

          console.log(`[hook:${uuid}] targetRef.children:`, children);

          children?.forEach(child => {
            if (child instanceof Node) {
              elementRef.current.appendChild(child.firstChild);
            }
          });
        };

        if (targetRef ?? false) {
          timeoutTargetRefs.current[node.id] = setTimeout(renderTarget, 100);
        }

        node?.onCapture && node?.onCapture?.(node, data, element);
      };

      timeoutRefs.current[node.id] = setTimeout(report, 100);
    }

    return (
      <div
        id={`shadow-container-${uuid}`}
        key={`shadow-container-${uuid}`}
        ref={containerRef}
        style={SHARED_STYLES as React.CSSProperties}
      >
        {nodes?.map((node: ShadowNodeType) => {
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
