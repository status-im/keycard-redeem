import {
  DebugActions,
  DEBUG_WRITTEN,
} from '../actions/debug';

export interface DebugState {
  lines: Array<string>
}

const initialState: DebugState = {
  lines: [],
};

export const debugReducer = (state: DebugState = initialState, action: DebugActions): DebugState => {
  switch (action.type) {
    case DEBUG_WRITTEN: {
      return {
        ...state,
        lines: [
          ...state.lines,
          action.text,
        ]
      }
    }

    default:
      return state;
  }
}
