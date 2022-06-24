import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import Accordion, { AccordionPanel } from '@oracle/components/Accordion';
import Button from '@oracle/elements/Button';
import CsvExport from '@oracle/components/CsvExport';
import FeatureSetType, { ColumnFeatureSetType } from '@interfaces/FeatureSetType';
import Spacing from '@oracle/elements/Spacing';
import SuggestionRow from './SuggestionRow';
import SuggestionType from '@interfaces/SuggestionType';
import TransformerActionType from '@interfaces/TransformerActionType';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getFeatureIdMapping } from '@utils/models/featureSet';
import { parseError } from '@api/utils/response';

type SuggestionsProps = {
  addAction: (action: TransformerActionType) => void;
  featureSet: FeatureSetType | ColumnFeatureSetType;
  isLoading?: boolean;
  removeAction: (action: TransformerActionType) => void;
  removeSuggestion?: (action: TransformerActionType) => void;
  setSuggestionPreviewIdx?: (idx: number) => void;
  suggestionPreviewIdx?: number;
  suggestions: SuggestionType[];
};

function Suggestions({
  addAction,
  featureSet,
  isLoading,
  removeAction,
  setSuggestionPreviewIdx,
  suggestionPreviewIdx,
  suggestions,
}: SuggestionsProps) {
  const csvLink = useRef(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadedFeatureSet, setDownloadedFeatureSet] = useState(null);

  const {
    insights,
    metadata,
    pipeline,
  } = featureSet || {};
  const {
    actions,
  } = pipeline || {};
  const features = insights?.[0]?.map(({ feature }) => feature) || [];
  const numberOfActions = useMemo(() => Array.isArray(actions) ? actions?.length : 0, [actions]);
  const featureIdMapping = useMemo(() => getFeatureIdMapping(featureSet), [featureSet]);

  const hasActions = Array.isArray(actions) && actions?.length >= 1;

  const parseErrorFromResponse = (res) => {
    const { code, messages } = parseError(res);
    alert(messages?.[0] || code);
  };
  const errorOrSuccess = (response) => {
    if (response.error) {
      parseErrorFromResponse(response);
    } else if (response.data) {
      setDownloadedFeatureSet(response.data);
      setDownloadReady(true);
    } else {
      alert('CSV download failed, please try again.');
    }
  };
  const [downloadDataset, { isLoading: isLoadingDownload }] = useMutation(
    api.downloads.feature_sets.useCreate(featureSet?.id),
    {
      onSuccess: errorOrSuccess,
    },
  );

  useEffect(() => {
    if (csvLink?.current && downloadReady) {
      csvLink.current.click();
      setDownloadReady(false);
    }
  }, [
    downloadReady,
    setDownloadReady,
  ]);

  const fileName = metadata?.name?.replace(/ /g, '_') || 'cleaned_dataset';

  return (
    <>
      {hasActions && (
        <Spacing mb={2}>
          {actions?.map((action, idx) => {
            const { title, message } = action;

            return (
              <Spacing
                key={`${idx}-${message}-${title}`}
                mt={idx >= 1 ? 1 : 0}
              >
                <SuggestionRow
                  action={action}
                  border
                  featureIdMapping={featureIdMapping}
                  features={features}
                  idx={idx}
                  isLoading={isLoading}
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

      <Spacing mb={PADDING_UNITS}>
        {downloadedFeatureSet && (
          <CsvExport
            csvData={downloadedFeatureSet}
            filename={`${fileName}.csv`}
            linkRef={csvLink}
          />
        )}

        <Button
          loading={isLoading || isLoadingDownload}
          onClick={() => downloadDataset()}
        >
          Download dataset
        </Button>
      </Spacing>

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
                features={features}
                idx={idx}
                isLoading={isLoading}
                key={`${idx}-${suggestion.title}`}
                link={() => addAction(suggestion)}
                saveAction={addAction}
                setSuggestionPreviewIdx={setSuggestionPreviewIdx}
                suggestionPreviewIdx={suggestionPreviewIdx}
              />
            ))}
          </AccordionPanel>
        </Accordion>
      )}
    </>
  );
}

export default Suggestions;
