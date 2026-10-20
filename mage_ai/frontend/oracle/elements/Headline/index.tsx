import styled, { css } from 'styled-components';
import { media } from 'styled-bootstrap-grid';

import dark from '@oracle/styles/themes/dark';
import {
  FONT_FAMILY_BOLD,
  FONT_FAMILY_BOLD as FONT_FAMILY_DEMI_BOLD,
  FONT_FAMILY_BOLD as FONT_FAMILY_EXTRA_BOLD,
  FONT_FAMILY_LIGHT as FONT_FAMILY_EXTRA_LIGHT,
  FONT_FAMILY_BOLD as FONT_FAMILY_HEAVY,
  FONT_FAMILY_LIGHT,
  FONT_FAMILY_MEDIUM,
  FONT_FAMILY_REGULAR,
  FONT_FAMILY_THIN,
} from '@oracle/styles/fonts/primary';
import {
  HERO,
  XLARGE,
  XXLARGE,
} from '@oracle/styles/fonts/sizes';
import {
  SHARED_STYLES as TEXT_SHARED_STYLES,
  TextProps,
} from '@oracle/elements/Text';
import { UNIT } from '@oracle/styles/units/spacing';
import Spacing from '@oracle/elements/Spacing';

export type HeadlineProps = {
  bold?: boolean;
  breakAll?: boolean;
  center?: boolean;
  color?: string;
  children?: any;
  condensed?: boolean;
  danger?: boolean;
  default?: boolean;
  disabled?: boolean;
  info?: boolean;
  inline?: boolean;
  inverted?: boolean;
  invertedTheme?: boolean;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  lineHeightAuto?: boolean;
  marketing?: boolean;
  monospace?: boolean;
  muted?: boolean;
  primary?: boolean;
  spacingBelow?: boolean;
  strikethrough?: boolean;
  warning?: boolean;
  weightStyle?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  wind?: boolean;
  yellow?: boolean;
};

const SHARED_STYLES = css<TextProps & HeadlineProps>`
  ${TEXT_SHARED_STYLES}

  margin: 0;

  ${props => props.color && `
    color: ${props.color}
  `}

  ${props => props.yellow && `
    color: ${(props.theme.accent || dark.accent).yellow};
  `}

  ${props => props.center && `
    text-align: center;
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 0 && `
    font-family: ${FONT_FAMILY_THIN};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 1 && `
    font-family: ${FONT_FAMILY_EXTRA_LIGHT};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 2 && `
    font-family: ${FONT_FAMILY_LIGHT};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 3 && `
    font-family: ${FONT_FAMILY_REGULAR};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 4 && `
    font-family: ${FONT_FAMILY_MEDIUM};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 5 && `
    font-family: ${FONT_FAMILY_DEMI_BOLD};
  `}

  ${props => !props.monospace && (Number(props.weightStyle) === 6 || props.bold) && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 7 && `
    font-family: ${FONT_FAMILY_EXTRA_BOLD};
  `}

  ${props => !props.monospace && Number(props.weightStyle) === 8 && `
    font-family: ${FONT_FAMILY_HEAVY};
  `}

  ${props => props.lineHeightAuto && `
    line-height: normal !important;
  `}

  ${props => props.strikethrough && `
    text-decoration: line-through;
  `}
`;

const HeadlineContainerStyle = styled.div`
  ${props => `
    color: ${(props.theme.content || dark.content).active};
  `}
`;

const H1HeroStyle = styled.h1<HeadlineProps>`
  ${SHARED_STYLES}

  font-size: 42px;
  line-height: 56px;

  ${media.md`
    ${HERO}
  `}

  ${media.lg`
    ${HERO}
  `}

  ${media.xl`
    ${HERO}
  `}
`;

const H1Style = styled.h1<HeadlineProps>`
  ${SHARED_STYLES}
  ${XXLARGE}
`;

const H1MarketingStyle = styled.h1`
  ${SHARED_STYLES}

  ${media.xs`
    font-size: ${UNIT * 6}px;
    line-height: ${UNIT * 7}px;
  `}

  ${media.sm`
    font-size: ${UNIT * 6}px;
    line-height: ${UNIT * 7}px;
  `}

  ${media.md`
    font-size: ${UNIT * 6}px;
    line-height: ${UNIT * 7}px;
  `}

  ${media.lg`
    font-size: ${UNIT * 6}px;
    line-height: ${UNIT * 7}px;
  `}

  ${media.xl`
    font-size: ${UNIT * 6}px;
    line-height: ${UNIT * 7}px;
  `}
`;

const H2Style = styled.h2<HeadlineProps>`
  ${SHARED_STYLES}
  ${XLARGE}
`;

const H3Style = styled.h3<HeadlineProps>`
  ${SHARED_STYLES}
  font-size: 24px;
  line-height: 32px;
`;

const H4Style = styled.h4<HeadlineProps>`
  ${SHARED_STYLES}
  font-size: 20px;
  line-height: 28px;
`;

const H5Style = styled.h5<HeadlineProps>`
  ${SHARED_STYLES}
  font-size: 18px;
  line-height: 26px;
`;

const SpanStyle = styled.span<HeadlineProps>`
  ${SHARED_STYLES}

  ${props => props.level === 1 && `
    ${XXLARGE}
  `}

  ${props => props.level === 2 && `
    ${XLARGE}
  `}

  ${props => props.level === 3 && `
    font-size: 24px;
    line-height: 32px;
  `}

  ${props => props.level === 4 && `
    font-size: 20px;
    line-height: 28px;
  `}
`;

const Headline = ({
  children,
  condensed,
  inline,
  level,
  marketing,
  spacingBelow,
  ...props
}: HeadlineProps) => {
  let ElComponent;
  if (inline) {
    ElComponent = SpanStyle;
  } else if (Number(level) === 0) {
    ElComponent = H1HeroStyle;
  } else if (Number(level) === 1) {
    ElComponent = marketing ? H1MarketingStyle : H1Style;
  } else if (Number(level) === 2) {
    ElComponent = H2Style;
  } else if (Number(level) === 3) {
    ElComponent = H3Style;
  } else if (Number(level) === 4) {
    ElComponent = H4Style;
  } else if (Number(level) === 5) {
    ElComponent = H5Style;
  }

  const el = (
    <ElComponent
      {...props}
      level={level}
    >
      {spacingBelow && (
        <Spacing mb={condensed ? 2 : 3}>
          {children}
        </Spacing>
      )}
      {!spacingBelow && children}
    </ElComponent>
  );

  if (inline) {
    return el;
  }

  return (
    <HeadlineContainerStyle>
      {el}
    </HeadlineContainerStyle>
  );
};

Headline.defaultProps = {
  level: 3,
  weightStyle: 6,
};

export default Headline;
