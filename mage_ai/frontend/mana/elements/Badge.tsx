import Text from './Text';
import Grid from '../components/Grid';
import { IconType } from '../icons/types';
import styles from '@styles/scss/elements/Badge.module.scss';
import { withStyles } from '../hocs/withStyles';

export type BadgeType = {
  Icon?: IconType;
  baseColorName?: string;
  label?: string;
  short?: boolean;
};

const BadgeStyled = withStyles(styles, {
  HTMLTag: 'div',
  classNames: ['badge'],
});

export default function Badge({ Icon, baseColorName, label, short }: BadgeType) {
  return (
    <Grid templateColumnsMaxContent={short}>
      <BadgeStyled
        alignItems="center"
        backgroundColor={`${baseColorName}lo`}
        className={[].join(' ')}
        columnGap={10}
        templateColumns="auto 1fr"
        templateRows="1fr"
      >
        {Icon && <Icon colorName={baseColorName} size={16} />}
        <Text semibold>{label}</Text>
      </BadgeStyled>
    </Grid>
  );
}
