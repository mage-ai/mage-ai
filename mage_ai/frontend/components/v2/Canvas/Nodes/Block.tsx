import { AsidesType, ConnectionsType, BadgeType } from './types';

type BlockNodeProps = {
  titleConfig: {
    asides?: AsidesType;
    badge?: BadgeType;
    connections?: ConnectionType[];
    label?: string;
  };
};

function BlockNode() {
  return <div />;
}

export default BlockNode;
