import React, { useContext } from 'react';
import '@uiw/react-textarea-code-editor/dist.css';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
import { ThemeContext } from 'styled-components';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import RowCard from '@oracle/components/RowCard';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import { Close } from '@oracle/icons';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';
import { pluralize } from '@utils/string';

export type SuggestionRowProps = {
  action: TransformerActionType;
  border?: boolean;
  featureIdMapping: {
    [key: string]: number;
  };
  featureSetId?: string;
  idx: number;
  link?: () => void;
  onClose?: () => void;
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
  featureIdMapping,
  featureSetId,
  idx,
  link,
  onClose,
  showIdx,
}: SuggestionRowProps) => {
  const themeContext = useContext(ThemeContext);

  const {
    action_payload: {
      action_arguments: actionArguments,
      action_code: actionCode,
      action_options: actionOptions,
    },
    message,
    title,
  } = action;

  const numFeatures = actionArguments?.length || 0;
  const numOptions = actionOptions ? Object.keys(actionOptions).length : 0;

  const featureLinks = actionArguments?.map((col: string, idx: number) => {
    let el;

    if (featureIdMapping?.[col]) {
      el = (
        <NextLink
          href="/datasets/[...slug]"
          as={`/datasets/${featureSetId}/features/${featureIdMapping[col]}`}
          passHref
        >
          <Link
            underline
          >
            {col}
          </Link>
        </NextLink>
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
          <Link
            bold
            noHoverUnderline
            onClick={link}
            preventDefault
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
            </Text>{actionArguments?.length && ': '}{featureLinks}
          </Text>
        </div>

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

        {actionCode && (
          <CodeEditor
            // @ts-ignore
            disabled
            // @ts-ignore
            language="python"
            padding={UNIT * 1}
            style={{
              backgroundColor: themeContext.monotone.grey100,
              fontFamily: MONO_FONT_FAMILY_REGULAR,
              fontSize: REGULAR_FONT_SIZE,
              tabSize: 4,
            }}
            value={actionCode}
          />
        )}
      </Flex>

      <FlexContainer>
        {/* TODO: add View Code & Preview here */}
        {onClose && (
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
        {!onClose && (
          <Spacing p={1} />
        )}
      </FlexContainer>
    </RowCard>
  );
};

export default SuggestionRow;
