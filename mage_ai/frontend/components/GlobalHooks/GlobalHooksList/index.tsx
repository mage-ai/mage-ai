import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import FlexContainer from '@oracle/components/FlexContainer';
import GlobalHookType from '@interfaces/GlobalHookType';
import Link from '@oracle/elements/Link';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  AlertTriangle,
  Check,
} from '@oracle/icons';
import { ICON_SIZE } from '@components/shared/index.style';
import { TEXT_PROPS_SHARED } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { capitalizeRemoveUnderscoreLower, camelCaseToNormalWithSpaces } from '@utils/string';
import { datetimeInLocalTimezone } from '@utils/date';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type GlobalHooksListProps = {
  rootProject?: boolean;
};

function GlobalHooksList({
  rootProject,
}: GlobalHooksListProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const themeContext: ThemeType = useContext(ThemeContext);
  const router = useRouter();

  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(null);

  const { data } = api.global_hooks.list({
    _format: 'with_pipeline_details',
    include_snapshot_validation: 1,
    ...(rootProject ? { root_project: rootProject } : {}),
  });
  const globalHooks: GlobalHookType[] = useMemo(() => data?.global_hooks || [], [data]);

  return (
    <>
      <Table
        columnFlex={[null, null, null, null, 1, null, null]}
        columns={[
          {
            uuid: 'UUID',
          },
          {
            uuid: 'Resource',
          },
          {
            uuid: 'Operation',
          },
          {
            uuid: 'Pipeline',
          },
          {
            uuid: 'Outputs',
          },
          {
            center: true,
            uuid: 'Valid',
          },
          {
            rightAligned: true,
            uuid: 'Snapshotted at',
          },
        ]}
        onClickRow={(rowIndex: number, event?: any) => {
          // setSelectedRowIndex(prev => prev === rowIndex ? null : rowIndex);

          const globalHook = globalHooks?.[rowIndex];
          const {
            operation_type: operationType,
            resource_type: resourceType,
            uuid,
          } = globalHook;

          router.push(`/${rootProject ? 'platform/' : ''}global-hooks/${uuid}?operation_type=${operationType}&resource_type=${resourceType}`)
        }}
        // renderExpandedRowWithObject={(rowIndex: number) => {
        //   const globalHook = globalHooks?.[rowIndex];

        //   return (
        //     <>
        //     </>
        //   );
        // }}
        getObjectAtRowIndex={(rowIndex: number) => globalHooks?.[rowIndex]}
        rows={globalHooks?.map((globalHook) => {
          const {
            metadata,
            operation_type: operationType,
            outputs,
            pipeline,
            pipeline_details: pipelineDetails,
            resource_type: resourceType,
            uuid,
          } = globalHook;
          const pipelineUUID = pipeline?.uuid;
          const pipelineEl = pipelineUUID
            ? (
              <NextLink
                as={`/pipelines/${pipelineUUID}/edit`}
                href={'/pipelines/[pipeline]/edit'}
                key="pipeline"
                passHref
              >
                <Link
                  {...TEXT_PROPS_SHARED}
                  openNewWindow
                >
                  {pipelineUUID}
                </Link>
              </NextLink>
            )
            : (
              <Text
                {...TEXT_PROPS_SHARED}
                key="pipeline"
                muted
              >
                -
              </Text>
            );

          const outputsEls = [];
          if (outputs?.length >= 1 && pipelineDetails?.blocks?.length >= 1) {
            const blocksMapping = indexBy(pipelineDetails?.blocks || [], ({ uuid }) => uuid);
            outputs?.forEach((output, idx) => {
              if (output?.block?.uuid) {
                const block = blocksMapping?.[output?.block?.uuid];
                if (block) {
                  if (idx >= 1) {
                    outputsEls.push(
                      <Text
                        {...TEXT_PROPS_SHARED}
                        inline
                        key={`${block?.uuid}-${idx}-comma`}
                        muted
                      >
                        ,&nbsp;
                      </Text>
                    );
                  }
                  outputsEls.push(
                    <NextLink
                      as={`/pipelines/${pipelineUUID}/edit?block_uuid=${block?.uuid}`}
                      href={'/pipelines/[pipeline]/edit'}
                      key={`${block?.uuid}-${idx}-link`}
                      passHref
                    >
                      <Link
                        {...TEXT_PROPS_SHARED}
                        inline
                        openNewWindow
                        sameColorAsText
                      >
                        <Text
                          {...TEXT_PROPS_SHARED}
                          color={getColorsForBlockType(
                            block?.type,
                            {
                              blockColor: block?.color,
                              theme: themeContext,
                            },
                          ).accent}
                          inline
                        >
                          {block?.uuid}
                        </Text>
                      </Link>
                    </NextLink>
                  );
                }
              }
            });
          }

          return [
            <Text
              {...TEXT_PROPS_SHARED}
              key="uuid"
            >
              {uuid}
            </Text>,
            <Text
              {...TEXT_PROPS_SHARED}
              key="resourceType"
              monospace={false}
            >
              {resourceType ? camelCaseToNormalWithSpaces(resourceType) : '-'}
            </Text>,
            <Text
              {...TEXT_PROPS_SHARED}
              key="operationType"
              monospace={false}
            >
              {operationType ? capitalizeRemoveUnderscoreLower(operationType) : '-'}
            </Text>,
            pipelineEl,
            <div key="outputs">
              {outputsEls?.length >= 1 && outputsEls}
              {!outputsEls?.length && (
                <Text
                  {...TEXT_PROPS_SHARED}
                  muted
                >
                  -
                </Text>
              )}
            </div>,
            <FlexContainer key="valid" justifyContent="center">
              {metadata?.snapshot_valid
                ? <Check size={ICON_SIZE} success />
                : <AlertTriangle danger size={ICON_SIZE} />
              }
            </FlexContainer>,
            <Text
              {...TEXT_PROPS_SHARED}
              key="snapshottedAt"
              rightAligned
            >
              {metadata?.snapshotted_at
                ? datetimeInLocalTimezone(metadata?.snapshotted_at, displayLocalTimezone)
                : '-'
              }
            </Text>,
          ];
        })}
        selectedRowIndexInternal={selectedRowIndex}
        uuid="GlobalHooks/Table"
      />
    </>
  );
}

export default GlobalHooksList;
