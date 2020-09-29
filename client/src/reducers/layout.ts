import {
  LayoutActions,
  LAYOUT_TOGGLE_DEBUG,
  LAYOUT_FLIP_CARD,
} from "../actions/layout";

export interface LayoutState {
  cardFlipped: boolean,
  debugOpen: boolean,
}

const initialState: LayoutState = {
  cardFlipped: false,
  debugOpen: false,
}

export const layoutReducer = (state: LayoutState = initialState, action: LayoutActions): LayoutState => {
  switch(action.type) {
    case LAYOUT_TOGGLE_DEBUG:
      return {
        ...state,
        debugOpen: action.open,
      };

    case LAYOUT_FLIP_CARD:
      return {
        ...state,
        cardFlipped: action.flipped,
      };

    default:
      return state;
  }
}
