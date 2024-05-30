import React, { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

import ClickOutside from '@oracle/components/ClickOutside';
import Dashboard, { DashboardSharedProps } from '@components/Dashboard';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import ErrorPopup from '@components/ErrorPopup';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import { BannerStyle } from './index.style';
import { BreadcrumbType } from '@components/shared/Header';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PageNameEnum } from './constants';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { buildNavigationItems } from './utils';
import { displayErrorFromReadResponse } from '@api/utils/response';
import { useWindowSize } from '@utils/sizes';

type PipelineDetailPageProps = {
  breadcrumbs: BreadcrumbType[];
  buildSidekick?: (opts: {
    height: number;
    heightOffset?: number;
    pipeline: PipelineType;
    width: number;
  }) => any;
  children: any;
  errors?: ErrorsType;
  headline?: string;
  pageName: PageNameEnum;
  pipeline: {
    uuid: string;
  };
  setErrors?: (errors: ErrorsType) => void;
  subheader?: any;
  subheaderBackground?: string;
  subheaderBackgroundImage?: string;
  subheaderButton?: any;
  subheaderText?: any;
  title?: (pipeline: PipelineType) => string;
} & DashboardSharedProps;

function PipelineDetailPage(
  {
    after: afterProp,
    afterHidden,
    afterWidth: afterWidthProp,
    before,
    beforeWidth,
    breadcrumbs: breadcrumbsProp,
    buildSidekick,
    children,
    errors,
    headline,
    pageName,
    pipeline: pipelineProp,
    setErrors,
    subheader,
    subheaderBackground,
    subheaderBackgroundImage,
    subheaderButton,
    subheaderNoPadding,
    subheaderText,
    title,
    uuid,
  }: PipelineDetailPageProps,
  ref,
) {
  const { height } = useWindowSize();
  const router = useRouter();
  const { pipeline: pipelineUUIDFromUrl }: any = router.query;

  const pipelineUUID = pipelineProp?.uuid;
  const { data } = api.pipelines.detail(
    pipelineUUID,
    {
      includes_outputs: false,
    },
    {
      revalidateOnFocus: false,
    },
  );
  const pipeline = data?.pipeline;
  useEffect(() => {
    displayErrorFromReadResponse(data, setErrors);
  }, [data, setErrors]);

  const afterWidth = afterWidthProp || (afterProp || buildSidekick ? 50 * UNIT : null);

  const after = useCallback(
    ({ width }) => {
      if (afterProp) {
        return afterProp;
      } else if (buildSidekick) {
        return buildSidekick({
          height,
          heightOffset: HEADER_HEIGHT,
          pipeline,
          width: width || afterWidth,
        });
      }

      return null;
    },
    [afterProp, afterWidth, buildSidekick, height, pipeline],
  );

  const breadcrumbs = useMemo(() => {
    const arr = [];

    if (pipeline) {
      arr.push(
        ...[
          {
            label: () => 'Pipelines',
            linkProps: {
              href: '/pipelines',
            },
          },
        ],
      );

      if (breadcrumbsProp) {
        arr.push({
          label: () => pipeline.uuid,
          linkProps: {
            as: `/pipelines/${pipelineUUID}/triggers`,
            href: '/pipelines/[pipeline]/triggers',
          },
        });
        arr.push(...breadcrumbsProp);
        arr[arr.length - 1].bold = true;
      } else {
        arr.push({
          bold: true,
          label: () => pipeline.name,
        });
      }
    } else if (data?.error) {
      arr.push({
        bold: true,
        danger: true,
        label: () => 'Error loading pipeline',
      });
    }

    return arr;
  }, [breadcrumbsProp, data?.error, pipeline, pipelineUUID]);

  return (
    <>
      <Dashboard
        after={(afterProp || buildSidekick) ? after : null}
        afterHidden={afterHidden}
        afterWidth={afterWidth}
        before={before}
        beforeWidth={beforeWidth}
        breadcrumbs={breadcrumbs}
        navigationItems={buildNavigationItems(pageName, pipeline, pipelineUUIDFromUrl)}
        ref={ref}
        subheaderChildren={typeof subheader !== 'undefined' && subheader}
        subheaderNoPadding={subheaderNoPadding}
        title={pipeline ? (title ? title(pipeline) : pipeline.name) : null}
        uuid={uuid}
      >
        {(subheaderButton || subheaderText) && (
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS} mt={PADDING_UNITS} mx={PADDING_UNITS}>
            <BannerStyle
              background={subheaderBackground}
              backgroundImage={subheaderBackgroundImage}
            >
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
              <Headline level={5}>{headline}</Headline>
              <Divider light mt={PADDING_UNITS} short />
            </Spacing>
          </Spacing>
        )}

        {children}
      </Dashboard>

      {errors && (
        <ClickOutside disableClickOutside isOpen onClickOutside={() => setErrors?.(null)}>
          <ErrorPopup {...errors} onClose={() => setErrors?.(null)} />
        </ClickOutside>
      )}
    </>
  );
}

export default React.forwardRef(PipelineDetailPage);
