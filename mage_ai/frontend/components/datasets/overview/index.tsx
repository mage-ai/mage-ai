import React, { useCallback, useMemo, useEffect, useState } from 'react';
import Router from 'next/router';
import { useMutation } from 'react-query';

import ActionDropdown from '@components/ActionForm/ActionDropdown';
import ActionForm from '@components/ActionForm';
import ActionPayloadType, { ActionVariableTypeEnum } from '@interfaces/ActionPayloadType';
import BaseTable from '@oracle/components/Table/BaseTable';
import Button from '@oracle/elements/Button';
import ButtonGroup from '@oracle/elements/Button/ButtonGroup';
import ColumnAnalysis from '@components/datasets/Insights/ColumnAnalysis';
import ColumnListSidebar from '@components/datasets/columns/ColumnListSidebar';
import ColumnReports from '@components/datasets/columns/ColumnReports';
import Divider from '@oracle/elements/Divider';
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
import { Column as ColumnIcon } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import {
  createMetricsSample,
  createStatisticsSample,
} from './utils';
import { deserializeFeatureSet } from '@utils/models/featureSet';
import { getHost } from '@api/utils/url';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { removeAtIndex } from '@utils/array';
import { useCustomFetchRequest } from '@api';

const TAB_REPORTS = 'Reports';
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
  const [errorMessages, setErrorMessages] = useState(null);
  const qFromUrl = queryFromUrl();
  const {
    show_columns: showColumnsFromUrl,
  } = qFromUrl;
  const tabsFromUrlInit = qFromUrl['tabs[]'];
  const tabsFromUrl = tabsFromUrlInit
    ? Array.isArray(tabsFromUrlInit) ? tabsFromUrlInit : [tabsFromUrlInit]
    : [];

  const setTabs = useCallback((newTab: string, pushHistory: boolean = true) => {
    goToWithQuery({
      'tabs[]': newTab,
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
          callback: (response) => fetchFeatureSet({
            ...featureSet,
            pipeline: response,
          }),
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
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
  const saveAction = (newActionData: TransformerActionType) => {
    setErrorMessages(null);

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
    const idx =
      pipelineActions.findIndex(({ id }: TransformerActionType) => id === existingActionData.id);

    setErrorMessages(null);
    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
  };

  const closeAction = () => setActionPayload({} as ActionPayloadType);

  const columnsVisible = Number(showColumnsFromUrl) === 1;

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
            <Spacing mb={PADDING_UNITS}>
              <ActionDropdown
                actionType={actionType}
                columnOnly={!!selectedColumn}
                setActionPayload={setActionPayload}
              />
            </Spacing>

            {actionType && (
              <Spacing mb={PADDING_UNITS}>
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
                />
              </Spacing>
            )}

            {errorMessages?.length >= 1 && (
              <Spacing mb={PADDING_UNITS}>
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

            {featureSet && (
              <Suggestions
                addAction={saveAction}
                featureSet={featureSet}
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

            <PageBreadcrumbs featureSet={featureSet} />
          </Spacing>
        }
        onTabClick={t => setTabs(t)}
        selectedTab={tabsFromUrl?.[0]}
        tabs={TABS_IN_ORDER}
      >
        <Spacing p={PADDING_UNITS}>
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

          {tabsFromUrl?.includes(TAB_DATA) && (
            <BaseTable
              columns={columnHeaderSample}
              data={rows}
              datatype={headerTypes}
              titles={columns}
            />
          )}
        </Spacing>
      </MultiColumn>
    </Layout>
  );
}

export default DatasetOverview;
