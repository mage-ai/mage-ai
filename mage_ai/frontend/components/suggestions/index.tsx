import { useMemo } from 'react';

import Accordion, { AccordionPanel } from '@oracle/components/Accordion';
import FeatureSetType, { ColumnFeatureSetType } from '@interfaces/FeatureSetType';
import Spacing from '@oracle/elements/Spacing';
import SuggestionRow from './SuggestionRow';
import SuggestionType from '@interfaces/SuggestionType';
import TransformerActionType from '@interfaces/TransformerActionType';
import { getFeatureIdMapping } from '@utils/models/featureSet';

type SuggestionsProps = {
  addAction: (action: TransformerActionType) => void;
  featureSet: FeatureSetType | ColumnFeatureSetType;
  removeAction: (action: TransformerActionType) => void;
  removeSuggestion?: (action: TransformerActionType) => void;
  suggestions: SuggestionType[];
};

function Suggestions({
  addAction,
  featureSet,
  removeAction,
  removeSuggestion,
  suggestions,
}: SuggestionsProps) {
  const {
    insights,
    pipeline,
  } = featureSet || {};
  const {
    actions,
  } = pipeline || {};
  const features = insights?.[0]?.map(({ feature }) => feature) || [];
  const numberOfActions = useMemo(() => Array.isArray(actions) ? actions?.length : 0, [actions]);
  const featureIdMapping = useMemo(() => getFeatureIdMapping(featureSet), [featureSet]);

  const hasActions = Array.isArray(actions) && actions?.length >= 1;

  return (
    <>
      {hasActions && (
        <Spacing mb={2}>
          {actions?.map((action, idx) => {
            const { title } = action;

            return (
              <Spacing
                key={`${idx}-${title}`}
                mt={idx >= 1 ? 1 : 0}
              >
                <SuggestionRow
                  action={action}
                  border
                  featureIdMapping={featureIdMapping}
                  featureSetId={featureSet?.id}
                  features={features}
                  idx={idx}
                  onClose={numberOfActions - 1 === idx
                    ? () => removeAction(action)
                    : null
                  }
                  showIdx
                />
              </Spacing>
            );
          })}
        </Spacing>
      )}

      {suggestions?.length >= 1 && (
        <Accordion
          highlighted
          visibleMapping={{ 0: true }}
        >
          <AccordionPanel
            maxHeight={99999}
            noBackground
            noPaddingContent
            title={`${suggestions.length} suggested actions`}
          >
            {suggestions.map((suggestion, idx) => (
              <SuggestionRow
                action={suggestion}
                featureIdMapping={featureIdMapping}
                featureSetId={featureSet?.id}
                features={features}
                idx={idx}
                key={`${idx}-${suggestion.title}`}
                link={() => addAction(suggestion)}
                saveAction={addAction}
              />
            ))}
          </AccordionPanel>
        </Accordion>
      )}
    </>
  );
}

export default Suggestions;
