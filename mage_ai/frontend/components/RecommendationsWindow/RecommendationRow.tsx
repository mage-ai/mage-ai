import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import SuggestionType from '@interfaces/SuggestionType';
import Text from '@oracle/elements/Text';
import { ICON_SIZE } from '@components/PipelineDetail/AddNewBlocks/index.style';
import { NewBlock } from '@oracle/icons';
import { RowStyle } from './index.style';

export type RecommendationRowProps = {
  suggestion: SuggestionType;
  onClick?: (suggestion: SuggestionType) => void;
};

function RecommendationRow({
  suggestion,
  onClick,
}: RecommendationRowProps) {
  const { action_payload: actionPayload, message, title } = suggestion || {};
  const columnsAffected = actionPayload?.action_arguments || [];

  return (
    <RowStyle onClick={() => onClick(suggestion)}>
      <FlexContainer alignItems="flex-start">
        <Spacing pr={2} pt="4px">
          <NewBlock size={ICON_SIZE} />
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
    </RowStyle>
  );
}

export default RecommendationRow;
