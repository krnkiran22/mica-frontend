// Step types as defined in the backend
export type SSEStepType = 
  | 'architecture_planner'
  | 'database_setup'
  | 'node_selector'
  | 'connection_builder'
  | 'node_configurator'
  | 'workflow_saver';

// Status types for each step
export type SSEStatusType = 'started' | 'done' | 'error';

// System event types (not step-based)
export type SSESystemEventType = 'connected' | 'status' | 'status_change' | 'complete' | 'heartbeat' | 'error';

// Step-specific data interfaces (matching backend models exactly)
export interface ArchitecturePlannerData {
  summary: string | string[]; // Input prompt is one string, output is array of node names
}

export interface DatabaseSetupData {
  databases: Array<{
    name: string;
    link: string;
  }>;
}

export interface NodeSelectorData {
  nodes: Array<{
    nodeId: string; // Backend actually sends 'nodeId' field
    name: string;
    description: string;
  }>;
}

export interface ConnectionBuilderData {
  connections: Array<{
    source: string;
    target: string;
  }>;
}

export interface NodeConfiguratorData {
  nodeId: string;
  name: string;
  description: string;
  params: Record<string, any>;
  loop_text: string | null;
}

export interface WorkflowSaverData {
  // Empty as per backend model
}

// Error data model
export interface SSEErrorData {
  message: string;
  code?: number;
  details?: Record<string, any>;
}

// System event data models
export interface SSEConnectedData {
  generation_id: string;
  timestamp?: string;
}

export interface SSEStatusData {
  status: string;
  generation_id: string;
  timestamp?: string;
}

export interface SSEStatusChangeData {
  old_status: string;
  new_status: string;
  generation_id: string;
  timestamp?: string;
}

export interface SSECompleteData {
  final_status: string;
  generation_id: string;
  timestamp?: string;
}

export interface SSEHeartbeatData {
  timestamp: string;
  generation_id: string;
}

// Union type for all possible step data
export type SSEStepData = 
  | ArchitecturePlannerData
  | DatabaseSetupData
  | NodeSelectorData
  | ConnectionBuilderData
  | NodeConfiguratorData
  | WorkflowSaverData
  | SSEErrorData;

// Union type for all possible system event data
export type SSESystemData =
  | SSEConnectedData
  | SSEStatusData
  | SSEStatusChangeData
  | SSECompleteData
  | SSEHeartbeatData;

// Main SSE event structure for step-based events
export interface SSEStepEvent {
  step: SSEStepType;
  status: SSEStatusType;
  data: SSEStepData;
}

// System events (not step-based)
export interface SSESystemEvent {
  type: SSESystemEventType;
  [key: string]: any; // Allow additional properties for flexibility
}

// Union of all possible SSE events
export type SSEEvent = SSEStepEvent | SSESystemEvent;

// Internal types for UI components (normalized from backend data)
export interface InternalWorkflowNode {
  nodeId: string; // Normalized to nodeId for consistency
  name: string;
  description: string;
  status?: 'idle' | 'configuring' | 'configured' | 'generating';
  params?: Record<string, any>;
  loop_text?: string | null;
  // UI-specific properties
  category?: 'Input' | 'Processing' | 'AI' | 'Output';
  icon?: string;
  inputs?: Record<string, any>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  // Mock node properties
  isMock?: boolean;
  // Architecture planner node properties
  isArchitecturePlanner?: boolean;
}

export interface InternalConnection {
  source: string;
  target: string;
  id?: string; // Generated for React Flow
}

export interface InternalDatabaseInfo {
  name: string;
  link: string;
}

// Chat message for UI
export interface ChatMessage {
  id: string;
  type: 'step' | 'error' | 'system' | 'assistant';
  content: string;
  timestamp: Date;
  step?: SSEStepType;
}

// Generation state for UI
export interface GenerationState {
  // Connection state
  currentStep: SSEStepType | null;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  
  // Data state
  chatMessages: ChatMessage[];
  nodes: InternalWorkflowNode[];
  connections: InternalConnection[];
  databaseInfo?: InternalDatabaseInfo;
  
  // Mock data state
  mockNodes: InternalWorkflowNode[];
  hasMockNodes: boolean;
  
  // UI state
  showCanvas: boolean;
  isCollapsed: boolean;
  
  // System state
  generationId?: string;
  status?: string;
} 