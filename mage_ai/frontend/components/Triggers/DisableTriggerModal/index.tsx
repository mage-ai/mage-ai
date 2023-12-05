import { useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { ActionsStyle, ContentStyle, ModalStyle } from './index.style';
import { AlertTriangle } from '@oracle/icons';
import { ICON_SIZE_XLARGE } from '@oracle/styles/units/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { YELLOW } from '@oracle/styles/colors/main';
import { pluralize } from '@utils/string';

type DisableTriggerModalProps = {
  inProgressRunsCount: number;
  left?: number;
  onAllow?: (pipelineScheduleId: number) => void;
  onStop?: (pipelineScheduleId: number, pipelineUuid: string) => void;
  pipelineScheduleId: number;
  pipelineUuid: string;
  top?: number;
  topOffset?: number;
};

function DisableTriggerModal({ 
  inProgressRunsCount,
  left = 0, 
  onAllow,
  onStop,
  pipelineScheduleId, 
  pipelineUuid,
  top = 0, 
  topOffset = 0,
}: DisableTriggerModalProps) {
  const modalRef = useRef(null);
  const [finalTop, setFinalTop] = useState<number>(top + topOffset);

  useEffect(() => {
    const modalHeight =  modalRef?.current 
      ? (modalRef.current as Element).getBoundingClientRect().height
      : UNIT * 32;
    const overflowsViewport = top + topOffset + modalHeight > window.innerHeight;
    // Make sure that the modal is fully visible within the viewport
    setFinalTop(overflowsViewport ? top - modalHeight : top + topOffset);
  }, [left, top, topOffset]);

  return (
    <ModalStyle 
      left={left} 
      ref={modalRef} 
      top={finalTop}
    >
      <ContentStyle>
        <AlertTriangle fill={YELLOW} size={ICON_SIZE_XLARGE} />
        <Text bold large warning>
          {`There ${
              inProgressRunsCount === 1 ? 'is' : 'are'
            } currently ${
              pluralize('run', inProgressRunsCount, true)
            } in progress.`}
        </Text>
        <Text large>
          {`Do you want to stop or allow the ${pluralize('run', inProgressRunsCount, true, true)} to complete?`}
        </Text>
      </ContentStyle>
      <ActionsStyle>
        <Button large onClick={() => onStop(pipelineScheduleId, pipelineUuid)}>Stop</Button>
        <Button large onClick={() => onAllow(pipelineScheduleId)}>Allow</Button>
      </ActionsStyle>
    </ModalStyle>
  );
}

export default DisableTriggerModal;
