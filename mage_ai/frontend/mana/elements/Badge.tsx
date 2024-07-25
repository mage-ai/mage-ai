import Text, { TextProps } from './Text';
import Grid from '../components/Grid';
import styles from '@styles/scss/elements/Badge.module.scss';
import { withStyles } from '../hocs/withStyles';

export type BadgeType = {
  Icon?: any;
  baseColorName?: string;
  borderColorName?: string;
  className?: string;
  label?: string;
  short?: boolean;
  before?: any;
  after?: any;
  templateColumns?: string;
} & TextProps;

const BadgeStyled = withStyles(styles, {
  HTMLTag: 'div',
  classNames: ['badge'],
});

export default function Badge({ Icon, baseColorName, borderColorName, before, after, className, label, short, templateColumns, ...textProps }: BadgeType) {
  const tcolunns = templateColumns
    ?? [
      before && 'auto',
      Icon && 'auto',
      '1fr',
      after && 'auto',
    ].filter(Boolean).join(' ');
  return (
    <Grid templateColumnsMaxContent={short}>
      <BadgeStyled
        alignItems="center"
        backgroundColor={`${baseColorName}lo`}
        className={[
          className,
          borderColorName && styles[`border-color-${borderColorName}`],
        ].filter(Boolean).join(' ')}
        columnGap={10}
        templateColumns={tcolunns}
        templateRows="1fr"
      >
        {before}
        {Icon && <Icon colorName={baseColorName} size={16} />}
        <Text semibold {...textProps} style={{ lineHeight: '26px' }}>{label}</Text>
        {after}
      </BadgeStyled>
    </Grid>
  );
}
