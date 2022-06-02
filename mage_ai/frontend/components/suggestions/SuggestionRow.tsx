import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import RowCard from '@oracle/components/RowCard';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import { Close } from '@oracle/icons';
import { pluralize } from '@utils/string';

export type SuggestionRowProps = {
  action: TransformerActionType;
  border?: boolean;
  idx: number;
  link?: () => void;
  // name: string;
  // numFeatures: number;
  onClose: () => void;
  showIdx?: boolean;
};

const SuggestionRow = ({
  action,
  border,
  idx,
  link,
  // name,
  // numFeatures,
  onClose,
  showIdx,
}: SuggestionRowProps) => {
  const {
    action_payload: {
      action_arguments: actionArguments,
    },
    message,
    title,
  } = action;

  const numFeatures = actionArguments?.length || 0;

  return (
    <RowCard
      border={border}
      // columnFlexNumbers={[0.5, 0.5, 12]}
      flexStart
    >
      {link &&
        <Spacing mr={2}>
          <Link
            bold
            noHoverUnderline
            onClick={link}
          >
            Apply
          </Link>
        </Spacing>
      }

      {showIdx && (
        <Spacing mr={2}>
          <Text>{idx + 1}</Text>
        </Spacing>
      )}

      <Flex
        flex={1}
        flexDirection="column"
      >
        <div>
          <Text>
            <Text bold inline>
              {title}
            </Text>{actionArguments?.length && `: ${actionArguments.join(', ')}`}
          </Text>
        </div>

        <Text muted small>
          {message}
        </Text>
      </Flex>

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
}

export default SuggestionRow;
