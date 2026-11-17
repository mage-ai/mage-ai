import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import BlockRunsTable from '@components/BlockRunsTable';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import Paginate, { MAX_PAGES, ROW_LIMIT } from '@components/shared/Paginate';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Toolbar from '@components/shared/Table/Toolbar';
import api from '@api';
import {
    BLOCK_RUN_STATUSES,
    BLOCK_RUN_STATUS_TO_LABEL,
    BlockRunFilterQueryEnum,
    BlockRunReqQueryParamsType,
} from '@interfaces/BlockRunType';
import { UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { filterQuery, queryFromUrl, queryString } from '@utils/url';
import { sortByKey } from '@utils/array';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';
import { buildBlockRunsRequestQuery, getSelectedPipelineUUID } from '@utils/blockRuns';

function RunListPage() {
    const router = useRouter();
    const [errors, setErrors] = useState<ErrorsType>(null);
    const q = queryFromUrl();
    const page = Number(q?.page || 0);

    const selectedPipelineUUID = useMemo(() => getSelectedPipelineUUID({
        pipeline_uuid: q?.[BlockRunFilterQueryEnum.PIPELINE_UUID] ?? q?.pipeline_uuid,
    }), [q]);
    const query = useMemo(() => filterQuery(q, [
        BlockRunFilterQueryEnum.PIPELINE_UUID,
        BlockRunFilterQueryEnum.STATUS,
    ]), [q]);

    const { data: dataProjects } = api.projects.list();
    const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
    useMemo(
        () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
        [project?.features],
    );

    const { data: dataPipelines } = api.pipelines.list();
    const pipelineUUIDs = useMemo(
        () => sortByKey((dataPipelines?.pipelines || []).map((pipeline: PipelineType) => pipeline.uuid),
            pipelineUUID => pipelineUUID,
        ),
        [dataPipelines],
    );

    const blockRunsRequestQuery: BlockRunReqQueryParamsType = buildBlockRunsRequestQuery(
        query,
        page,
        ROW_LIMIT,
    );
    const {
        data: dataBlockRuns,
    } = api.block_runs.list(
        blockRunsRequestQuery,
        {
            refreshInterval: 3000,
            revalidateOnFocus: true,
        },
    );

    const blockRuns = useMemo(() => dataBlockRuns?.block_runs || [], [dataBlockRuns]);
    const totalRuns = useMemo(() => dataBlockRuns?.metadata?.count || 0, [dataBlockRuns]);

    const toolbarEl = useMemo(() => (
      <Toolbar
            filterOptions={{
                pipeline_uuid: pipelineUUIDs,
                status: BLOCK_RUN_STATUSES,
            }}
            filterValueLabelMapping={{
                status: BLOCK_RUN_STATUS_TO_LABEL,
            }}
            onClickFilterDefaults={() => {
                router.push('/block-runs');
            }}
            query={query}
            resetPageOnFilterApply
        />
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [
        pipelineUUIDs,
        router,
    ]);

    return (
      <Dashboard
            errors={errors}
            setErrors={setErrors}
            subheaderChildren={toolbarEl}
            title="Block runs"
            uuid="block_runs/index"
        >
        {!dataBlockRuns
                ?
                  <Spacing p={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
                    <Spinner inverted large />
                  </Spacing>
                :
                  <>
                    <BlockRunsTable blockRuns={blockRuns} selectedPipelineUUID={selectedPipelineUUID} />
                    <Spacing p={2}>
                      <Paginate
                            maxPages={MAX_PAGES}
                            onUpdate={(p) => {
                                const newPage = Number(p);
                                const updatedQuery = {
                                    ...q,
                                    page: newPage >= 0 ? newPage : 0,
                                };
                                router.push(
                                    '/block-runs',
                                    `/block-runs?${queryString(updatedQuery)}`,
                                );
                            }}
                            page={page}
                            totalPages={Math.ceil(totalRuns / ROW_LIMIT)}
                        />
                    </Spacing>
                  </>
            }
      </Dashboard>
    );
}

RunListPage.getInitialProps = async () => ({});

export default PrivateRoute(RunListPage);
