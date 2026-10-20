import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from 'styled-components';

import ActionForm from '@components/ActionForm';
import ActionPayloadType, { ActionStatusEnum, ActionTypeEnum } from '@interfaces/ActionPayloadType';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import RowCard from '@oracle/components/RowCard';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import { ArrowDown, ArrowUp, Close, Edit, PreviewOpen } from '@oracle/icons';
import { FeatureResponseType } from '@interfaces/FeatureType';
import { TABS_QUERY_PARAM, TAB_DATA } from '@components/datasets/overview/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';

export type SuggestionRowProps = {
  action: TransformerActionType;
  border?: boolean;
  features?: FeatureResponseType[];
  featureIdMapping: {
    [key: string]: number;
  };
  idx: number;
  isLoading?: boolean;
  link?: () => void;
  onClose?: () => void;
  saveAction?: (ActionPayloadType) => void;
  setSuggestionPreviewIdx?: (idx: number) => void;
  showIdx?: boolean;
  suggestionPreviewIdx?: number;
};

const ICON_SIZE = UNIT * 2;

const SuggestionRow = ({
  action,
  features,
  featureIdMapping,
  idx,
  isLoading,
  link,
  onClose,
  saveAction,
  setSuggestionPreviewIdx,
  showIdx,
  suggestionPreviewIdx,
}: SuggestionRowProps) => {
  const themeContext = useContext(ThemeContext);

  const columns = useMemo(() => features.map(({ uuid }) => uuid), [ features]);

  const {
    action_payload,
    message,
    preview_results,
    status,
    title,
  } = action;
  const {
    action_arguments: actionArguments,
    action_code: actionCode,
    action_options: actionOptions,
    action_type: actionType,
  } = action_payload;
  const previewRowIndexes = preview_results?.removed_row_indices || [];

  useEffect(() => setActionPayload(action_payload), [action_payload]);

  const numFeatures = actionArguments?.length || 0;
  const numOptions = actionOptions ? Object.keys(actionOptions).length : 0;

  const [editing, setEditing] = useState(false);
  const [displayAllCols, setDisplayAllCols] = useState(false);
  const [actionPayload, setActionPayload] = useState<ActionPayloadType>(action_payload);

  const DISPLAY_COLS_NUM = 5;

  const displayArguments = displayAllCols ? actionArguments : actionArguments?.slice(0, DISPLAY_COLS_NUM);
  const featureLinks = displayArguments?.map((col: string) => (
    <span key={col}>
      {col in featureIdMapping ?
        <Link
          noOutline
          onClick={() => goToWithQuery({
            column: columns.indexOf(col),
          }, {
            pushHistory: true,
          })}
          preventDefault
          secondary
        >
          <Text
            maxWidth={30 * UNIT}
            monospace
            secondary
            title={col}
          >
            {col}
          </Text>
        </Link>
        :
        <Text
          color={themeContext.monotone.grey400}
          maxWidth={30 * UNIT}
          monospace
          title={col}
        >
          {col}
        </Text>
      }
    </span>
  ));

  return (
    <RowCard
      flexStart
    >
      {link &&
        <Spacing mr={2}>
          {isLoading && <Spinner small />}

          {!isLoading && !editing && (
            <Link
              bold
              noHoverUnderline
              onClick={link}
              preventDefault
            >
              Apply
            </Link>
          )}
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
        <FlexContainer justifyContent="space-between">
          <Text bold inline>
            {title}
            {numFeatures > 0 && ': '}
          </Text>
          <Flex>
            {(actionType === ActionTypeEnum.FILTER
              && status !== ActionStatusEnum.COMPLETED
              && previewRowIndexes.length > 0) &&
              <Button
                basic
                iconOnly
                noPadding
                onClick={() => {
                  if (suggestionPreviewIdx === idx) {
                    setSuggestionPreviewIdx(null);
                  } else {
                    setSuggestionPreviewIdx(idx);
                    goToWithQuery({
                      [TABS_QUERY_PARAM]: TAB_DATA,
                    }, {
                      pushHistory: true,
                    });
                  }}
                }
                title="Preview"
              >
                <PreviewOpen
                  highlight={idx === suggestionPreviewIdx}
                  muted
                  size={ICON_SIZE}
                />
              </Button>
            }
            <Spacing pr={1} />
            {saveAction && (
              <Button
                basic
                iconOnly
                noPadding
                onClick={() => setEditing(!editing)}
                title="Edit"
              >
                <Edit
                  black={editing}
                  muted
                  size={ICON_SIZE}
                />
              </Button>
            )}
          </Flex>
        </FlexContainer>

        {featureLinks}
        {numFeatures > DISPLAY_COLS_NUM &&
          <Link
            noOutline
            onClick={() => setDisplayAllCols(!displayAllCols)}
            secondary
          >
            <Text bold secondary>
              {displayAllCols
                ?
                  <>
                    <ArrowUp secondary size={10} />&nbsp;
                    Show less
                  </>
                :
                  <>
                    <ArrowDown secondary size={10} />&nbsp;
                    {numFeatures - DISPLAY_COLS_NUM} more
                  </>
              }
            </Text>
          </Link>
        }

        {message && (
          <Text muted small>
            {message}
          </Text>
        )}

        {!message && actionOptions && (
          <FlexContainer>
            {Object.entries(actionOptions).map(([k, v], idx: number) => (
              <Text inline key={k} muted small>
                <Text
                  inline monospace muted small
                >
                  {k}
                </Text>: {v}{numOptions >= 2 && idx !== numOptions - 1 && <>,&nbsp;</>}
              </Text>
            ))}
          </FlexContainer>
        )}

        {actionCode && !editing && (
          <CodeEditor
            language="python"
            value={actionCode}
          />
        )}

        {editing &&
          <ActionForm
            actionType={actionType}
            axis={actionPayload?.axis}
            features={features}
            noBorder
            noHeader
            onSave={(actionPayloadOverride: ActionPayloadType) => saveAction({
              action_payload: {
                ...actionPayload,
                ...actionPayloadOverride,
              },
            })}
            payload={actionPayload}
            setPayload={setActionPayload}
          />
        }
      </Flex>

      {onClose && (
        <>
          <Spacing mr={1} />

          {isLoading && <Spinner small />}

          {!isLoading && (
            <Button
              basic
              iconOnly
              noPadding
              onClick={onClose}
              transparent
            >
              <Close muted />
            </Button>
          )}
        </>
      )}
    </RowCard>
  );
};

export default SuggestionRow;
