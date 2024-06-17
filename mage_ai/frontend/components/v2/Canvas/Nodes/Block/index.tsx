import { PortSubtypeEnum } from '../../types';

type AsideType = {
  after?: {
    Icon?: string;
    color?: string;
  };
  before?: {
    Icon?: string;
    color?: string;
  };
};

type ConnectionsType = {
  type: PortSubtypeEnum;
};

type BadgeType = {
  color?: string;
  label?: string;
};

type BlockNodeProps = {
  titleConfig: {
    asides?: {
      after?: AsideType;
      before?: AsideType;
    };
    badge?: BadgeType;
    connections?: ConnectionType[];
    label?: string;
  };
};

function BlockNode() {
  return <div />;
}

export default BlockNode;
