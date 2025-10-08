export interface Workflow {
  id: string;
  user_id: string;
  n8n_workflow_id: string;
  trigger_component_id: string | null;
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  execution_data?: Record<string, any>;
  n8n_execution_id?: string;
  trigger_data?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  n8n_workflow_data: Record<string, any>;
  config_schema?: Record<string, any>;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  workflow_id: string;
  event_type: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  processed: boolean;
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface WorkflowCreateRequest {
  name?: string;
  description?: string;
  n8n_workflow_id: string;
  trigger_component_id?: string;
  config?: Record<string, any>;
  status?: 'active' | 'inactive' | 'draft';
}

export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  n8n_workflow_id?: string;
  trigger_component_id?: string;
  config?: Record<string, any>;
  status?: 'active' | 'inactive' | 'draft';
}

export interface WorkflowExecutionRequest {
  workflow_id: string;
  trigger_data?: Record<string, any>;
  test_mode?: boolean;
}

export interface WorkflowTestRequest {
  workflow_id: string;
  test_data?: Record<string, any>;
}

export interface WebhookPayload {
  event?: string;
  data?: Record<string, any>;
  [key: string]: any;
}

export interface N8nWorkflowData {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, any>;
  }>;
  connections: Record<string, any>;
  settings?: Record<string, any>;
}

export interface WorkflowValidationError {
  field: string;
  message: string;
  code: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: WorkflowValidationError[];
  warnings?: string[];
}

export interface WorkflowStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionStatus: string;
  lastExecutionAt?: string;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface WorkflowExecutionListResponse {
  executions: WorkflowExecution[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}