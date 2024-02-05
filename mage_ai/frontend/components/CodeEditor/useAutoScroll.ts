import { useCallback } from 'react';

import { OnDidChangeCursorPositionParameterType } from '@components/CodeEditor';
import { SINGLE_LINE_HEIGHT } from '@components/CodeEditor/index.style';

export default function useAutoScroll({
  containerRef,
  contained,
}: {
  containerRef: {
    current: any;
  };
  contained?: boolean;
}): {
  onDidChangeCursorPosition: (opts: {
    editorRect: {
      top: number;
    };
    position: {
      lineNumberTop: number;
    };
  }) => void;
} {
  function onDidChangeCursorPosition({
    editorRect,
    position: {
      lineNumberTop,
    },
  }: OnDidChangeCursorPositionParameterType) {
    if (containerRef?.current) {
      const rect = containerRef?.current?.getBoundingClientRect();

      const {
        height: mainContainerHeight,
      } = rect;
      const {
        top,
      } = editorRect;

      if (contained) {
        const scrollTop = containerRef?.current?.scrollTop;

        // Going down
        const diff = (lineNumberTop + SINGLE_LINE_HEIGHT) - (mainContainerHeight + scrollTop);
        if (diff > 0) {
          containerRef?.current?.scrollBy(0, diff);
        } else if (scrollTop > lineNumberTop) {
          // Going up
          containerRef?.current?.scrollBy(0, lineNumberTop - scrollTop);
        }
      } else {
        if (top + lineNumberTop > mainContainerHeight) {
          const newY = containerRef.current.scrollTop
            + ((lineNumberTop - mainContainerHeight) + top);

          containerRef.current.scrollTo(0, newY);
        } else if (lineNumberTop + top < SINGLE_LINE_HEIGHT) {
          const newY = containerRef.current.scrollTop
            + ((lineNumberTop + top) - SINGLE_LINE_HEIGHT);
          containerRef.current.scrollTo(0, newY);
        }
      }
    }
  }

  return {
    onDidChangeCursorPosition,
  };
}
