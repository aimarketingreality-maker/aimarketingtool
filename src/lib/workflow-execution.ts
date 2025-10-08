import { supabaseAdmin } from "./db";
import { Workflow, WorkflowExecution, WorkflowValidationResult, WorkflowValidationError } from "@/types/workflows";

/**
 * Workflow execution service for managing n8n workflow executions
 */
export class WorkflowExecutionService {
  private static instance: WorkflowExecutionService;

  static getInstance(): WorkflowExecutionService {
    if (!WorkflowExecutionService.instance) {
      WorkflowExecutionService.instance = new WorkflowExecutionService();
    }
    return WorkflowExecutionService.instance;
  }

  /**
   * Validate workflow before execution
   */
  async validateWorkflow(workflowId: string): Promise<WorkflowValidationResult> {
    const errors: WorkflowValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Get workflow details
      const { data: workflow, error } = await supabaseAdmin
        .from("workflows")
        .select("*")
        .eq("id", workflowId)
        .single();

      if (error || !workflow) {
        errors.push({
          field: "workflow",
          message: "Workflow not found",
          code: "WORKFLOW_NOT_FOUND"
        });
        return { isValid: false, errors, warnings };
      }

      // Check if workflow is active
      if (workflow.status !== 'active') {
        errors.push({
          field: "status",
          message: "Workflow is not active",
          code: "WORKFLOW_INACTIVE"
        });
      }

      // Validate n8n workflow exists and is accessible
      try {
        const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${workflow.n8n_workflow_id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!n8nResponse.ok) {
          errors.push({
            field: "n8n_workflow_id",
            message: "n8n workflow is not accessible",
            code: "N8N_WORKFLOW_UNAVAILABLE"
          });
        } else {
          const n8nWorkflow = await n8nResponse.json();

          // Validate n8n workflow structure
          if (!n8nWorkflow.nodes || n8nWorkflow.nodes.length === 0) {
            errors.push({
              field: "n8n_workflow",
              message: "n8n workflow has no nodes",
              code: "N8N_WORKFLOW_EMPTY"
            });
          }

          // Check for trigger nodes
          const hasTrigger = n8nWorkflow.nodes.some((node: any) =>
            node.type.includes('trigger') || node.type.includes('webhook')
          );

          if (!hasTrigger) {
            warnings.push("n8n workflow has no trigger nodes - it may need to be triggered manually");
          }

          // Check for active nodes
          if (!n8nWorkflow.active) {
            warnings.push("n8n workflow is not active in n8n");
          }
        }
      } catch (n8nError) {
        errors.push({
          field: "n8n_connection",
          message: "Failed to connect to n8n",
          code: "N8N_CONNECTION_ERROR"
        });
      }

      // Check for recently failed executions
      const { data: recentFailures } = await supabaseAdmin
        .from("workflow_executions")
        .select("id")
        .eq("workflow_id", workflowId)
        .eq("status", "failed")
        .gte("started_at", new Date(Date.now() - 3600000).toISOString()) // Last hour
        .limit(5);

      if (recentFailures && recentFailures.length >= 3) {
        warnings.push("Workflow has failed multiple times in the last hour");
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error("Error validating workflow:", error);
      errors.push({
        field: "validation",
        message: "Failed to validate workflow",
        code: "VALIDATION_ERROR"
      });
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Execute workflow with trigger data
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any> = {},
    options: {
      testMode?: boolean;
      userId?: string;
      source?: 'api' | 'webhook' | 'scheduled';
    } = {}
  ): Promise<WorkflowExecution> {
    const { testMode = false, userId, source = 'api' } = options;

    // Validate workflow first
    const validation = await this.validateWorkflow(workflowId);
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Get workflow details
    const { data: workflow, error } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (error || !workflow) {
      throw new Error("Workflow not found");
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabaseAdmin
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        started_at: new Date().toISOString(),
        trigger_data: {
          ...triggerData,
          test_mode: testMode,
          source,
          user_id: userId,
          execution_timestamp: new Date().toISOString(),
        },
        test_mode: testMode,
      })
      .select()
      .single();

    if (executionError || !execution) {
      throw new Error(`Failed to create execution record: ${executionError?.message}`);
    }

    try {
      // Execute workflow via n8n API
      const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${workflow.n8n_workflow_id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: execution.trigger_data,
          runData: {},
          startNodes: [],
          destinationNode: null,
          executionMode: testMode ? 'manual' : 'trigger',
        }),
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n API error: ${n8nResponse.statusText}`);
      }

      const n8nExecution = await n8nResponse.json();

      // Update execution record with n8n execution ID
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: 'running',
          n8n_execution_id: n8nExecution.data?.executionId || n8nExecution.id,
          execution_data: n8nExecution,
        })
        .eq("id", execution.id);

      return {
        ...execution,
        status: 'running',
        n8n_execution_id: n8nExecution.data?.executionId || n8nExecution.id,
        execution_data: n8nExecution,
      };

    } catch (n8nError) {
      console.error("Error executing n8n workflow:", n8nError);

      // Update execution record with error
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (n8nError as Error).message,
        })
        .eq("id", execution.id);

      throw new Error(`Failed to execute workflow: ${(n8nError as Error).message}`);
    }
  }

  /**
   * Get execution status and update if needed
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    // Get execution from database
    const { data: execution, error } = await supabaseAdmin
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (error || !execution) {
      throw new Error("Execution not found");
    }

    // If execution is still running and has n8n execution ID, check n8n status
    if (execution.status === 'running' && execution.n8n_execution_id) {
      try {
        const n8nResponse = await fetch(
          `${process.env.N8N_API_URL}/executions/${execution.n8n_execution_id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (n8nResponse.ok) {
          const n8nExecution = await n8nResponse.json();

          // Update execution status based on n8n status
          let newStatus = execution.status;
          let completedAt = execution.completed_at;
          let errorMessage = execution.error_message;

          if (n8nExecution.finished) {
            if (n8nExecution.stoppedAt) {
              newStatus = 'completed';
              completedAt = n8nExecution.stoppedAt;
            } else if (n8nExecution.mode === 'error') {
              newStatus = 'failed';
              completedAt = n8nExecution.stoppedAt;
              errorMessage = n8nExecution.data?.resultData?.error?.message || 'Execution failed';
            }
          }

          // Update execution record if status changed
          if (newStatus !== execution.status) {
            await supabaseAdmin
              .from("workflow_executions")
              .update({
                status: newStatus,
                completed_at: completedAt,
                error_message: errorMessage,
                execution_data: n8nExecution,
              })
              .eq("id", executionId);

            return {
              ...execution,
              status: newStatus,
              completed_at: completedAt,
              error_message: errorMessage,
              execution_data: n8nExecution,
            };
          }
        }
      } catch (n8nError) {
        console.error("Error checking n8n execution status:", n8nError);
        // Don't fail the request if n8n status check fails
      }
    }

    return execution;
  }

  /**
   * Cancel running execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    // Get execution from database
    const { data: execution, error } = await supabaseAdmin
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (error || !execution) {
      throw new Error("Execution not found");
    }

    if (!['pending', 'running'].includes(execution.status)) {
      throw new Error(`Cannot cancel execution with status: ${execution.status}`);
    }

    // Cancel execution in n8n if it has an n8n execution ID
    if (execution.n8n_execution_id) {
      try {
        const n8nResponse = await fetch(
          `${process.env.N8N_API_URL}/executions/${execution.n8n_execution_id}/cancel`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!n8nResponse.ok) {
          console.error("Failed to cancel n8n execution:", n8nResponse.statusText);
          // Don't throw error, just update local status
        }
      } catch (n8nError) {
        console.error("Error cancelling n8n execution:", n8nError);
        // Don't throw error, just update local status
      }
    }

    // Update execution status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from("workflow_executions")
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    if (updateError) {
      throw new Error(`Failed to update execution status: ${updateError.message}`);
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStatistics(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    runningExecutions: number;
    averageExecutionTime: number;
    lastExecutionStatus: string;
    lastExecutionAt?: string;
  }> {
    const { data: executions, error } = await supabaseAdmin
      .from("workflow_executions")
      .select("status, started_at, completed_at")
      .eq("workflow_id", workflowId);

    if (error) {
      throw new Error(`Failed to fetch executions: ${error.message}`);
    }

    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(e => e.status === 'completed').length || 0;
    const failedExecutions = executions?.filter(e => e.status === 'failed').length || 0;
    const runningExecutions = executions?.filter(e => e.status === 'running').length || 0;

    // Calculate average execution time for completed executions
    const completedExecutions = executions?.filter(e =>
      e.status === 'completed' && e.started_at && e.completed_at
    ) || [];

    let averageExecutionTime = 0;
    if (completedExecutions.length > 0) {
      const totalTime = completedExecutions.reduce((sum, exec) => {
        const start = new Date(exec.started_at).getTime();
        const end = new Date(exec.completed_at!).getTime();
        return sum + (end - start);
      }, 0);
      averageExecutionTime = totalTime / completedExecutions.length / 1000; // Convert to seconds
    }

    // Get last execution
    const lastExecution = executions?.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      runningExecutions,
      averageExecutionTime,
      lastExecutionStatus: lastExecution?.status || 'none',
      lastExecutionAt: lastExecution?.started_at,
    };
  }
}

// Export singleton instance
export const workflowExecutionService = WorkflowExecutionService.getInstance();