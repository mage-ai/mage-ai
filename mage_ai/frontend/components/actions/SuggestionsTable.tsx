import Accordion, { AccordionPanel } from '@oracle/components/Accordion';
import Spacing from '@oracle/elements/Spacing';
import SuggestionRow from './SuggestionRow';

export type SuggestionsTableProps = {
  actions: any[];
  onAddAction: (idx: number) => void;
  onRemoveAction: (idx: number) => void;
  onRemoveSuggestion: (idx: number) => void;
  suggestions: any[];
}

const SuggestionsTable = ({
  actions,
  suggestions,
  onAddAction,
  onRemoveAction,
  onRemoveSuggestion,
}: SuggestionsTableProps) => {

  const actionsEl = (
    actions.map((action, idx) => {
      const {
        title,
        action_payload: {
          action_arguments,
        },
      } = action;
      const numFeatures = action_arguments.length;

      return (
        <SuggestionRow
          idx={idx}
          key={`${idx}-${title}`}
          name={title}
          numFeatures={numFeatures}
          onClose={() => onRemoveAction(idx)}
          showIdx
        />
      );
    })
  );

  const suggestionsEl = (
    <Accordion>
      <AccordionPanel
        noBackground
        noPaddingContent
        title={`${suggestions.length} suggested actions`}
      >
        {
          suggestions.length > 0
          ?
          suggestions.map((suggestion, idx) => {
            const { action_payload: { action_arguments } } = suggestion;
            const numFeatures = action_arguments.length;

            return (
              <SuggestionRow
                idx={idx}
                key={`${idx}-${suggestion.title}`}
                link={() => onAddAction(idx)}
                name={suggestion.title}
                numFeatures={numFeatures}
                onClose={() => onRemoveSuggestion(idx)}
              />
            )
          })
          :
          <>{/* TODO: what do we render when no suggestions exist? */}</>
        }
      </AccordionPanel>
    </Accordion>
  );

  return (
    <>
      {actionsEl}
      <Spacing mt={2} />
      {suggestionsEl}
    </>
  );
}

export default SuggestionsTable;
