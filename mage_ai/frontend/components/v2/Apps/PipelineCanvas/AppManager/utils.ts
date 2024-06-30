import { AppNodeType, NodeType } from '@components/v2/Canvas/interfaces';
import { AppConfigType } from '../../interfaces';

function appInstanceID(nodeID: string, app: AppConfigType): string {
  return [nodeID, app.type, app.subtype, app.uuid].join(':');
}

export function buildAppNode(node: NodeType, app: AppConfigType, opts?: {
  level?: number;
}): AppNodeType {
  const id = appInstanceID(String(node.id), {
    ...app,
    uuid: String(app.uuid ?? node?.apps?.length ?? 0),
  });

  return {
    app,
    id,
    level: opts?.level,
    subtype: app.subtype,
    type: app.type,
    upstream: [String(node.id)],
  };
}
