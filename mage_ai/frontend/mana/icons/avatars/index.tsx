import Hexagon from '@mana/components/Shapes/Hexagon';
import stylesAvatar from '@styles/scss/elements/icons/Avatar.module.scss';

export default function MageAvatar({ size, variant }: { size?: number; variant?: string }) {
  return (
    <Hexagon
      backgroundColorName="colors-rose"
      imageSrc="/images/avatar-b.png"
      size={size ?? 40}
    >
    </Hexagon>
  );
}
