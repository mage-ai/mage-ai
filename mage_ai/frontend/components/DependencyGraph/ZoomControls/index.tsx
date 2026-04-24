import { memo, useCallback, useEffect, useState } from 'react';

import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import exportDependencyGraph from '@utils/exportDependencyGraph';
import { BORDER_RADIUS_PILL } from '@oracle/styles/units/borders';
import { CanvasRef } from 'reaflow';
import { Download, Recenter, ZoomIn, ZoomOut } from '@oracle/icons';
import { ICON_SIZE_MEDIUM } from '@oracle/styles/units/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { ZoomControlsStyle, ZoomDisplayStyle } from './index.style';

type ZoomControlProps = {
  canvasRef?: { current?: CanvasRef };
  containerRef?: { current?: any };
  graphContainerRef?: { current?: HTMLDivElement };
  pipelineName?: string;
  zoomLevel: number;
};

export const DEFAULT_ZOOM_LEVEL = 1;
const ZOOM_FACTOR = 0.1;
const MIN_CONTAINER_WIDTH = UNIT * 35;

const SHARED_TOOLTIP_PROPS = {
  bottomOffset: UNIT * 6.5,
  size: null,
  widthFitContent: true,
};
const SHARED_BUTTON_PROPS = {
  highlightOnHoverAlt: true,
  iconOnly: true,
  noBorder: true,
  padding: `${UNIT * 1.5}px ${UNIT * 1.875}px`,
  transparent: true,
};
const SHARED_ICON_PROPS = {
  size: ICON_SIZE_MEDIUM,
};

function ZoomControls({
  canvasRef,
  containerRef,
  graphContainerRef,
  pipelineName,
  zoomLevel,
}: ZoomControlProps) {
  const [minimizeControls, setMinimizeControls] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef?.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = containerRef?.current?.offsetWidth;
      setMinimizeControls(containerWidth < MIN_CONTAINER_WIDTH);
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  const handleDownload = useCallback(() => {
    if (!canvasRef?.current || !graphContainerRef?.current) return;

    exportDependencyGraph({
      canvasRef: canvasRef as { current: CanvasRef },
      graphContainerRef: graphContainerRef as { current: HTMLDivElement },
      filename: `${pipelineName || 'pipeline'}_dependency_tree`,
    }).catch((err) => {
      console.error('Failed to export dependency graph:', err);
    });
  }, [canvasRef, graphContainerRef, pipelineName]);

  return (
    <ZoomControlsStyle className="zoom-controls" onDoubleClick={(event) => { event.stopPropagation(); }}>
      {!minimizeControls && (
        <>
          <Tooltip {...SHARED_TOOLTIP_PROPS} label="Reset (shortcut: double-click canvas)">
            <Button 
              {...SHARED_BUTTON_PROPS}
              borderRadius={`${BORDER_RADIUS_PILL}px 0 0 ${BORDER_RADIUS_PILL}px`}
              onClick={() => canvasRef?.current?.fitCanvas?.()}
              padding={`${UNIT * 1.5}px ${UNIT * 1.875}px ${UNIT * 1.5}px ${UNIT * 3.25}px`}
            >
              <Recenter {...SHARED_ICON_PROPS} />
            </Button>
          </Tooltip>
          <Tooltip {...SHARED_TOOLTIP_PROPS} label="Zoom in">
            <Button  
              {...SHARED_BUTTON_PROPS}
              onClick={() => canvasRef?.current?.setZoom?.(
                (zoomLevel - DEFAULT_ZOOM_LEVEL) + ZOOM_FACTOR,
              )}
            >
              <ZoomIn {...SHARED_ICON_PROPS} />
            </Button>
          </Tooltip>
          <Tooltip {...SHARED_TOOLTIP_PROPS} label="Zoom out">
            <Button 
              {...SHARED_BUTTON_PROPS}
              onClick={() => canvasRef?.current?.setZoom?.(
                (zoomLevel - DEFAULT_ZOOM_LEVEL) - ZOOM_FACTOR,
              )}
            >
              <ZoomOut {...SHARED_ICON_PROPS} />
            </Button>
          </Tooltip>
          <Tooltip {...SHARED_TOOLTIP_PROPS} label="Download dependency tree as image">
            <Button
              {...SHARED_BUTTON_PROPS}
              onClick={handleDownload}
            >
              <Download {...SHARED_ICON_PROPS} />
            </Button>
          </Tooltip>
        </>
      )}
      <Tooltip {...SHARED_TOOLTIP_PROPS} label="Zoom level">
        <ZoomDisplayStyle minimizeControls={minimizeControls}>
          <Text 
            center
            large
            minWidth={UNIT * 5}
          >
            {`${Math.round(zoomLevel * 100)}%`}
          </Text>
        </ZoomDisplayStyle>
      </Tooltip>
    </ZoomControlsStyle>
  );
}

export default memo(ZoomControls);
