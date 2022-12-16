import PropTypes from 'prop-types';

export type TabArgsProps = {
  key: string;
  props: TabProps;
};

type TabProps = {
  afterChildren?: any;
  beforeChildren?: any;
  children: any;
  disabled?: boolean;
  label: string;
};

export default function Tab({ children }: TabProps) {
  return children;
}

Tab.propTypes = {
  afterChildren: PropTypes.node,
  beforeChildren: PropTypes.node,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.string.isRequired,
};
