import { useMemo, useState, useEffect } from 'react';

import Accordion, { AccordionPanel } from '@oracle/components/Accordion';
import Spacing from '@oracle/elements/Spacing';
import SuggestionRow from './SuggestionRow';
import api from '@api';

export type SuggestionsListProps = {
  featureSet: any;
  featureSetId: string | string[];
}

function SuggestionsList({
  featureSet,
  featureSetId,
}: SuggestionsListProps) {

  const suggestionsMemo = useMemo(() => (
    (featureSet?.suggestions || [])
  ), [
    featureSet?.suggestions,
  ]);

  const actionsMemo = useMemo(() => (
    (featureSet?.pipeline?.actions || [])
  ), [
    featureSet?.pipeline?.actions,
  ]);

  const [suggestions, setSuggestions] = useState([]);
  const [actions, setActions] = useState(actionsMemo);
  const [removedSuggestions, setRemovedSuggestions] = useState([]);

  // initialize actions from backend on page load
  useEffect(() => {
    if (actionsMemo.length > 0) setActions(actionsMemo);
  }, [
    actionsMemo,
  ]);

  // updates suggestions and filters any removed or applied actions
  useEffect(() => {
    const filteredSuggestions = [...suggestionsMemo];
    removedSuggestions.forEach(i => filteredSuggestions.splice(i, 1));
    actions.forEach(({ i }) => filteredSuggestions.splice(i, 1));
    setSuggestions(filteredSuggestions);
  }, [
    actions,
    suggestionsMemo,
    removedSuggestions,
  ]);

  const addAction = i => {
    setActions(actions.concat({ i, ...suggestions[i] }));
  };

  const removeAction = i => {
    setActions(actions.filter((x, idx) => i !== idx));
  }

  const removeSuggestion = i => {
    setRemovedSuggestions(removedSuggestions.concat(i));
  };

  // update pipeline on backend
  useEffect(() => {
    if (featureSet) api.pipelines.useUpdate(featureSetId)({ actions });
  }, [
    actions,
    featureSet,
    featureSetId,
  ]);

  return (
    <>
      {
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
              onClose={() => removeAction(idx)}
              showIdx
            />
          );
        })
      }
      <Spacing mt={2} />
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
                  link={() => addAction(idx)}
                  name={suggestion.title}
                  numFeatures={numFeatures}
                  onClose={() => removeSuggestion(idx)}
                />
              )
            })
            :
            <>{/* TODO: what do we render when no suggestions exist? */}</>
          }
        </AccordionPanel>
      </Accordion>
    </>
  );
}

export default SuggestionsList;
