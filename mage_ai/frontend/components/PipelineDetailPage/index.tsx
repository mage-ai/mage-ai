import { useMemo } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BackfillGradient from '@oracle/icons/custom/BackfillGradient';
import BlocksSeparatedGradient from '@oracle/icons/custom/BlocksSeparatedGradient';
import BlocksStackedGradient from '@oracle/icons/custom/BlocksStackedGradient';
import ChartGradient from '@oracle/icons/custom/ChartGradient';
import Dashboard, { DashboardSharedProps } from '@components/Dashboard';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import ScheduleGradient from '@oracle/icons/custom/ScheduleGradient';
import Spacing from '@oracle/elements/Spacing';
import TodoListGradient from '@oracle/icons/custom/TodoListGradient';
import api from '@api';

import {
  Backfill,
  BlocksSeparated,
  BlocksStacked,
  Chart,
  Edit,
  Schedule,
  TodoList,
} from '@oracle/icons';
import { BannerStyle } from './index.style';
import { BreadcrumbType, MenuItemType } from '@components/shared/Header';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PageNameEnum } from './constants';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { randomNameGenerator } from '@utils/string';
import { useWindowSize } from '@utils/sizes';

type PipelineDetailPageProps = {
  breadcrumbs: BreadcrumbType[];
  buildSidekick?: (opts: {
    height: number;
    heightOffset?: number;
    pipeline: PipelineType;
  }) => any;
  children: any;
  headline?: string;
  pageName: PageNameEnum,
  pipeline: {
    uuid: string;
  };
  subheader?: any;
  subheaderBackground?: string;
  subheaderBackgroundImage?: string;
  subheaderButton?: any;
  subheaderText?: any;
  title?: (pipeline: PipelineType) => string;
} & DashboardSharedProps;

function PipelineDetailPage({
  after: afterProp,
  afterHidden,
  afterWidth: afterWidthProp,
  before,
  beforeWidth,
  breadcrumbs: breadcrumbsProp,
  buildSidekick,
  children,
  headline,
  pageName,
  pipeline: pipelineProp,
  subheader,
  subheaderBackground,
  subheaderBackgroundImage,
  subheaderButton,
  subheaderText,
  title,
  uuid,
}: PipelineDetailPageProps) {
  const router = useRouter();
  const { height } = useWindowSize();

  const pipelineUUID = pipelineProp.uuid;
  const { data } = api.pipelines.detail(pipelineUUID, {
    includes_content: false,
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline = data?.pipeline;

  const [createPipeline] = useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
          },
        },
      ),
    },
  );
  const [deletePipeline] = useMutation(
    (uuid: string) => api.pipelines.useDelete(uuid)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            router.push('/pipelines');
          },
        },
      ),
    },
  );

  const headerMenuItems: MenuItemType[] = [
    {
      label: () => 'New standard pipeline',
      // @ts-ignore
      onClick: () => createPipeline({
        pipeline: {
          name: randomNameGenerator(),
        },
      }),
      uuid: 'PipelineDetail/Header/new_standard_pipeline',
    },
    {
      label: () => 'New streaming pipeline',
      // @ts-ignore
      onClick: () => createPipeline({
        pipeline: {
          name: randomNameGenerator(),
          type: PipelineTypeEnum.STREAMING,
        },
      }),
      uuid: 'PipelineDetail/Header/new_streaming_pipeline',
    },
    {
      label: () => 'Delete current pipeline',
      onClick: () => deletePipeline(pipelineUUID),
      openConfirmationDialogue: true,
      uuid: 'PipelineDetail/Header/delete_pipeline',
    },
  ];

  const after = useMemo(() => {
    if (afterProp) {
      return afterProp;
    } else if (buildSidekick) {
      return buildSidekick({
        height,
        heightOffset: HEADER_HEIGHT,
        pipeline,
      });
    }

    return null;
  }, [
    afterProp,
    buildSidekick,
    height,
    pipeline,
  ]);
  const afterWidth = afterWidthProp || (after ? 50 * UNIT : null);

  const breadcrumbs = useMemo(() => {
    const arr = [];

    if (pipeline) {
      arr.push(...[
        {
          label: () => 'Pipelines',
          linkProps: {
            href: '/pipelines',
          },
        },
      ]);

      if (breadcrumbsProp) {
        arr.push({
          label: () => pipeline.uuid,
          linkProps: {
            as: `/pipelines/${pipelineUUID}/triggers`,
            href: '/pipelines/[pipeline]/triggers',
          },
        });
        arr.push(...breadcrumbsProp);

        // if (!arr[arr.length - 1].gradientColor) {
        //   arr[arr.length - 1].gradientColor = PURPLE_BLUE;
        // }
        arr[arr.length - 1].bold = true;
      } else {
        arr.push({
          // gradientColor: PURPLE_BLUE,
          bold: true,
          label: () => pipeline.name,
        });
      }
    }

    return arr;
  }, [
    breadcrumbsProp,
    pipeline,
  ]);

  const navigationItems = [
    {
      Icon: Schedule,
      IconSelected: ScheduleGradient,
      id: PageNameEnum.TRIGGERS,
      label: () => 'Triggers',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/triggers`,
        href: '/pipelines/[pipeline]/triggers',
      },
      isSelected: () => PageNameEnum.TRIGGERS === pageName,
    },
    {
      Icon: BlocksStacked,
      IconSelected: BlocksStackedGradient,
      id: PageNameEnum.RUNS,
      label: () => 'Runs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/runs`,
        href: '/pipelines/[pipeline]/runs',
      },
      isSelected: () => PageNameEnum.RUNS === pageName,
    },
    {
      Icon: Backfill,
      IconSelected: BackfillGradient,
      id: PageNameEnum.BACKFILLS,
      label: () => 'Backfills',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/backfills`,
        href: '/pipelines/[pipeline]/backfills',
      },
      isSelected: () => PageNameEnum.BACKFILLS === pageName,
    },
    {
      Icon: TodoList,
      IconSelected: TodoListGradient,
      id: PageNameEnum.PIPELINE_LOGS,
      label: () => 'Logs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/logs`,
        href: '/pipelines/[pipeline]/logs',
      },
      isSelected: () => PageNameEnum.PIPELINE_LOGS === pageName,
    },
    {
      Icon: Chart,
      IconSelected: ChartGradient,
      id: PageNameEnum.MONITOR,
      label: () => 'Monitor',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/monitors`,
        href: '/pipelines/[pipeline]/monitors',
      },
      isSelected: () => PageNameEnum.MONITOR === pageName,
    },
  ];

  if (PipelineTypeEnum.INTEGRATION === pipeline?.type) {
    navigationItems.unshift({
      Icon: BlocksSeparated,
      IconSelected: BlocksSeparatedGradient,
      id: PageNameEnum.SYNCS,
      label: () => 'Syncs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/syncs`,
        href: '/pipelines/[pipeline]/syncs',
      },
      isSelected: () => PageNameEnum.SYNCS === pageName,
    });
  }

  // @ts-ignore
  navigationItems.unshift({
    Icon: null,
    IconSelected: null,
    id: PageNameEnum.EDIT,
    label: () => 'Edit pipeline',
    linkProps: {
      as: `/pipelines/${pipelineUUID}/edit`,
      href: '/pipelines/[pipeline]/edit',
    },
  });

  return (
    <Dashboard
      after={after}
      afterHidden={afterHidden}
      afterWidth={afterWidth}
      before={before}
      beforeWidth={beforeWidth}
      breadcrumbs={breadcrumbs}
      headerMenuItems={headerMenuItems}
      navigationItems={navigationItems}
      subheaderChildren={typeof subheader !== 'undefined' && subheader}
      title={pipeline ? (title ? title(pipeline) : pipeline.name) : null}
      uuid={uuid}
    >
      {(subheaderButton || subheaderText) && (
        <Spacing
          mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}
          mt={PADDING_UNITS}
          mx={PADDING_UNITS}
        >
          <BannerStyle background={subheaderBackground} backgroundImage={subheaderBackgroundImage}>
            <FlexContainer alignItems="center">
              {subheaderButton}
              {subheaderText && <Spacing ml={3} />}
              {subheaderText}
            </FlexContainer>
          </BannerStyle>
        </Spacing>
      )}

      {headline && (
        <Spacing p={PADDING_UNITS}>
          <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
            <Headline level={5}>
              {headline}
            </Headline>
            <Divider light mt={PADDING_UNITS} short />
          </Spacing>
        </Spacing>
      )}

      {children}
    </Dashboard>
  );
}

export default PipelineDetailPage;
