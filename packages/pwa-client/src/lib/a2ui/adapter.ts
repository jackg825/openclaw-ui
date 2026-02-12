import type { A2UIComponent } from '@shared/a2ui';

/** Traverse a dot-notation path into a nested object */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Resolve binding expressions from component bindings against the data model.
 * Merges resolved bindings with static props (bindings take precedence).
 */
export function resolveBindings(
  component: A2UIComponent,
  dataModel: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = { ...component.props };

  if (component.bindings) {
    for (const [propName, dataPath] of Object.entries(component.bindings)) {
      const value = getNestedValue(dataModel, dataPath);
      if (value !== undefined) {
        resolved[propName] = value;
      }
    }
  }

  return resolved;
}
