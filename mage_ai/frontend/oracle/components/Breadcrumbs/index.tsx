import React from 'react';

import Breadcrumb, { BreadcrumbType } from './Breadcrumb';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import { LinkProps } from '@oracle/elements/Link';

type BreadcrumbSetProps = {
  bold?: boolean;
  breadcrumbs: BreadcrumbType[];
  large?: boolean;
  linkProps?: LinkProps;
};

function BreadCrumbs({
  bold,
  breadcrumbs,
  large,
  linkProps,
}: BreadcrumbSetProps, ref) {
  return (
    <FlexContainer>
      {breadcrumbs.map(
        (
          props: BreadcrumbType,
          idx: number,
        ) => (
          <Flex key={`${props.label}_${idx}` || idx}>
            <Breadcrumb
              bold={bold}
              hideIcon={idx === breadcrumbs.length - 1}
              {...props}
              large={large}
              linkProps={linkProps}
              ref={ref}
            />
          </Flex>
        ),
      )}
    </FlexContainer>
  );
}

export default React.forwardRef(BreadCrumbs);
