import { AppNodeType, NodeType } from '@components/v2/Canvas/interfaces';
import { AppConfigType } from '../../interfaces';
import { ItemTypeEnum } from '@components/v2/Canvas/types';

function appInstanceID(nodeID: string, app: AppConfigType): string {
  return [nodeID, app.type, app.subtype, app.uuid].join(':');
}

export function buildAppNode(
  node: NodeType,
  app: AppConfigType,
  opts?: {
    level?: number;
  },
): AppNodeType {
  return {
    app,
    block: node?.block,
    id: app.uuid,
    level: opts?.level,
    rect: {
      height: undefined,
      left: 0,
      top: 0,
      width: undefined,
    },
    type: ItemTypeEnum.APP,
    upstream: [String(node.id)],
  };
}
