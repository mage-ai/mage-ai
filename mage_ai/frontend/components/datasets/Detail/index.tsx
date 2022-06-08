import React, {
  useMemo,
  useEffect,
  useState,
} from 'react';
import NextLink from 'next/link';
import { useMutation } from 'react-query';

import ActionForm from '@components/ActionForm';
import ActionMenu from '@components/ActionForm/ActionMenu';
import ActionPayloadType, { ActionVariableTypeEnum } from '@interfaces/ActionPayloadType';
import Button from '@oracle/elements/Button';
import ColumnListSidebar from '@components/datasets/columns/ColumnListSidebar';
import FeatureSetType from '@interfaces/FeatureSetType';
import FeatureType, { ColumnTypeEnum, FeatureResponseType } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import MultiColumn from '@oracle/components/Layout/MultiColumn';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import Spacing from '@oracle/elements/Spacing';
import Suggestions from '@components/suggestions';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import api from '@api';
import { AsidePopoutStyle } from '@oracle/components/Layout/MultiColumn.style';
import { Column as ColumnIcon } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { removeAtIndex } from '@utils/array';
import { onSuccess } from '@api/utils/response';

export type DatasetDetailSharedProps = {
  featureSet: FeatureSetType;
  fetchFeatureSet: (arg: any) => void;
};

type DatasetDetailProps = {
  children: any;
  columnsVisible?: boolean;
  mainContentRef?: any;
  onTabClick?: (tab: string) => void;
  refLoadingBar?: any;
  selectedColumnIndex?: number;
  selectedTab?: string;
  setErrorMessages?: (errorMessages: string[]) => void;
  tabs?: string[];
} & DatasetDetailSharedProps;

function DatasetDetail({
  children,
  columnsVisible,
  featureSet,
  fetchFeatureSet,
  mainContentRef,
  onTabClick,
  refLoadingBar,
  selectedColumnIndex,
  selectedTab,
  setErrorMessages,
  tabs,
}: DatasetDetailProps) {
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  const {
    metadata,
    pipeline,
    suggestions: suggestionsInit,
  } = featureSet || {};

  const {
    columns: columnsAll,
  } = featureSet?.sample_data || {};
  const selectedColumn = columnsAll?.[Number(selectedColumnIndex)];

  const pipelineActions = Array.isArray(pipeline?.actions) ? pipeline?.actions : [];
  const suggestions = useMemo(
    () => selectedColumn
      ? suggestionsInit?.reduce((acc, s) => {
        const { action_payload: { action_arguments: aa } } = s;

        if (aa?.includes(selectedColumn)) {
          acc.push({
            ...s,
            action_payload: {
              ...s.action_payload,
              action_arguments: [selectedColumn],
            },
          });
        }

        return acc;
      }, [])
      : suggestionsInit,
    [
      selectedColumn,
      suggestionsInit,
    ],
  );

  const {
    column_types: columnTypes,
  } = metadata || {};
  const features: FeatureType[] = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]: [string, ColumnTypeEnum]) => ({ columnType: v, uuid: k }));
  const featuresWithAltColType: FeatureResponseType[] = features.map(({ columnType, uuid }) => ({
    column_type: columnType,
    uuid,
  }));

  const [actionPayload, setActionPayload] = useState<ActionPayloadType>(null);
  const actionType = actionPayload?.action_type;

  useEffect(() => {
    setActionPayload(null);
  }, [
    selectedColumnIndex,
    setActionPayload,
  ]);

  const [commitAction, { isLoading: isLoadingCommitAction }] = useMutation(
    api.pipelines.useUpdate(pipeline?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {
            refLoadingBar?.current?.complete?.();

            return fetchFeatureSet({
              ...featureSet,
              pipeline: response,
            });
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            refLoadingBar?.current?.complete?.();

            const arr = [];
            if (message) {
              arr.push(...message.split('\n'));
            }
            if (errors) {
              arr.push(...errors);
            }
            if (arr.length >= 1) {
              setErrorMessages?.(arr);
            }
          },
        },
      ),
    },
  );

  const beforeCommit = () => {
    setErrorMessages?.(null);
    refLoadingBar?.current?.continuousStart?.();
  };

  const saveAction = (newActionData: TransformerActionType) => {
    beforeCommit();

    const newActions = [...pipelineActions];
    if (!selectedColumn) {
      newActions.push(newActionData);
    } else {
      newActions.push({
        ...newActionData,
        action_payload: {
          ...newActionData.action_payload,
          action_arguments: [
            selectedColumn,
          ],
          action_variables: {
            [selectedColumn]: {
              [ActionVariableTypeEnum.FEATURE]: {
                column_type: columnTypes[selectedColumn],
                uuid: selectedColumn,
              },
              type: ActionVariableTypeEnum.FEATURE,
            }
          },
        },
      });
    }

    // @ts-ignore
    commitAction({
      ...pipeline,
      actions: newActions,
    });
  };
  const removeAction = (existingActionData: TransformerActionType) => {
    beforeCommit();

    const idx =
      pipelineActions.findIndex(({ id }: TransformerActionType) => id === existingActionData.id);

    // @ts-ignore
    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
  };

  const closeAction = () => setActionPayload({} as ActionPayloadType);

  return (
    <MultiColumn
      after={
        <Spacing p={PADDING_UNITS}>
          {featureSet && (
            <Suggestions
              addAction={saveAction}
              featureSet={featureSet}
              isLoading={isLoadingCommitAction}
              removeAction={removeAction}
              removeSuggestion={(action) => console.log(action)}
              suggestions={suggestions}
            />
          )}
        </Spacing>
      }
      before={columnsVisible && (
        <Spacing mt={PADDING_UNITS}>
          <ColumnListSidebar
            columns={columnsAll}
            featureSet={featureSet}
            onClickColumn={col => goToWithQuery({
              column: col === null ? null : columnsAll.indexOf(col),
            }, {
              pushHistory: true,
            })}
            selectedColumn={selectedColumn}
          />
        </Spacing>
      )}
      header={
        <Spacing p={PADDING_UNITS}>
          <Spacing mb={2}>
            <Link
              block
              noHoverUnderline
              noOutline
              onClick={() => goToWithQuery({
                show_columns: columnsVisible ? 0 : 1,
              })}
              preventDefault
            >
              <FlexContainer alignItems="center">
                <ColumnIcon
                  primary={!columnsVisible}
                  size={UNIT * 2}
                />

                <Spacing mr={1} />

                <Text bold primary={!columnsVisible}>
                  {columnsVisible ? 'Hide columns' : 'Show columns'}
                </Text>
              </FlexContainer>
            </Link>
          </Spacing>

          <FlexContainer justifyContent="space-between">
            <PageBreadcrumbs featureSet={featureSet} />

            <FlexContainer justifyContent="flex-end">
              <Flex flexDirection="column">
                <NextLink
                  as={`/datasets/${featureSet?.id}/export`}
                  href="/datasets/[...slug]"
                  passHref
                >
                  <Link block>
                    Export data pipeline
                  </Link>
                </NextLink>

                <Spacing mt={2}>
                  <Button
                    fullWidth
                    onClick={() => setActionMenuVisible(true)}
                    primary
                  >
                    New action
                  </Button>

                  <ActionMenu
                    columnOnly={!!selectedColumn}
                    setActionPayload={setActionPayload}
                    setVisible={setActionMenuVisible}
                    visible={actionMenuVisible}
                  />
                  <AsidePopoutStyle>
                    {actionType && (
                      <ActionForm
                        actionType={actionType}
                        axis={actionPayload?.axis}
                        currentFeature={selectedColumn
                          ? {
                            columnType: columnTypes[selectedColumn],
                            uuid: selectedColumn,
                          }
                          : null
                        }
                        features={selectedColumn ? null : featuresWithAltColType}
                        onClose={closeAction}
                        onSave={(actionPayloadOverride: ActionPayloadType) => {
                          saveAction({
                            action_payload: {
                              ...actionPayload,
                              ...actionPayloadOverride,
                              action_type: actionType,
                            },
                          });
                          closeAction();
                        }}
                        payload={actionPayload}
                        setPayload={setActionPayload}
                        shadow
                      />
                    )}
                  </AsidePopoutStyle>
                </Spacing>
              </Flex>
            </FlexContainer>
          </FlexContainer>
        </Spacing>
      }
      mainContentRef={mainContentRef}
      onTabClick={onTabClick}
      selectedTab={selectedTab}
      tabs={tabs}
    >
      <Spacing p={PADDING_UNITS}>
        {children}
      </Spacing>
    </MultiColumn>
  );
}

export default DatasetDetail;
