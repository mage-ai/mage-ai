import { parse, stringify } from 'yaml';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockLanguageEnum, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Check, Close } from '@oracle/icons';
import { CodeEditorStyle} from '@components/IntegrationPipeline/index.style';
import {
  ConfigurationDataIntegrationInputsType,
  ConfigurationDataIntegrationType,
} from '@interfaces/ChartBlockType';
import { ErrorRunTimeProps } from '@context/Error/ErrorContext';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PlugAPI } from '@oracle/icons';
import { SubTabEnum } from './constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onSuccess } from '@api/utils/response';

export type CredentialsProps = {
  onChangeCodeBlock?: (type: string, uuid: string, value: string) => void;
};

type CredentialsInternalProps = {
  block: BlockType;
  blockUpstreamBlocks: BlockType[];
  dataIntegrationConfiguration: ConfigurationDataIntegrationType;
  pipeline: PipelineType;
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setSelectedSubTab: (subTab: SubTabEnum) => void;
  showError: (opts: ErrorRunTimeProps) => void;
} & CredentialsProps;

function Credentials({
  block,
  blockUpstreamBlocks,
  dataIntegrationConfiguration,
  onChangeCodeBlock,
  pipeline,
  savePipelineContent,
  setSelectedSubTab,
  showError,
}: CredentialsInternalProps) {
  const {
    content: blockContent,
    language: blockLanguage,
    type: blockType,
    uuid: blockUUID,
  } = block || {};
  const { uuid: pipelineUUID } = pipeline || {};

  const [configIsInvalid, setConfigIsInvalid] = useState<boolean>(false);
  const [blockConfigString, setBlockConfigString] = useState<string>(null);
  const blockContentParsed: {
    [key: string]: string | number;
  } = useMemo(() => {
    if (BlockLanguageEnum.YAML === blockLanguage && blockContent) {
      return parse(blockContent);
    }

    return {};
  }, [
    blockContent,
    blockLanguage,
  ]);

  useEffect(() => {
    if (blockContentParsed && !blockConfigString) {
      setBlockConfigString(stringify(blockContentParsed?.config));
    }
  }, [
    blockConfigString,
    blockContentParsed,
  ]);

  const [connectionSuccessful, setConnectionSuccessful] = useState<boolean>(false);
  const [
    createTestConnection, {
      isLoading: isLoadingTestConnection,
    }]: [any, { isLoading: boolean }] = useMutation(
    api.integration_sources.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response,
        {
          callback: (resp) => {
            const {
              integration_source: integrationSource,
            } = resp;

            if (integrationSource?.error_message) {
              showError({
                response: {
                  error: {
                    exception: integrationSource?.error_message,
                  },
                },
              });
            } else if (integrationSource?.success) {
              setConnectionSuccessful(true);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const testConnection =
    useCallback(() => savePipelineContent().then(() => createTestConnection({
      integration_source: {
        action_type: 'test_connection',
        block_uuid: blockUUID,
        pipeline_uuid: pipelineUUID,
      },
    })),
    [
      blockUUID,
      createTestConnection,
      pipelineUUID,
      savePipelineContent,
    ]);

  const codeEl = useMemo(() => {
    if (BlockLanguageEnum.YAML === blockLanguage) {
      return (
        <CodeEditorStyle>
          <CodeEditor
            autoHeight
            language={blockLanguage}
            onChange={(val: string) => {
              setBlockConfigString(val);

              try {
                const valParsed = parse(val);
                const content = stringify({
                  ...blockContentParsed,
                  config: valParsed,
                });
                onChangeCodeBlock(blockType, blockUUID, content);
                setConfigIsInvalid(false);
              } catch {
                setConfigIsInvalid(true);
              }
            }}
            tabSize={2}
            value={blockConfigString || undefined}
            width="100%"
          />
        </CodeEditorStyle>
      );
    } else if (BlockLanguageEnum.PYTHON === blockLanguage) {
      return (
        <CodeEditorStyle>
          <CodeEditor
            autoHeight
            language={blockLanguage}
            onChange={(val: string) => {
              onChangeCodeBlock?.(blockType, blockUUID, val);
            }}
            tabSize={4}
            value={blockContent}
            width="100%"
          />
        </CodeEditorStyle>
      );
    }
  }, [
    blockConfigString,
    blockContent,
    blockContentParsed,
    blockLanguage,
    blockType,
    blockUUID,
  ]);

  const inputsBlocks = useMemo(() => {
    const inputs = dataIntegrationConfiguration?.inputs || {};

    return blockUpstreamBlocks?.reduce((acc, b) => {
      const {
        uuid,
      } = b;
      const input = inputs?.[uuid];
      if (!input) {
        return acc;
      }

      return acc.concat({
        block: b,
        input,
      })
    }, []);
  }, [
    blockUpstreamBlocks,
    dataIntegrationConfiguration,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Button
            beforeIcon={<PlugAPI success />}
            loading={isLoadingTestConnection}
            onClick={() => {
              setConnectionSuccessful(false);
              testConnection();
            }}
            secondary
            compact
          >
            Test connection
          </Button>

          {connectionSuccessful && (
            <>
              <Spacing mr={PADDING_UNITS} />

              <FlexContainer alignItems="center">
                <Circle
                  size={UNIT * 1}
                  success
                />

                <Spacing mr={1} />

                <Text success>
                  Connection successful
                </Text>
              </FlexContainer>
            </>
          )}
        </FlexContainer>
      </Spacing>

      <Divider light />

      <Spacing p={PADDING_UNITS}>
        <Text bold default large>
          Inputs from upstream blocks
        </Text>

        {inputsBlocks?.length === 0 && (
          <Spacing mt={1}>
            <Text muted>
              No inputs are selected.
              Toggle the upstream blocks in the <Link
                bold
                onClick={() => setSelectedSubTab(SubTabEnum.UPSTREAM_BLOCK_SETTINGS)}
                preventDefault
              >
                Upstream block settings
              </Link> to enable its output data as an input.
            </Text>
          </Spacing>
        )}
      </Spacing>

      {inputsBlocks?.length >= 1 && (
        <Table
          columnFlex={[1, null, 1, null, null]}
          columns={[
            {
              uuid: 'Block',
            },
            {
              center: true,
              uuid: 'Catalog',
            },
            {
              center: true,
              uuid: 'Streams',
            },
            {
              center: true,
              uuid: 'Argument shape',
            },
            {
              center: true,
              uuid: 'Order',
            },
          ]}
          rows={inputsBlocks?.map(({
            block: {
              color,
              type: bType,
              uuid,
            },
            input: {
              catalog,
              streams,
            },
          }, idx: number) => {
            const hasStreams = streams?.length >= 1;
            const {
              accent,
            } = getColorsForBlockType(bType, {
              blockColor: color,
            });

            return [
              <Text color={accent} key={`block-${uuid}`} monospace>
                {uuid}
              </Text>,
              <FlexContainer justifyContent="center" key={`catalog-${uuid}`}>
                {catalog
                  ? <Check success />
                  : <Close muted />
                }
              </FlexContainer>,
              <FlexContainer justifyContent="center" key={`selected-streams-${uuid}`}>
                {!hasStreams && <Close key={`catalog-${uuid}`} muted />}
                {hasStreams && streams?.includes(uuid)
                  ? <Check success />
                  : (
                    <Text center default monospace small>
                      {streams?.join(', ')}
                    </Text>
                  )
                }
              </FlexContainer>,
              <Text center default key={`shape-${uuid}`} monospace>
                {catalog && !hasStreams && 'Dict'}
                {!catalog && hasStreams && 'Union[Dict, pd.DataFrame]'}
                {catalog && hasStreams && 'Tuple[Union[Dict, pd.DataFrame], Dict]'}
              </Text>,
              <Text center default key={`position-${uuid}`} monospace>
                {idx}
              </Text>,
            ];
          })}
        />
      )}

      {configIsInvalid && (
        <>
          <Divider light />
          <Spacing p={PADDING_UNITS}>
            <Spacing mb={1}>
              <Headline danger level={5}>
                ERROR
              </Headline>
            </Spacing>
            <Text muted>
              The credentials configuration is formatted incorrectly
              for the language {LANGUAGE_DISPLAY_MAPPING[blockLanguage]}.
              The formatting must be fixed before the credentials configuration can be saved.
            </Text>
          </Spacing>
        </>
      )}
      {codeEl}
    </>
  );
}

export default Credentials;
