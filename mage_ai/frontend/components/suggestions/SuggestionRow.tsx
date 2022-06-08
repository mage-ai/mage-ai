import React, { useContext, useEffect, useMemo, useState } from 'react';
import '@uiw/react-textarea-code-editor/dist.css';
import dynamic from 'next/dynamic';
import { ThemeContext } from 'styled-components';

import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import RowCard from '@oracle/components/RowCard';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import { Close, Code } from '@oracle/icons';
import { FeatureResponseType } from '@interfaces/FeatureType';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';

export type SuggestionRowProps = {
  action: TransformerActionType;
  border?: boolean;
  features?: FeatureResponseType[];
  featureIdMapping: {
    [key: string]: number;
  };
  featureSetId?: string | number;
  idx: number;
  isLoading?: boolean;
  link?: () => void;
  onClose?: () => void;
  saveAction?: (ActionPayloadType) => void;
  showIdx?: boolean;
};

const CodeEditor = dynamic(
  () => import('@uiw/react-textarea-code-editor').then((mod) => mod.default),
  {
    ssr: false,
  },
);

const SuggestionRow = ({
  action,
  border,
  features,
  featureIdMapping,
  featureSetId,
  idx,
  isLoading,
  link,
  onClose,
  saveAction,
  showIdx,
}: SuggestionRowProps) => {
  const themeContext = useContext(ThemeContext);

  const columns = useMemo(() => features.map(({ uuid }) => uuid), [ features]);

  const {
    action_payload,
    message,
    title,
  } = action;
  const {
    action_arguments: actionArguments,
    action_code: actionCode,
    action_options: actionOptions,
  } = action_payload;

  useEffect(() => setActionPayload(action_payload), [action_payload]);

  const numFeatures = actionArguments?.length || 0;
  const numOptions = actionOptions ? Object.keys(actionOptions).length : 0;

  const [editing, setEditing] = useState(false);
  const [actionPayload, setActionPayload] = useState<ActionPayloadType>(action_payload);

  const featureLinks = actionArguments?.map((col: string, idx: number) => {
    let el;

    if (featureIdMapping?.[col]) {
      el = (
        <Link
          onClick={() => goToWithQuery({
            column: columns.indexOf(col),
          }, {
            pushHistory: true,
          })}
          preventDefault
          underline
        >
          {col}
        </Link>
      );
    } else {
      el = col;
    }

    return (
      <span
        key={col}
      >
        {el}{numFeatures >= 2 && numFeatures - 1 !== idx && ', '}
      </span>
    );
  });

  return (
    <RowCard
      border={border}
      flexStart
    >
      {link &&
        <Spacing mr={2}>
          {isLoading && <Spinner small />}

          {!isLoading && (
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
        <Text>
          <Text bold inline>
            {title}
          </Text>{actionArguments?.length && ': '}{featureLinks}
        </Text>

        {message && (
          <Text muted small>
            {message}
          </Text>
        )}

        {!message && actionOptions && (
          <FlexContainer>
            {Object.entries(actionOptions).map(([k, v], idx: number) => (
              <Text key={k} inline muted small>
                <Text inline monospace muted small>{k}</Text>: {v}{numOptions >= 2 && idx !== numOptions - 1 && <>,&nbsp;</>}
              </Text>
            ))}
          </FlexContainer>
        )}

        {actionCode && !editing && (
          <CodeEditor
            // @ts-ignore
            disabled
            // @ts-ignore
            language="python"
            padding={UNIT}
            style={{
              backgroundColor: themeContext.monotone.grey100,
              fontFamily: MONO_FONT_FAMILY_REGULAR,
              fontSize: REGULAR_FONT_SIZE,
              tabSize: 4,
            }}
            value={actionCode}
          />
        )}

        {editing &&
          <ActionForm
            actionType={actionPayload?.action_type}
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

      <FlexContainer>
        {/* TODO: add Preview here */}
        {saveAction && (
          <Button
            basic
            iconOnly
            onClick={() => setEditing(!editing)}
            padding="0px"
            transparent
          >
            <Code muted size={16} />
          </Button>
        )}
        {onClose && (
          <>
            <Spacing mr={1} />

            {isLoading && <Spinner small />}

            {!isLoading && (
              <Button
                basic
                iconOnly
                onClick={onClose}
                padding="0px"
                transparent
              >
                <Close muted />
              </Button>
            )}
          </>
        )}
      </FlexContainer>
    </RowCard>
  );
};

export default SuggestionRow;
