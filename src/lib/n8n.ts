import axios, { AxiosInstance } from "axios";

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  versionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nWorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  webhookId?: string;
}

export interface N8nWorkflowDefinition {
  nodes: N8nWorkflowNode[];
  connections: Record<string, any>;
  active?: boolean;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  pinData?: Record<string, any>;
  versionId?: string;
  meta?: {
    templateCredsSetupCompleted?: boolean;
    instanceId?: string;
  };
  tags?: string[];
}

export interface N8nExecutionResult {
  data: {
    resultData: {
      runData: Record<string, any>;
      error?: any;
    };
  };
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  status: string;
  id: string;
  workflowId: string;
}

export interface N8nTriggerWebhook {
  webhookUrl: string;
  method: "POST" | "GET";
  headers: Record<string, string>;
  path: string;
}

class N8nClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_URL || "http://localhost:5678";
    this.apiKey = process.env.N8N_API_KEY || "";

    if (!this.apiKey) {
      console.warn("N8N_API_KEY not set, n8n integration will not work");
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.apiKey,
      },
    });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/healthz");
      return response.status === 200;
    } catch (error) {
      console.error("N8N health check failed:", error);
      return false;
    }
  }

  // Workflow management
  async listWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.client.get("/api/v1/workflows");
      return response.data.data || [];
    } catch (error: any) {
      console.error("Failed to list n8n workflows:", error);
      throw new Error(`Failed to list workflows: ${error.message}`);
    }
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflowDefinition> {
    try {
      const response = await this.client.get(`/api/v1/workflows/${workflowId}`);
      return response.data;
    } catch (error: any) {
      console.error("Failed to get n8n workflow:", error);
      throw new Error(`Failed to get workflow: ${error.message}`);
    }
  }

  async createWorkflow(
    name: string,
    definition: N8nWorkflowDefinition,
    tags?: string[]
  ): Promise<N8nWorkflow> {
    try {
      const response = await this.client.post("/api/v1/workflows", {
        name,
        nodes: definition.nodes,
        connections: definition.connections,
        active: false,
        settings: definition.settings || {},
        staticData: definition.staticData || {},
        pinData: definition.pinData || {},
        versionId: definition.versionId,
        tags: tags || [],
      });

      return response.data;
    } catch (error: any) {
      console.error("Failed to create n8n workflow:", error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  async updateWorkflow(
    workflowId: string,
    definition: N8nWorkflowDefinition
  ): Promise<N8nWorkflow> {
    try {
      const response = await this.client.put(`/api/v1/workflows/${workflowId}`, {
        nodes: definition.nodes,
        connections: definition.connections,
        settings: definition.settings || {},
        staticData: definition.staticData || {},
        pinData: definition.pinData || {},
        versionId: definition.versionId,
      });

      return response.data;
    } catch (error: any) {
      console.error("Failed to update n8n workflow:", error);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.post(`/api/v1/workflows/${workflowId}/activate`);
    } catch (error: any) {
      console.error("Failed to activate n8n workflow:", error);
      throw new Error(`Failed to activate workflow: ${error.message}`);
    }
  }

  async deactivateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.post(`/api/v1/workflows/${workflowId}/deactivate`);
    } catch (error: any) {
      console.error("Failed to deactivate n8n workflow:", error);
      throw new Error(`Failed to deactivate workflow: ${error.message}`);
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/workflows/${workflowId}`);
    } catch (error: any) {
      console.error("Failed to delete n8n workflow:", error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  // Execution management
  async executeWorkflow(
    workflowId: string,
    data?: Record<string, any>
  ): Promise<N8nExecutionResult> {
    try {
      const response = await this.client.post(`/api/v1/workflows/${workflowId}/execute`, {
        data,
      });
      return response.data;
    } catch (error: any) {
      console.error("Failed to execute n8n workflow:", error);
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  }

  // Webhook management
  async getWebhookUrl(workflowId: string): Promise<string | null> {
    try {
      const workflow = await this.getWorkflow(workflowId);

      // Find webhook nodes in the workflow
      const webhookNodes = workflow.nodes.filter(
        (node) => node.type.includes("webhook") || node.type.includes("trigger")
      );

      if (webhookNodes.length === 0) {
        return null;
      }

      // Return the webhook URL for the first webhook node
      const webhookNode = webhookNodes[0];
      if (webhookNode.webhookId) {
        return `${this.baseUrl}/webhook/${webhookNode.webhookId}`;
      }

      return null;
    } catch (error: any) {
      console.error("Failed to get webhook URL:", error);
      return null;
    }
  }

  // Template management for pre-built workflows
  async getWorkflowTemplate(templateName: string): Promise<N8nWorkflowDefinition | null> {
    // Define our pre-built workflow templates
    const templates: Record<string, N8nWorkflowDefinition> = {
      "mailchimp-optin": {
        nodes: [
          {
            id: "webhook1",
            name: "Webhook",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [240, 300],
            parameters: {
              httpMethod: "POST",
              path: "optin",
              responseMode: "onReceived",
              options: {},
            },
          },
          {
            id: "mailchimp1",
            name: "Mailchimp",
            type: "n8n-nodes-base.mailchimp",
            typeVersion: 2,
            position: [460, 300],
            parameters: {
              operation: "addOrUpdate",
              listId: "={{ $node['Webhook'].json['listId'] }}",
              email: "={{ $node['Webhook'].json['email'] }}",
              mergeFields: {
                FNAME: "={{ $node['Webhook'].json['firstName'] }}",
                LNAME: "={{ $node['Webhook'].json['lastName'] }}",
              },
              options: {},
            },
          },
        ],
        connections: {
          Webhook: {
            main: [[{ node: "mailchimp1", type: "main", index: 0 }]],
          },
        },
        active: false,
        settings: {},
        staticData: {},
        pinData: {},
      },
      "stripe-payment": {
        nodes: [
          {
            id: "webhook1",
            name: "Stripe Webhook",
            type: "n8n-nodes-base.stripeTrigger",
            typeVersion: 1,
            position: [240, 300],
            parameters: {
              webhook: "checkout.session.completed",
              options: {},
            },
          },
          {
            id: "set1",
            name: "Set Variables",
            type: "n8n-nodes-base.set",
            typeVersion: 3.3,
            position: [460, 300],
            parameters: {
              values: [
                {
                  name: "customerEmail",
                  value: "={{ $json.data.object.customer_details.email }}",
                },
                {
                  name: "amount",
                  value: "={{ $json.data.object.amount_total / 100 }}",
                },
                {
                  name: "productName",
                  value: "={{ $json.data.object.display_items[0].custom.name }}",
                },
              ],
              options: {},
            },
          },
          {
            id: "http1",
            name: "Grant Access",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.1,
            position: [680, 300],
            parameters: {
              url: "={{ $vars.YOUR_API_URL }}/api/grant-access",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: {
                email: "={{ $node['Set Variables'].json['customerEmail'] }}",
                product: "={{ $node['Set Variables'].json['productName'] }}",
                amount: "={{ $node['Set Variables'].json['amount'] }}",
              },
              options: {},
            },
          },
        ],
        connections: {
          "Stripe Webhook": {
            main: [[{ node: "Set Variables", type: "main", index: 0 }]],
          },
          "Set Variables": {
            main: [[{ node: "Grant Access", type: "main", index: 0 }]],
          },
        },
        active: false,
        settings: {},
        staticData: {},
        pinData: {},
      },
    };

    return templates[templateName] || null;
  }
}

// Export singleton instance
export const n8nClient = new N8nClient();

