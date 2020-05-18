import {
  LayoutActions,
  LAYOUT_TOGGLE_SIDEBAR,
  LAYOUT_FLIP_CARD,
} from "../actions/layout";

export interface LayoutState {
  sidebarOpen: boolean,
  cardFlipped: boolean,
}

const initialState: LayoutState = {
  sidebarOpen: false,
  cardFlipped: false,
}

export const layoutReducer = (state: LayoutState = initialState, action: LayoutActions): LayoutState => {
  switch(action.type) {
    case LAYOUT_TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: action.open,
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
