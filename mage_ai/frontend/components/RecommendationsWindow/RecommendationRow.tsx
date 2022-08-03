import Checkbox from '@oracle/elements/Checkbox';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import SuggestionType from '@interfaces/SuggestionType';
import Text from '@oracle/elements/Text';

export type RecommendationRowProps = {
  last?: boolean;
  suggestion: SuggestionType;
  onClick?: () => void;
  selected?: boolean;
};

function RecommendationRow({
  last,
  suggestion,
  onClick,
  selected,
}: RecommendationRowProps) {
  const { action_payload: actionPayload, message, title } = suggestion || {};
  const columnsAffected = actionPayload?.action_arguments || [];

  return (
    <Spacing pb={last ? 0 : 2}>
      <FlexContainer alignItems="flex-start">
        <Spacing pr={2} pt="4px">
          <Checkbox
            checked={selected}
            onClick={onClick}
          />
        </Spacing>
        <Flex flexDirection="column">
          <Text monospace>
            {title}
          </Text>
          <Text monospace secondary small>
            {message}
          </Text>
          <Text muted small>
            Columns affected: {columnsAffected.join(', ')}
          </Text>
        </Flex>
      </FlexContainer>
    </Spacing>
  );
}

export default RecommendationRow;
