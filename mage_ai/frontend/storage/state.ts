import { createGlobalState } from 'react-hooks-global-state';

export const { useGlobalState } = createGlobalState({
  'Editor.joiningFeatureSetVersionId': null,
  apiReloads: {},
  payloadValue: {},
  visibleSideDrawer: false,
});
