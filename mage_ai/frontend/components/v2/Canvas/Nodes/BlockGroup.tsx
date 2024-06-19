import styles from '@styles/scss/components/Canvas/Nodes/BlockGroup.module.scss';
import { styleClassNames } from '@mana/shared/utils';

function BlockGroup({ children, ...props }: {
  children?: React.ReactNode;
}) {
  return (
    <div
      className={styleClassNames(
        styles,
        [styles.group],
        props,
      )}
    >
      {children}

      <div className="block-group">
        <div className="block-group__block">
          <div className="block-group__block__title">
            <h2>Block Group</h2>
          </div>
          <div className="block-group__block__content">
            <p>Block Group content</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlockGroup;
