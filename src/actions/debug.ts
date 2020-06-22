export const DEBUG_WRITTEN = "DEBUG_WRITTEN";
export interface DebugWrittenAction {
  type: typeof DEBUG_WRITTEN
  text: string
}

export type DebugActions = DebugWrittenAction;

export const debug = (text: string): DebugWrittenAction => ({
  type: DEBUG_WRITTEN,
  text,
});
