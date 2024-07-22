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
} & TextProps;

const BadgeStyled = withStyles(styles, {
  HTMLTag: 'div',
  classNames: ['badge'],
});

export default function Badge({ Icon, baseColorName, borderColorName, className, label, short, ...textProps }: BadgeType) {
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
        templateColumns={Icon ? 'auto 1fr' : '1fr'}
        templateRows="1fr"
      >
        {Icon && <Icon colorName={baseColorName} size={16} />}
        <Text semibold {...textProps}>{label}</Text>
      </BadgeStyled>
    </Grid>
  );
}
