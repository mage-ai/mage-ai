import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import RowCard from '@oracle/components/RowCard';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Close } from '@oracle/icons';
import { pluralize } from '@utils/string';

export type SuggestionRowProps = {
  idx: number;
  link?: () => void;
  name: string;
  numFeatures: number;
  onClose: () => void;
  showIdx?: boolean;
}

const SuggestionRow = ({
  idx,
  link,
  name,
  numFeatures,
  onClose,
  showIdx,
}: SuggestionRowProps) => (
  <RowCard
    columnFlexNumbers={[0.5, 0.5, 12]}
  >
    {link &&
      <Link
        bold
        noHoverUnderline
        onClick={link}
      >
        Apply
      </Link>
    }
    {showIdx && <Text>{idx+1}</Text>}
    <FlexContainer>
      <Text>{name},</Text>
      <Spacing mr={1} />
      <Text secondary>{pluralize('feature', numFeatures)}</Text>
    </FlexContainer>
    <FlexContainer>
      {/* TODO: add View Code & Preview here */}
      <Button
        basic
        iconOnly
        onClick={onClose}
        padding="0px"
        transparent
      >
        <Close muted />
      </Button>
    </FlexContainer>
  </RowCard>
);

export default SuggestionRow;
