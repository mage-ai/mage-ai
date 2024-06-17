import { AsidesType, ConnectionsType, BadgeType, BorderConfigType, TitleConfigType } from './types';

type BlockNodeProps = {
  children: React.ReactNode;
  titleConfig: TitleConfigType;
  borderConfig: BorderConfigType;
};

function BlockNode(props: BlockNodeProps) {
  return <div />;
}

export default BlockNode;
