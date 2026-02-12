// A2UI (Agent-to-UI) JSONL message types

export interface A2UIComponent {
  id: string;
  type: string;
  parentId?: string;
  props: Record<string, unknown>;
  bindings?: Record<string, string>; // dataModel key bindings
  children?: string[]; // child component IDs
}

export interface BeginRenderingMessage {
  type: 'beginRendering';
  surfaceId: string;
  mode?: 'replace' | 'append';
}

export interface SurfaceUpdateMessage {
  type: 'surfaceUpdate';
  surfaceId: string;
  components: A2UIComponent[];
}

export interface DataModelUpdateMessage {
  type: 'dataModelUpdate';
  surfaceId: string;
  path: string;
  value: unknown;
}

export interface DeleteSurfaceMessage {
  type: 'deleteSurface';
  surfaceId: string;
}

export type A2UIMessage =
  | BeginRenderingMessage
  | SurfaceUpdateMessage
  | DataModelUpdateMessage
  | DeleteSurfaceMessage;
