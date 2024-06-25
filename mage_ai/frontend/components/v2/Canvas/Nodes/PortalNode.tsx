import React from 'react';
import useDispatchMounted from './useDispatchMounted';
import { CustomAppEventEnum } from '../../Apps/PipelineCanvas/useAppEventsHandler';
import { NodeType } from '../interfaces';

interface PortalProps {
  id: string;
}

function Portal({ id }: PortalProps, ref: React.RefObject<HTMLDivElement>) {
  useDispatchMounted({ id } as NodeType, ref, {
    eventType: CustomAppEventEnum.PORTAL_MOUNTED,
  });
  return <div id={id} ref={ref} />;
}

export default React.memo(React.forwardRef(Portal));
