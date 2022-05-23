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
}: BreadcrumbSetProps) {
  return (
    <FlexContainer>
      {breadcrumbs.map(
        (
          props: BreadcrumbType,
          idx: number,
        ) => (
          <Flex key={props.label || idx}>
            <Breadcrumb
              bold={bold}
              hideIcon={idx === breadcrumbs.length - 1}
              key={props.label}
              {...props}
              large={large}
              linkProps={linkProps}
            />
          </Flex>
        ),
      )}
    </FlexContainer>
  );
}

export default BreadCrumbs;
