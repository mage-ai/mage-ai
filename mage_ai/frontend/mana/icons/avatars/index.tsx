import stylesAvatar from '@styles/scss/elements/icons/Avatar.module.scss';

export default function MageAvatar({ size, variant }: { size?: number; variant?: string }) {
  return (
    <div
      className={[stylesAvatar.avatarContainer].filter(Boolean).join(' ')}
      style={{
        height: size ?? 40,
        width: size ?? 40,
      }}
    >
      <div
        className={[stylesAvatar.avatar, stylesAvatar[`variant-${variant ?? 'a'}`]]
          .filter(Boolean)
          .join(' ')}
      />
    </div>
  );
}
