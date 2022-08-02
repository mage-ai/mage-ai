import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import SuggestionType from '@interfaces/SuggestionType';
import Text from '@oracle/elements/Text';

type RecommendationRowProps = {
  suggestion: SuggestionType;
  onClick?: () => void;
  selected?: boolean;
};

function RecommendationRow({
  suggestion,
  onClick,
  selected,
}: RecommendationRowProps) {
  const { action_payload: actionPayload, message, title } = suggestion || {};
  const columnsAffected = actionPayload?.action_arguments || [];

  return (
    <Spacing pb={2}>
      <FlexContainer flexDirection="column">
        <Text monospace>
          {title}
        </Text>
        <Text monospace secondary small>
          {message}
        </Text>
        <Text muted small>
          Column(s) affected: {columnsAffected.join(', ')}
        </Text>
      </FlexContainer>
    </Spacing>
  );
}

export default RecommendationRow;
