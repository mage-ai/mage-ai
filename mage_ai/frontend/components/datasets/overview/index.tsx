import React, {
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import LoadingBar from 'react-top-loading-bar';
import Router from 'next/router';
import { useMutation } from 'react-query';

import ActionDropdown from '@components/ActionForm/ActionDropdown';
import ActionForm from '@components/ActionForm';
import ActionPayloadType, { ActionVariableTypeEnum } from '@interfaces/ActionPayloadType';
import BaseTable from '@oracle/components/Table/BaseTable';
import ColumnAnalysis from '@components/datasets/Insights/ColumnAnalysis';
import ColumnListSidebar from '@components/datasets/columns/ColumnListSidebar';
import ColumnReports from '@components/datasets/columns/ColumnReports';
import DataTable from '@components/DataTable';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FeatureSetType from '@interfaces/FeatureSetType';
import FeatureType, { ColumnTypeEnum, FeatureResponseType } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Link from '@oracle/elements/Link';
import MultiColumn from '@oracle/components/Layout/MultiColumn';
import Overview from '@components/datasets/Insights/Overview';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Suggestions from '@components/suggestions';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import api from '@api';
import light from '@oracle/styles/themes/light';
import { AsidePopoutStyle } from '@oracle/components/Layout/MultiColumn.style';
import { Column as ColumnIcon } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  createMetricsSample,
  createStatisticsSample,
} from './utils';
import { deserializeFeatureSet } from '@utils/models/featureSet';
import { goToWithQuery } from '@utils/routing';
import { greaterThan, lessThan, removeAtIndex } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';

export const TABS_QUERY_PARAM = 'tabs[]';
export const SHOW_COLUMNS_QUERY_PARAM = 'show_columns';

export const TAB_REPORTS = 'Reports';
const TAB_VISUALIZATIONS = 'Visualizations';
const TAB_DATA = 'Data';
const TABS_IN_ORDER = [
  TAB_REPORTS,
  TAB_VISUALIZATIONS,
  TAB_DATA,
];

type DatasetOverviewProps = {
  featureSet: FeatureSetType;
  fetchFeatureSet: (arg: any) => void;
  selectedColumnIndex?: number;
};

function DatasetOverview({
  featureSet: featureSetRaw,
  fetchFeatureSet,
  selectedColumnIndex,
}: DatasetOverviewProps) {
  const refLoadingBar = useRef(null);
  const mainContentRef = useRef(null);

  const [errorMessages, setErrorMessages] = useState(null);
  const qFromUrl = queryFromUrl();
  const {
    show_columns: showColumnsFromUrl,
  } = qFromUrl;
  const tabsFromUrlInit = qFromUrl[TABS_QUERY_PARAM];
  const tabsFromUrl = tabsFromUrlInit
    ? Array.isArray(tabsFromUrlInit) ? tabsFromUrlInit : [tabsFromUrlInit]
    : [];

  const setTabs = useCallback((newTab: string, pushHistory: boolean = true) => {
    goToWithQuery({
      [TABS_QUERY_PARAM]: newTab,
    }, {
      pushHistory,
    });
  }, [tabsFromUrl]);

  useEffect(() => {
    if (tabsFromUrl.length === 0) {
      // @ts-ignore
      setTabs(TAB_REPORTS, false);
    }
  }, [setTabs, tabsFromUrl]);

  const featureSet = featureSetRaw ? deserializeFeatureSet(featureSetRaw) : {};
  const {
    insights,
    metadata,
    pipeline,
    statistics,
    suggestions: suggestionsInit,
  } = featureSet || {};

  const {
    columns: columnsAll,
    rows: rowsAll,
  } = featureSet?.sample_data || {};
  const selectedColumn = columnsAll?.[Number(selectedColumnIndex)];
  const columns = useMemo(() => selectedColumn ? [selectedColumn] : columnsAll, [
    columnsAll,
    selectedColumn,
  ]);
  const indexOfValueForColumn = columnsAll?.indexOf(selectedColumn);
  const rows = useMemo(
    () => selectedColumn ? rowsAll?.map(row => [row[indexOfValueForColumn]]) : rowsAll,
    [
      selectedColumn,
      indexOfValueForColumn,
      rowsAll,
    ],
  );

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
  const {
    header_types: headerTypes,
  } = featureSet?.metadata?.column_types || {};
  const features: FeatureType[] = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]: [string, ColumnTypeEnum]) => ({ columnType: v, uuid: k }));
  const featuresWithAltColType: FeatureResponseType[] = features.map(({ columnType, uuid }) => ({
    column_type: columnType,
    uuid,
  }));

  const columnHeaderSample = columns?.map((header:any) => ({
    label: header,
  }));
  const metricSample = statistics ? createMetricsSample(statistics, columnTypes) : null;
  const statSample = (statistics && columnTypes)
    ? createStatisticsSample(statistics, columnTypes)
    : null;

  const viewColumns = (e) => {
    const pathname = window?.location?.pathname;
    e.preventDefault();
    Router.push(`${pathname}/features`);
  };

  const insightsOverview = selectedColumn
    ? (insights?.[0] || []).find(({ feature }) => feature.uuid === selectedColumn)
    : insights?.[1] || {};

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
            refLoadingBar.current.complete();

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
            refLoadingBar.current.complete();

            const arr = [];
            if (message) {
              arr.push(...message.split('\n'));
            }
            if (errors) {
              arr.push(...errors);
            }
            if (arr.length >= 1) {
              setErrorMessages(arr);
            }
          },
        },
      ),
    },
  );

  const beforeCommit = () => {
    setErrorMessages(null);
    refLoadingBar.current.continuousStart();
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

    commitAction({
      ...pipeline,
      actions: newActions,
    });
  };
  const removeAction = (existingActionData: TransformerActionType) => {
    beforeCommit();

    const idx =
      pipelineActions.findIndex(({ id }: TransformerActionType) => id === existingActionData.id);

    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
  };

  const closeAction = () => setActionPayload({} as ActionPayloadType);

  const columnsVisible = Number(showColumnsFromUrl) === 1;

  const {
    height: dataTableHeightInit,
    width: dataTableWidthInit,
  } = mainContentRef?.current?.getBoundingClientRect?.() || {};

  const paddingAndBorder = (PADDING_UNITS * UNIT * 2) + (1 * 2);
  let dataTableHeight = 0;
  let dataTableWidth = 0;
  if (dataTableHeightInit) {
    dataTableHeight = dataTableHeightInit - (paddingAndBorder + 2);
  }
  if (dataTableWidthInit) {
    dataTableWidth = dataTableWidthInit - paddingAndBorder;
  }

  return (
    <Layout
      centerAlign
      footer={<Spacing mt={UNIT} />}
      fullWidth
      pageTitle={metadata?.name || 'Dataset Overview'}
    >
      <MultiColumn
        after={
          <Spacing p={PADDING_UNITS}>
            {featureSet && (
              <Suggestions
                addAction={saveAction}
                featureSet={featureSet}
                isLoading={isLoadingCommitAction}
                suggestions={suggestions}
                removeAction={removeAction}
                removeSuggestion={(action) => console.log(action)}
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

              <div>
                <ActionDropdown
                  actionType={actionType}
                  columnOnly={!!selectedColumn}
                  setActionPayload={setActionPayload}
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
              </div>
            </FlexContainer>
          </Spacing>
        }
        mainContentRef={mainContentRef}
        onTabClick={t => setTabs(t)}
        selectedTab={tabsFromUrl?.[0]}
        tabs={TABS_IN_ORDER}
      >
        <Spacing p={PADDING_UNITS}>
          <LoadingBar
            className="loading-bar"
            color={light.brand.fire500}
            containerStyle={{
              position: 'relative',
            }}
            shadow={false}
            ref={refLoadingBar}
          />

          {errorMessages?.length >= 1 && (
            <Spacing mb={5}>
              <Text bold>
                Errors
              </Text>
              {errorMessages?.map((msg: string) => (
                <Text key={msg} monospace xsmall>
                  {msg}
                </Text>
              ))}
            </Spacing>
          )}

          {tabsFromUrl?.includes(TAB_REPORTS) && (
            <>
              {selectedColumn && (
                <ColumnReports
                  column={selectedColumn}
                  featureSet={featureSet}
                />
              )}

              {!selectedColumn && (
                <>
                  <FlexContainer justifyContent={'center'}>
                    <Flex flex={1}>
                      {metricSample && (
                        <SimpleDataTable
                          columnFlexNumbers={[2, 1, 2 ]}
                          columnHeaders={[{ label: 'Quality Metrics' }]}
                          rowGroupData={[metricSample]}
                          warnings={[{
                            compare: lessThan,
                            name: 'Validity',
                            val: 80,
                          },
                          {
                            compare: lessThan,
                            name: 'Completeness',
                            val: 80,
                          },
                          {
                            compare: greaterThan,
                            name: 'Duplicate rows',
                            val: 0,
                          }]}
                        />
                      )}
                    </Flex>

                    <Spacing ml={PADDING_UNITS} />

                    <Flex flex={1}>
                      {statSample && (
                        <SimpleDataTable
                          columnFlexNumbers={[1, 1, 1]}
                          columnHeaders={[{ label: 'Statistics' }]}
                          rowGroupData={[statSample]}
                          warnings={[
                            {
                              compare: greaterThan,
                              name: 'Empty columns',
                              val: 0,
                            },
                          ]}
                        />
                      )}
                    </Flex>
                  </FlexContainer>

                  <Spacing mt={PADDING_UNITS}>
                    <FeatureProfiles
                      features={features}
                      featureSet={featureSet}
                      statistics={statistics}
                    />
                  </Spacing>
                </>
              )}
            </>
          )}

          {tabsFromUrl?.includes(TAB_VISUALIZATIONS) && (
            <>
              {selectedColumn && (
                <ColumnAnalysis
                  column={selectedColumn}
                  features={features}
                  insights={insightsOverview}
                  statisticsByColumn={statistics?.[`${selectedColumn}/value_counts`] || {}}
                  statisticsOverview={statistics}
                />
              )}

              {!selectedColumn && (
                <Overview
                  features={features}
                  insightsOverview={insightsOverview}
                  statistics={statistics}
                />
              )}
            </>
          )}

          {tabsFromUrl?.includes(TAB_DATA) && columns?.length >= 1 && (
            <DataTable
              width={dataTableWidth}
              height={dataTableHeight}
              columns={columns}
              rows={rows}
            />
          )}
        </Spacing>
      </MultiColumn>
    </Layout>
  );
}

export default DatasetOverview;
