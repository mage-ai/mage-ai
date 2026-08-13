import {
  COLLAPSED_PANEL_HEIGHT,
  COLLAPSE_THRESHOLD,
  SNAP_TO_TOP_GAP,
  OUTPUT_HEIGHT,
} from '@components/PipelineDetail/PipelineExecution/constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN,
  get,
  set as setLocalStorage,
} from '@storage/localStorage';
import { useWindowSize } from '@utils/sizes';
import { ALL_HEADERS_HEIGHT } from '@components/TripleLayout/index.style';

type Props = {
  isStreaming: boolean;
};

export const useExecutionPanelResize = ({ isStreaming }: Props) => {
  const { height: heightWindow } = useWindowSize();
  const [executionPanelHeight, setExecutionPanelHeight] = useState<number>(() => {
    const hidden = !!get(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN);
    return hidden ? COLLAPSED_PANEL_HEIGHT : OUTPUT_HEIGHT;
  });
  const [isPipelineExecutionHidden, setIsPipelineExecutionHidden] = useState(
    !!get(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN),
  ); 
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

  // max available space occupied by graph
  const graphHeight = useMemo(
    () => heightWindow - ALL_HEADERS_HEIGHT - (isStreaming ? COLLAPSED_PANEL_HEIGHT : 0),
    [heightWindow, isStreaming],
  );

  // max available space occupied by pipelineExecution
  const maxPanelHeight = useMemo(() => heightWindow - ALL_HEADERS_HEIGHT, [heightWindow]);

  useEffect(() => {
    if (!isDraggingPanel) return;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartY.current - e.clientY;
      let newHeight = dragStartHeight.current + delta;

      // Clamp + prevent violent gragging higher than maxPanelHeight
      newHeight = Math.max(0, Math.min(newHeight, maxPanelHeight));

      // Snap to top if within SNAP_TO_TOP_GAP of max
      if (newHeight > maxPanelHeight - SNAP_TO_TOP_GAP) {
        newHeight = maxPanelHeight;
      }

      // always show the execution content when the PipelineExecution being increased
      if (newHeight > COLLAPSED_PANEL_HEIGHT) {
        setIsPipelineExecutionHidden(false);
        setLocalStorage(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN, false);
      }

      setExecutionPanelHeight(newHeight);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDraggingPanel(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const delta = dragStartY.current - e.clientY;
      let newHeight = dragStartHeight.current + delta;
      newHeight = Math.max(0, Math.min(newHeight, maxPanelHeight));

      // Collapse if below threshold
      if (newHeight < COLLAPSE_THRESHOLD) {
        setExecutionPanelHeight(COLLAPSED_PANEL_HEIGHT);
        setIsPipelineExecutionHidden(true);
        setLocalStorage(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN, true);
      } else {
        // Snap to top
        if (newHeight > maxPanelHeight - SNAP_TO_TOP_GAP) {
          newHeight = maxPanelHeight;
        }
        setExecutionPanelHeight(newHeight);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPanel, maxPanelHeight, isPipelineExecutionHidden]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingPanel(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = executionPanelHeight;

      if (isPipelineExecutionHidden) {
        dragStartHeight.current = COLLAPSED_PANEL_HEIGHT;
      }
    },
    [executionPanelHeight, isPipelineExecutionHidden],
  );

  const togglePipelineExecutionHidden = useCallback(
    (hidden: boolean) => {
      setIsPipelineExecutionHidden(hidden);

      // edge case, then PipelineExecution dragged manually to the hidden state
      if (!hidden && executionPanelHeight <= COLLAPSED_PANEL_HEIGHT) {
        setExecutionPanelHeight(OUTPUT_HEIGHT);
      }
    },
    [executionPanelHeight],
  );

  const panelHeight =
    isPipelineExecutionHidden && !isDraggingPanel
      ? COLLAPSED_PANEL_HEIGHT
      : Math.max(executionPanelHeight, COLLAPSED_PANEL_HEIGHT);

  return {
    isDraggingPanel,
    panelHeight,
    graphHeight,
    isPipelineExecutionHidden,
    handleDragStart,
    togglePipelineExecutionHidden
  };
};
