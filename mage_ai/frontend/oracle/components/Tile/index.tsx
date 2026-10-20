import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  COMPACT_ICON_SIZE,
  REGULAR_ICON_SIZE,
  TileContainerStyle,
} from './index.style';

type TileProps = {
  Icon: any;
  compact?: boolean;
  label: string;
};

function Tile({
  Icon,
  compact,
  label,
}: TileProps) {
  return (
    <TileContainerStyle compact={compact}>
      <FlexContainer
        alignItems="center"
        flexDirection="column"
        justifyContent="center"
      >
        <Icon size={compact ? COMPACT_ICON_SIZE : REGULAR_ICON_SIZE} />
        <Spacing mb="4px" />
        <Text
          bold
          small={compact}
        >
          {label}
        </Text>
      </FlexContainer>
    </TileContainerStyle>
  );
}

export default Tile;
