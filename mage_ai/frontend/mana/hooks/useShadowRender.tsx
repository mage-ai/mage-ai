import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { DEBUG } from '@mana/utils/debug';
import { WithOnMount } from './useWithOnMount';

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

export interface NodeData {
  computedStyle: any;
  rect: any;
}

export interface ShadowNodeType {
  component: any;
  data?:any;
  id: any;
  isActive?: (node: ShadowNodeType, data: NodeData, child: any) => boolean;
  maxAttempts?:any;
  onCapture?:any;
  pollInterval?:any;
  ref?:any;
  shouldCapture?:any;
  targetRef?:any;
  waitUntil?: any;
}

interface ShadowRendererType {
  children?: any;
  nodes: any;
  handleDataCapture: any;
  handleNodeTransfer?: any;
  maxAttempts?: any;
  operationUUID?: string;
  shouldCancel?: (opuuid: string) => boolean;
  pollInterval?: any;
  renderNode?: any;
  uuid?: any;
  waitUntil?: any;
}

export function ShadowRenderer({
  handleDataCapture,
  handleNodeTransfer,
  maxAttempts = 10,
  nodes,
  pollInterval = 50,
  operationUUID,
  shouldCancel,
  uuid,
  waitUntil,
}: ShadowRendererType): any {
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
    };
  }, [uuid]);

  const render = useCallback(() => {
    attemptsRef.current += 1;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    DEBUG.hooks.shadow &&
      console.log(
        `[shadow:${uuid}:${renderRef.current}] attempting: `,
        `${attemptsRef.current} / ${maxAttempts}`,
      );

    if (attemptsRef.current < maxAttempts && (!waitUntil || waitUntil(nodes))) {
      attemptsRef.current = null;

      DEBUG.hooks.shadow &&
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
            style={
              {
                ...SHARED_STYLES,
                height: 0,
                width: 0,
              } as React.CSSProperties
            }
          >
            <div ref={portalRef} />
          </div>

          <ShadowContainer
            handleDataCapture={handleDataCapture}
            handleNodeTransfer={handleNodeTransfer}
            operationUUID={operationUUID}
            shouldCancel={shouldCancel}
            nodes={nodes}
            uuid={uuid}
          />
        </div>,
      );

      return;
    }

    if (attemptsRef.current !== null && attemptsRef.current < maxAttempts) {
      timeoutRef.current = setTimeout(render, pollInterval);
    }

    if (attemptsRef.current !== null && attemptsRef.current >= maxAttempts) {
      console.error(
        `[shadow:${uuid}:${renderRef.current}] failed to render within ${attemptsRef.current} attempts:`,
        nodes?.length,
        nodes?.map(n => n.id),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, handleDataCapture, handleNodeTransfer, nodes, waitUntil, maxAttempts, pollInterval]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(render, pollInterval);
  }, [render, pollInterval]);

  return main;
}

function ShadowContainer({
  nodes,
  handleDataCapture,
  handleNodeTransfer,
  operationUUID,
  shouldCancel  ,
  uuid,
}: {
  nodes: ShadowRendererType['nodes'];
  operationUUID: ShadowRendererType['operationUUID'];
  shouldCancel: ShadowRendererType['shouldCancel'];
  handleDataCapture: ShadowRendererType['handleDataCapture'];
  handleNodeTransfer?: ShadowRendererType['handleNodeTransfer'];
  uuid?: string;
}): any {
  const completedNodesRefs = useRef<Record<string, NodeData>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const attemptsRef = useRef<Record<string, number>>({});

  const timeoutTargetRefs = useRef<Record<string, any>>({});
  const timeoutWaitUntilRefs = useRef<Record<string, any>>({});
  const timeoutRefs = useRef<Record<string, any>>({});

  const cancelledRef = useRef(false);

  useEffect(() => {
    const timeoutTargets = Object.values(timeoutTargetRefs.current ?? {}) ?? [];
    const timeoutWaitUntils = Object.values(timeoutWaitUntilRefs.current ?? {}) ?? [];
    const timeouts = Object.values(timeoutRefs.current ?? {}) ?? [];

    return () => {
      attemptsRef.current = {};
      completedNodesRefs.current = {};
      containerRef.current = null;

      timeoutTargets?.forEach(clearTimeout);
      timeoutWaitUntils?.forEach(clearTimeout);
      timeouts?.forEach(clearTimeout);

      timeoutTargetRefs.current = {};
      timeoutWaitUntilRefs.current = {};
      timeoutRefs.current = {};
    };
  }, []);

  const containerMemo = useMemo(() => {
    DEBUG.hooks.shadow &&
      console.log(
        `[hook:${uuid}] rendering:`,
        nodes?.length,
        nodes?.map(n => n.id),
      );

    function captureData(node: ShadowNodeType, element: HTMLElement) {
      const report = () => {
        clearTimeout(timeoutRefs.current[node.id]);

        if (cancelledRef.current) return;

        const computedStyle = typeof window !== 'undefined' && window.getComputedStyle(element);

        if (!computedStyle) {
          timeoutRefs.current[node.id] = setTimeout(report, 100);
          return;
        }

        DEBUG.hooks.shadow && console.log(`[hook:${uuid}] report:`, node.id);

        clearTimeout(timeoutRefs.current[node.id]);

        const position = computedStyle.getPropertyValue('position');
        element.style.position = 'absolute';

        const rect = element.getBoundingClientRect();
        const data = { computedStyle, rect };
        handleDataCapture(node, data);
        element.style.position = position;

        completedNodesRefs.current[node.id] = data;

        const { isActive, targetRef } = node;

        const renderTarget = () => {
          const elementRef = targetRef(node);
          DEBUG.hooks.shadow && console.log(`[hook:${uuid}] targetRef:`, elementRef?.current);

          if (!elementRef?.current) {
            timeoutTargetRefs.current[node.id] = setTimeout(renderTarget, 100);
            return;
          }

          const children = document.querySelectorAll(`[data-node-id="${node.id}"]`);

          DEBUG.hooks.shadow && console.log(`[hook:${uuid}] targetRef.children:`, children);

          children?.forEach(child => {
            const cancel = cancelledRef.current || shouldCancel && shouldCancel(operationUUID);
            if (cancel) {
              cancelledRef.current = true;
              return;
            }

            if (child instanceof Node
              && (!isActive || isActive(node, data, child))
            ) {
              elementRef.current.replaceChildren(child.firstChild);
            }
          });

          if (handleNodeTransfer) {
            // console.log(`[hook:${uuid}] handleNodeTransfer:`, data.rect, elementRef.current, element);
            handleNodeTransfer?.(node, data, element);
          }
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
          DEBUG.hooks.shadow && console.log(`[hook:${uuid}] WithOnMount:`, node.id);

          return (
            <WithOnMount
              key={[node.id, uuid].filter(Boolean).join(':')}
              onMount={ref => {
                const { maxAttempts = 10, pollInterval = 50, shouldCapture, waitUntil } = node;
                attemptsRef.current[node.id] = 0;

                const process = () => {
                  attemptsRef.current[node.id] += 1;
                  clearTimeout(timeoutWaitUntilRefs.current[node.id]);
                  timeoutWaitUntilRefs.current[node.id] = null;

                  if (
                    attemptsRef.current[node.id] < maxAttempts &&
                    (!waitUntil || waitUntil(node))
                  ) {
                    attemptsRef.current[node.id] = null;

                    const element = node.ref ? node.ref.current : ref.current;
                    const capture = !shouldCapture || shouldCapture(node, element);
                    if (capture) {
                      DEBUG.hooks.shadow &&
                        console.log(`[hook:${uuid}:${node.id}] onMount:`, capture, element);
                      captureData(node, element);
                    }

                    return;
                  }

                  if (
                    attemptsRef.current[node.id] !== null &&
                    attemptsRef.current[node.id] < maxAttempts
                  ) {
                    timeoutWaitUntilRefs.current[node.id] = setTimeout(process, pollInterval);
                    return;
                  }

                  if (
                    attemptsRef.current[node.id] !== null &&
                    attemptsRef.current[node.id] >= maxAttempts
                  ) {
                    console.error(
                      `[hook:${uuid}] failed to wait for ${node.id} attempts:`,
                      attemptsRef.current[node.id],
                    );
                  }
                };

                timeoutWaitUntilRefs.current[node.id] = setTimeout(
                  process,
                  waitUntil ? pollInterval : 0,
                );
              }}
              uuid={uuid}
              withRef={!node.ref}
            >
              <div data-node-id={node.id}>{node.component}</div>
            </WithOnMount>
          );
        })}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDataCapture, handleNodeTransfer, nodes, uuid]);

  return containerMemo;
}
