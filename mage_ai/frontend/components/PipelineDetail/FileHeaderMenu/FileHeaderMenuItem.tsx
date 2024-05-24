import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Check } from '@oracle/icons';
import { ICON_SIZE_DEFAULT } from '@oracle/styles/units/icons';

type FileHeaderMenuItemProps = {
  beforeIcon?: JSX.Element;
  checked?: boolean;
  label: string;
  muted?: boolean;
};

export const blankIcon =  <div style={{ width: ICON_SIZE_DEFAULT }} />;

function FileHeaderMenuItem({
  beforeIcon,
  checked,
  label,
  muted,
}: FileHeaderMenuItemProps) {
  return (
    <FlexContainer alignItems="center">
      {beforeIcon
        ? beforeIcon
        : (checked
          ?  <Check />
          :  blankIcon
        )
      }

      <Spacing mr={1} />

      <Text disabled={muted} noWrapping>
        {label}
      </Text>
    </FlexContainer>
  );
}

export default FileHeaderMenuItem;
