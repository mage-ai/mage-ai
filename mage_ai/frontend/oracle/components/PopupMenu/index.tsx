import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import PopupMenuContainer from './PopupMenuContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { UNIT } from '@oracle/styles/units/spacing';

type PopupMenuProps = {
  bottom?: number;
  danger?: boolean;
  left?: number;
  isLoading?: boolean;
  onCancel: () => void;
  onClick: (item: any) => void;
  right?: number;
  subtitle?: string;
  title?: string;
  top?: number;
  width?: number;
};

const DEFAULT_CONTAINER_WIDTH = UNIT * 32;

function PopupMenu({
  bottom,
  danger,
  left,
  isLoading,
  onCancel,
  onClick,
  right,
  subtitle,
  title,
  top,
  width,
}: PopupMenuProps) {
  return (
    <PopupMenuContainer
      bottom={bottom}
      left={left}
      right={right}
      top={top}
      width={width || DEFAULT_CONTAINER_WIDTH}
    >
      <FlexContainer alignItems="center" flexDirection="column">
        <Spacing pb={1}>
          <Text bold large warning whiteSpaceNormal>
            {title}
          </Text>
        </Spacing>
        <Text small>
          {subtitle}
        </Text>
      </FlexContainer>
      <Spacing mt={2}>
        <FlexContainer alignItems="center" justifyContent="center">
          <Button
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Spacing mr={1} />
          <Button
            loading={isLoading}
            onClick={onClick}
          >
            <Text bold danger={danger}>
              Confirm
            </Text>
          </Button>
        </FlexContainer>
      </Spacing>
    </PopupMenuContainer>
  );
}

export default PopupMenu;
