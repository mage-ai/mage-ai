export const ACTION_HIDE = 'hide';
export const ACTION_SHOW = 'show';

export const reducer = (state, action) => {
  switch (action.type) {
    case ACTION_SHOW:
      return {
        ...state,
        visible: true,
      };
    case ACTION_HIDE:
      return {
        ...state,
        visible: false,
      };
    default:
      return state;
  }
};

export const initialState = {
  visible: false,
};
