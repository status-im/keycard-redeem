export const LAYOUT_FLIP_CARD = "LAYOUT_FLIP_CARD";
export interface LayoutFlipCardAction {
  type: typeof LAYOUT_FLIP_CARD
  flipped: boolean
}

export const LAYOUT_TOGGLE_DEBUG = "LAYOUT_TOGGLE_DEBUG";
export interface LayoutToggleDebugAction {
  type: typeof LAYOUT_TOGGLE_DEBUG
  open: boolean
}

export type LayoutActions =
  LayoutFlipCardAction |
  LayoutToggleDebugAction;

export const toggleDebug = (open: boolean): LayoutToggleDebugAction => ({
  type: LAYOUT_TOGGLE_DEBUG,
  open,
});

export const flipCard = (flipped: boolean): LayoutFlipCardAction => ({
  type: LAYOUT_FLIP_CARD,
  flipped,
});
