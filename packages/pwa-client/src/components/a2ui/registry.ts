import type { ComponentType } from 'react';
import type { A2UIComponent } from '@shared/a2ui';

export interface Surface {
  id: string;
  components: Map<string, A2UIComponent>;
  rootId: string | null;
  status: string;
}

export interface WidgetProps {
  component: A2UIComponent;
  surface: Surface;
  dataModel: Record<string, unknown>;
  children?: React.ReactNode;
}

// Standard A2UI components
import { A2UIText } from './standard/Text';
import { A2UIButton } from './standard/Button';
import { A2UICard } from './standard/Card';
import { A2UITextField } from './standard/TextField';
import { A2UITabs } from './standard/Tabs';
import { A2UIRow } from './standard/Row';
import { A2UIColumn } from './standard/Column';
import { A2UIList } from './standard/List';
import { A2UIModal } from './standard/Modal';
// OpenClaw custom components
import { CodeBlock } from './openclaw/CodeBlock';
import { TerminalOutput } from './openclaw/TerminalOutput';
import { ApprovalDialog } from './openclaw/ApprovalDialog';
import { ProgressBar } from './openclaw/ProgressBar';
import { StatusBadge } from './openclaw/StatusBadge';

const REGISTRY: Record<string, ComponentType<WidgetProps>> = {
  // Standard A2UI → ShadCN mappings
  Text: A2UIText,
  Button: A2UIButton,
  Card: A2UICard,
  TextField: A2UITextField,
  Tabs: A2UITabs,
  Row: A2UIRow,
  Column: A2UIColumn,
  List: A2UIList,
  Modal: A2UIModal,
  // OpenClaw custom
  CodeBlock: CodeBlock,
  TerminalOutput: TerminalOutput,
  ApprovalDialog: ApprovalDialog as ComponentType<WidgetProps>,
  ProgressBar: ProgressBar,
  StatusBadge: StatusBadge as ComponentType<WidgetProps>,
};

export function resolveWidget(type: string): ComponentType<WidgetProps> | null {
  return REGISTRY[type] ?? null;
}

export function registerWidget(
  type: string,
  component: ComponentType<WidgetProps>,
): void {
  REGISTRY[type] = component;
}
