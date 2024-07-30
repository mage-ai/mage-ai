import { KeyEnum } from '@mana/events/enums';
import { doesRectIntersect } from '@utils/rects';
import { motion, useDragControls, useTransform, useMotionValue, useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { MultiSelectionContext, MultiSelectionContextClientType,
  MultiSelectionContextHandlers, SelectableItemType
} from './MultiSelectionContext';
import { objectSize } from '@utils/hash';

interface MultiSelectionProviderProps {
  children: React.ReactNode;
}

export function MultiSelectionProvider({ children }: MultiSelectionProviderProps) {
  const clientRefs = useRef<Record<string, MultiSelectionContextClientType>>({});

  const shiftKeyActiveRef = useRef(false);
  const mouseDownActiveRef = useRef(false);
  const startEventRef = useRef<MouseEvent | null>(null);
  const endEventRef = useRef<MouseEvent | null>(null);

  const animateBox = useAnimation();
  const dragControls = useDragControls();
  const handleX = useMotionValue(0);
  const handleY = useMotionValue(0);

  // Adjustment for useTransform hooks to correct the direction issue.
  const widthTransform = useTransform(handleX, (latestX) => {
    // Calculate width based on drag direction
    return Math.abs(latestX - (startEventRef.current?.pageX || 0));
  });

  const heightTransform = useTransform(handleY, (latestY) => {
    // Calculate height based on drag direction
    return Math.abs(latestY - (startEventRef.current?.pageY || 0));
  });

  const xTransform = useTransform(handleX, (latestX) => {
    // Min position for X to support dragging in any direction
    return Math.min(latestX, startEventRef.current?.pageX || 0);
  });

  const yTransform = useTransform(handleY, (latestY) => {
    // Min position for Y to support dragging in any direction
    return Math.min(latestY, startEventRef.current?.pageY || 0);
  });

  const highlightedItemsRef = useRef<Record<
    string,
    Record<string, SelectableItemType>
  >>({});
  const selectedItemsRef = useRef<Record<
    string,
    Record<string, SelectableItemType>
  >>({});

  function getSelectionRect(event: MouseEvent) {
    const {
      pageX: x1,
      pageY: y1,
    } = startEventRef.current ?? {};
    const {
      pageX: x2,
      pageY: y2,
    } = event ?? {};

    return {
      height: Math.abs(y2 - y1),
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
    };
  }

  useEffect(() => {
    const highlighting = (event: MouseEvent) => {
      if (event.button === 2) return;

      event.preventDefault()
      event.stopPropagation();

      const selectionRect = getSelectionRect(event);

      Object.entries(clientRefs.current ?? {}).forEach(([clientID, {
        containerRef,
        items,
        onHighlightItem,
      }]) => {
        if (containerRef
          && !containerRef?.current?.contains?.(startEventRef?.current?.target as Node)) return;

        highlightedItemsRef.current[clientID] ||= {};

        Object.entries(items ?? {})?.forEach(([uuid, selectableItem]) => {
          const {
            getRect,
            item,
            itemRef,
            rect,
          } = selectableItem;
          const rectTest = rect ?? getRect?.() ?? itemRef?.current?.getBoundingClientRect();
          if (doesRectIntersect(selectionRect, rectTest)) {
            highlightedItemsRef.current[clientID][uuid] = selectableItem;

            if (onHighlightItem) {
              onHighlightItem(event, selectableItem, highlightedItemsRef.current[clientID]);
            }
          } else {
            delete highlightedItemsRef.current[clientID][uuid];
          }
        });
      });
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 2) return;

      event.preventDefault()
      event.stopPropagation();

      mouseDownActiveRef.current = true;
      startEventRef.current = event;

      if (shiftKeyActiveRef.current) {
        document.addEventListener('mousemove', highlighting);
        animateBox.start({
          display: 'block',
          height: heightTransform.get(),
          width: widthTransform.get(),
          x: xTransform.get(),
          y: yTransform.get(),
        });

        dragControls.start(event as PointerEvent, { snapToCursor: true });
        handleX.set(event.pageX);
        handleY.set(event.pageY);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 2) return;

      endEventRef.current = event;
      mouseDownActiveRef.current = false;

      document.removeEventListener('mousemove', highlighting);
      animateBox.set({
        display: 'none',
        height: 0,
        width: 0,
      });

      const isDeselectClick = startEventRef.current?.target === endEventRef.current.target;

      const selectionRect = getSelectionRect(endEventRef.current);

      Object.entries(clientRefs.current ?? {}).forEach(([clientID, {
        containerRef,
        items,
        onDeselectItem,
        onSelectItem,
      }]) => {
        if (containerRef
          && !containerRef.current.contains(startEventRef?.current?.target as Node)) return;

        Object.entries(items ?? {})?.forEach(([uuid, selectableItem]) => {
          const {
            getRect,
            item,
            itemRef,
            rect,
          } = selectableItem;
          const rectTest = rect ?? getRect?.() ?? itemRef?.current?.getBoundingClientRect();

          if (doesRectIntersect(selectionRect, rectTest)) {
            selectedItemsRef.current[clientID] ||= {};

            if (isDeselectClick) {
              if (shiftKeyActiveRef.current) {
                if (uuid in selectedItemsRef.current[clientID]) {
                  delete selectedItemsRef.current[clientID][uuid];
                  if (onDeselectItem) {
                    onDeselectItem(event, selectableItem);
                  }
                } else {
                  selectedItemsRef.current[clientID][uuid] = selectableItem;
                  if (onSelectItem) {
                    onSelectItem(event, selectableItem, selectedItemsRef.current[clientID]);
                  }
                }
              }
            } else {
              selectedItemsRef.current[clientID][uuid] = selectableItem;

              if (onSelectItem) {
                onSelectItem(event, selectableItem, selectedItemsRef.current[clientID]);
              }
            }
          }
        });
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KeyEnum.SHIFT) {
        if (!shiftKeyActiveRef.current) {
          Object
            .values(clientRefs.current ?? {})
            .forEach(({ onActivated }) => onActivated && onActivated(event));
        }
        shiftKeyActiveRef.current = true;
      }

      if (event.key === KeyEnum.ESCAPE) {
        Object
          .entries(clientRefs.current ?? {})
          .forEach(([uuid, { onDeselectItem }]) => {
            const items = selectedItemsRef.current[uuid];

            if (objectSize(items) > 0 && onDeselectItem) {
              Object.values(items ?? {}).map(item => onDeselectItem(event, item));
            }

            delete selectedItemsRef.current[uuid];
          });
      }
    };

    const shiftUp = (event: KeyboardEvent) => {
      if (event.key === KeyEnum.SHIFT) {
        if (!mouseDownActiveRef.current) {
          document.removeEventListener('mousemove', highlighting);
        }

        shiftKeyActiveRef.current = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', shiftUp);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', shiftUp);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  function useRegistration(uuid: string): MultiSelectionContextHandlers {
    return {
      clearSelection: () => {
        delete selectedItemsRef.current[uuid];
      },
      deregister: () => {
        delete clientRefs.current[uuid];
      },
      getSelectedItems: () => selectedItemsRef.current[uuid],
      register: (
        containerRef: MultiSelectionContextClientType['containerRef'],
        items: MultiSelectionContextClientType['items'],
        onSelectItem: MultiSelectionContextClientType['onSelectItem'],
        opts?: {
          onActivated?: MultiSelectionContextClientType['onActivated'],
          onHighlightItem?: MultiSelectionContextClientType['onHighlightItem'],
          onDeselectItem?: MultiSelectionContextClientType['onDeselectItem'],
        },
      ) => {
        clientRefs.current[uuid] = {
          containerRef,
          items,
          onSelectItem,
          ...opts,
        };
      },
    };
  }

  return (
    <MultiSelectionContext.Provider
      value={{ useRegistration }}
    >
      <motion.div
        animate={animateBox}
        style={{
          backgroundColor: 'var(--multi-select-background-color-base)',
          borderColor: 'var(--multi-select-border-color-base)',
          borderRadius: 'var(--borders-radius-base)',
          borderStyle: 'var(--borders-style)',
          borderWidth: 'var(--borders-width)',
          height: heightTransform,
          pointerEvents: 'none',
          position: 'absolute',
          width: widthTransform,
          x: xTransform,
          y: yTransform,
          zIndex: 100,
        }}
      />

      <motion.div
        drag
        dragControls={dragControls}
        style={{
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
          position: 'absolute',
          width: 0,
          x: handleX,
          y: handleY,
          zIndex: 100,
        }}
      />

      {children}
    </MultiSelectionContext.Provider>
  );
};
