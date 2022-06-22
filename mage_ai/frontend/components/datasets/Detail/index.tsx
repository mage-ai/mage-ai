import React, {
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import NextLink from 'next/link';
import { useMutation } from 'react-query';

import ActionForm from '@components/ActionForm';
import ActionMenu from '@components/ActionForm/ActionMenu';
import ActionPayloadType, {
  ActionTypeEnum,
  ActionVariableTypeEnum,
  AxisEnum,
} from '@interfaces/ActionPayloadType';
import Button from '@oracle/elements/Button';
import ColumnListMenu from '@components/datasets/columns/ColumnListMenu';
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
import actions from '@components/ActionForm/actions';
import api from '@api';
import { AsidePopoutStyle, BEFORE_WIDTH } from '@oracle/components/Layout/MultiColumn.style';
import {
  Chat,
  Column as ColumnIcon,
  Input as InputIcon,
} from '@oracle/icons';
import { FormConfigType } from '@components/ActionForm/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { removeAtIndex } from '@utils/array';
import { setCustomCodeState } from '@storage/localStorage';

export type DatasetDetailSharedProps = {
  featureSet: FeatureSetType;
  featureSetOriginal: FeatureSetType;
  fetchFeatureSet: (arg: any) => void;
};

type DatasetDetailProps = {
  children: any;
  columnsVisible?: boolean;
  hideColumnsHeader?: boolean;
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
  hideColumnsHeader,
  mainContentRef,
  onTabClick,
  refLoadingBar,
  selectedColumnIndex,
  selectedTab,
  setErrorMessages,
  tabs,
}: DatasetDetailProps) {
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [columnListMenuVisible, setColumnListMenuVisible] = useState(false);
  const breadcrumbRef = useRef(null);

  const {
    id: featureSetId,
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
            closeAction();
            refLoadingBar?.current?.complete?.();
            setCustomCodeState({
              actionType: ActionTypeEnum.CUSTOM,
              featureSetId: String(featureSetId),
              newValue: null,
            });

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

  const onClickColumn = (col: string) => goToWithQuery({
    column: col === null ? null : columnsAll.indexOf(col),
  }, {
    pushHistory: true,
  });
  const {
    left: breadcrumbLeft,
    top: breadcrumbTop,
  } = breadcrumbRef?.current?.getBoundingClientRect?.() || {};
  const finalBreadcrumbLeftPosition = breadcrumbLeft - (columnsVisible ? BEFORE_WIDTH : 0);
  const finalBreadcrumbTopPosition = breadcrumbTop + 28; // Add line-height

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
            onClickColumn={onClickColumn}
            selectedColumn={selectedColumn}
          />
        </Spacing>
      )}
      header={
        <Spacing p={PADDING_UNITS}>
          <Spacing mb={2}>
            <FlexContainer
              justifyContent={hideColumnsHeader ? 'flex-end' : 'space-between'}
            >
              {!hideColumnsHeader &&
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
              }

              <FlexContainer alignItems="center">
                <Link
                  block
                  href="https://www.mage.ai/chat"
                  openNewWindow
                  verticalAlignContent
                >
                  <Chat primary size={UNIT * 2} />
                  &nbsp;
                  Help and support
                </Link>

                <Spacing mr={3} />

                <NextLink
                  as={`/datasets/${featureSet?.id}/export`}
                  href="/datasets/[...slug]"
                  passHref
                >
                  <Link
                    block
                    verticalAlignContent
                  >
                    <InputIcon primary size={UNIT * 2} />
                    &nbsp;
                    Export data pipeline
                  </Link>
                </NextLink>
              </FlexContainer>
            </FlexContainer>
          </Spacing>

          <FlexContainer justifyContent="space-between">
            <PageBreadcrumbs
              featureSet={featureSet}
              ref={breadcrumbRef}
              setColumnListMenuVisible={setColumnListMenuVisible}
            />
            <ColumnListMenu
              columns={columnsAll}
              featureSet={featureSet}
              left={finalBreadcrumbLeftPosition}
              onClickColumn={onClickColumn}
              setVisible={setColumnListMenuVisible}
              top={finalBreadcrumbTopPosition}
              visible={columnListMenuVisible}
            />
            <Flex>
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
                    featureSetId={String(featureSetId)}
                    features={selectedColumn ? null : featuresWithAltColType}
                    onClose={closeAction}
                    onSave={(actionPayloadOverride: ActionPayloadType) => {
                      const actionConfig: FormConfigType =
                        (actionPayload?.axis === AxisEnum.ROW ? actions.rows : actions.columns)?.[actionType];
                      const actionTitle = actionConfig?.title;

                      saveAction({
                        action_payload: {
                          ...actionPayload,
                          ...actionPayloadOverride,
                          action_type: actionType,
                        },
                        title: actionTitle,
                      });
                    }}
                    payload={actionPayload}
                    setPayload={setActionPayload}
                    shadow
                  />
                )}
              </AsidePopoutStyle>
            </Flex>
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
