import { memo } from 'react';

import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BORDER_RADIUS_PILL } from '@oracle/styles/units/borders';
import { CanvasRef } from 'reaflow';
import { Recenter, ZoomIn, ZoomOut } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { ZoomControlsStyle, ZoomDisplayStyle } from './index.style';

type ZoomControlProps = {
  canvasRef?: { current?: CanvasRef };
  zoomLevel: number;
};

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
  size: UNIT * 2.5,
};

function ZoomControls({ canvasRef, zoomLevel }: ZoomControlProps) {
  return (
    <ZoomControlsStyle>
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
          onClick={() => canvasRef?.current?.zoomIn?.()}
        >
          <ZoomIn {...SHARED_ICON_PROPS} />
        </Button>
      </Tooltip>
      <Tooltip {...SHARED_TOOLTIP_PROPS} label="Zoom out">
        <Button 
          {...SHARED_BUTTON_PROPS}
          onClick={() => canvasRef?.current?.zoomOut?.()}
        >
          <ZoomOut {...SHARED_ICON_PROPS} />
        </Button>
      </Tooltip>
      <Tooltip {...SHARED_TOOLTIP_PROPS} label="Zoom level">
        <ZoomDisplayStyle>
          <Text 
            center
            large
            minWidth={UNIT * 5} // Prevent button resizing due to varying number of digits
          >
            {`${Math.round(zoomLevel * 100)}%`}
          </Text>
        </ZoomDisplayStyle>
      </Tooltip>
    </ZoomControlsStyle>
  );
}

export default memo(ZoomControls);
