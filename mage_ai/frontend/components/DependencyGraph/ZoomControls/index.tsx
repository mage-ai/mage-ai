import Button from '@oracle/elements/Button';
import { Recenter, ZoomIn, ZoomOut } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { memo } from 'react';
import { CanvasRef } from 'reaflow';
import { ZoomControlsStyle } from './index.style';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';

type ZoomControlProps = {
  canvasRef?: { current?: CanvasRef };
  zoomLevel: number;
};

const SHARED_BUTTOM_PROPS = {
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
      <Button 
        {...SHARED_BUTTOM_PROPS}
        onClick={() => canvasRef?.current?.fitCanvas?.()}
        padding={`${UNIT * 1.5}px ${UNIT * 1.875}px ${UNIT * 1.5}px ${UNIT * 3.25}px`}
        title="Reset (shortcut: double-click canvas)"
      >
        <Recenter {...SHARED_ICON_PROPS} />
      </Button>
      <Button  
        {...SHARED_BUTTOM_PROPS}
        onClick={() => canvasRef?.current?.zoomIn?.()}
        title="Zoom in"
      >
        <ZoomIn {...SHARED_ICON_PROPS} />
      </Button>
      <Button 
        {...SHARED_BUTTOM_PROPS}
        onClick={() => canvasRef?.current?.zoomOut?.()}
        title="Zoom out"
      >
        <ZoomOut {...SHARED_ICON_PROPS} />
      </Button>
      
      <Button 
        {...SHARED_BUTTOM_PROPS}
        iconOnly={false}
        padding={`${UNIT * 1.5}px ${UNIT * 3.25}px ${UNIT * 1.5}px ${UNIT * 1.875}px`}
        title="Zoom level"
      >
        <Text 
          center
          large
          minWidth={UNIT * 5} // Prevent button resizing due to varying number of digits
        >
          {`${Math.round(zoomLevel * 100)}%`}
        </Text>
      </Button>
    </ZoomControlsStyle>
  );
}

export default memo(ZoomControls);
