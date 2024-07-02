import React, { useEffect, useRef } from 'react';
import update from 'immutability-helper';
import useAppEventsHandler, { CustomAppEventEnum } from '../../Apps/PipelineCanvas/useAppEventsHandler';
import { NodeType } from '../interfaces';

export default function useDispatchMounted(
  node: NodeType,
  nodeRef: React.RefObject<Element>,
  opts?: {
    eventType?: CustomAppEventEnum | string;
    onMount?: () => void;
  },
) {
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);

  const { dispatchAppEvent } = useAppEventsHandler(node);

  useEffect(() => {
    if (phaseRef.current === 0 && nodeRef?.current) {
      const dispatchMounted = (event?: any) => {
        clearTimeout(timeoutRef.current)

        if (phaseRef.current >= 1) return;

        const computedStyle =
          typeof window !== 'undefined' && window.getComputedStyle(nodeRef.current);

        if (computedStyle) {
          clearTimeout(timeoutRef.current)
          phaseRef.current += 1;

          dispatchAppEvent((opts?.eventType ?? CustomAppEventEnum.NODE_MOUNTED) as CustomAppEventEnum, {
            event: update(event ?? {}, {
              data: {
                $set: {
                  node,
                },
              },
              operationTarget: {
                $set: nodeRef,
              },
            }) as any,
            options: {
              kwargs: { computedStyle },
            },
          });

          if (opts?.onMount) {
            opts?.onMount();
          }
        } else {
          timeoutRef.current = setTimeout(dispatchMounted, 100);
        }
      };

      setTimeout(dispatchMounted, 100);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phaseRef,
  };
}