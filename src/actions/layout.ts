export const LAYOUT_TOGGLE_SIDEBAR = "LAYOUT_TOGGLE_SIDEBAR";
export interface LayoutToggleSidebarAction {
  type: typeof LAYOUT_TOGGLE_SIDEBAR
  open: boolean
}

export const LAYOUT_FLIP_CARD = "LAYOUT_FLIP_CARD";
export interface LayoutFlipCardAction {
  type: typeof LAYOUT_FLIP_CARD
  flipped: boolean
}

export type LayoutActions =
  LayoutToggleSidebarAction |
  LayoutFlipCardAction;

export const toggleSidebar = (open: boolean): LayoutToggleSidebarAction => ({
  type: LAYOUT_TOGGLE_SIDEBAR,
  open,
});

export const flipCard = (flipped: boolean): LayoutFlipCardAction => ({
  type: LAYOUT_FLIP_CARD,
  flipped,
});
