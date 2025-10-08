import { n8nClient, N8nWorkflowDefinition, N8nWorkflowNode } from './n8n';
import { WorkflowTemplate, WorkflowValidationError, WorkflowValidationResult } from '@/types/workflows';

export interface WorkflowTemplateConfig {
  // Email service configuration
  emailProvider: 'mailchimp' | 'sendgrid' | 'convertkit';
  listId?: string;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;

  // Lead magnet configuration
  leadMagnetType: 'pdf' | 'video' | 'course' | 'template';
  leadMagnetUrl?: string;
  leadMagnetName?: string;

  // Email sequence configuration
  welcomeEmailSubject?: string;
  welcomeEmailContent?: string;
  followUpDays?: number[];
  followUpSubjects?: string[];
  followUpContent?: string[];

  // Form configuration
  formFields?: Array<{
    id: string;
    type: 'email' | 'text' | 'name' | 'phone';
    label: string;
    required: boolean;
    placeholder?: string;
  }>;

  // Tagging and segmentation
  defaultTags?: string[];
  segmentConditions?: Record<string, any>;

  // Webhook configuration
  webhookUrl?: string;
  successRedirectUrl?: string;
  errorRedirectUrl?: string;
}

export interface WorkflowTemplateVariable {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface WorkflowTemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  tags: string[];
  variables: WorkflowTemplateVariable[];
  n8nTemplate: N8nWorkflowDefinition;
  requirements: {
    n8nNodes?: string[];
    credentials?: string[];
    environment?: string[];
  };
}

class WorkflowTemplateManager {
  private templates: Map<string, WorkflowTemplateMetadata> = new Map();
  private templateConfigs: Map<string, WorkflowTemplateConfig> = new Map();

  constructor() {
    this.loadBuiltInTemplates();
  }

  private loadBuiltInTemplates(): void {
    // Load built-in templates from the templates directory
    this.registerLeadMagnetTemplate();
  }

  private registerLeadMagnetTemplate(): void {
    const leadMagnetVariables: WorkflowTemplateVariable[] = [
      {
        key: 'emailProvider',
        label: 'Email Provider',
        type: 'string',
        required: true,
        defaultValue: 'mailchimp',
        description: 'Choose your email service provider',
        validation: { options: ['mailchimp', 'sendgrid', 'convertkit'] }
      },
      {
        key: 'listId',
        label: 'Email List ID',
        type: 'string',
        required: true,
        description: 'The ID of your email list'
      },
      {
        key: 'apiKey',
        label: 'Email Service API Key',
        type: 'string',
        required: true,
        description: 'API key for your email service'
      },
      {
        key: 'fromEmail',
        label: 'From Email',
        type: 'string',
        required: true,
        validation: { pattern: '^[^@]+@[^@]+\.[^@]+$' },
        description: 'Email address to send from'
      },
      {
        key: 'fromName',
        label: 'From Name',
        type: 'string',
        required: true,
        defaultValue: 'Your Company',
        description: 'Name to display in from field'
      },
      {
        key: 'leadMagnetType',
        label: 'Lead Magnet Type',
        type: 'string',
        required: true,
        defaultValue: 'pdf',
        validation: { options: ['pdf', 'video', 'course', 'template'] }
      },
      {
        key: 'leadMagnetUrl',
        label: 'Lead Magnet URL',
        type: 'string',
        required: true,
        description: 'URL to the lead magnet file'
      },
      {
        key: 'leadMagnetName',
        label: 'Lead Magnet Name',
        type: 'string',
        required: true,
        defaultValue: 'Free Guide',
        description: 'Name of the lead magnet'
      },
      {
        key: 'welcomeEmailSubject',
        label: 'Welcome Email Subject',
        type: 'string',
        required: true,
        defaultValue: 'Your Free Guide is Ready!',
        description: 'Subject line for the welcome email'
      },
      {
        key: 'welcomeEmailContent',
        label: 'Welcome Email Content',
        type: 'string',
        required: true,
        defaultValue: 'Here is your free guide. Enjoy!',
        description: 'Content for the welcome email'
      },
      {
        key: 'defaultTags',
        label: 'Default Tags',
        type: 'array',
        required: false,
        defaultValue: ['lead-magnet', 'new-subscriber'],
        description: 'Tags to apply to new subscribers'
      }
    ];

    const leadMagnetTemplate: WorkflowTemplateMetadata = {
      id: 'lead-magnet-workflow',
      name: 'Lead Magnet Funnel Workflow',
      description: 'Complete lead magnet automation with email collection, validation, welcome sequence, and lead delivery',
      category: 'lead-magnet',
      version: '1.0.0',
      author: 'AI Marketing Tool',
      tags: ['lead-magnet', 'email-marketing', 'automation'],
      variables: leadMagnetVariables,
      n8nTemplate: this.createLeadMagnetWorkflowTemplate(),
      requirements: {
        n8nNodes: ['n8n-nodes-base.webhook', 'n8n-nodes-base.mailchimp', 'n8n-nodes-base.sendGrid', 'n8n-nodes-base.httpRequest'],
        credentials: ['mailchimpApi', 'sendGridApi'],
        environment: ['N8N_WEBHOOK_URL']
      }
    };

    this.templates.set(leadMagnetTemplate.id, leadMagnetTemplate);
  }

  private createLeadMagnetWorkflowTemplate(): N8nWorkflowDefinition {
    return {
      nodes: [
        // Webhook trigger for form submissions
        {
          id: 'webhook-trigger',
          name: 'Form Submission Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [240, 300],
          parameters: {
            httpMethod: 'POST',
            path: 'lead-magnet',
            responseMode: 'onReceived',
            options: {
              rawBody: true
            }
          }
        },

        // Validate form data
        {
          id: 'validate-input',
          name: 'Validate Form Data',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.3,
          position: [460, 300],
          parameters: {
            values: [
              {
                name: 'email',
                value: '={{ $json.body.email }}'
              },
              {
                name: 'firstName',
                value: '={{ $json.body.firstName || "" }}'
              },
              {
                name: 'lastName',
                value: '={{ $json.body.lastName || "" }}'
              },
              {
                name: 'phone',
                value: '={{ $json.body.phone || "" }}'
              },
              {
                name: 'formId',
                value: '={{ $json.body.formId }}'
              },
              {
                name: 'leadMagnetType',
                value: '={{ $json.body.leadMagnetType || "pdf" }}'
              },
              {
                name: 'timestamp',
                value: '={{ $now }}'
              }
            ],
            options: {}
          }
        },

        // Check if email is valid
        {
          id: 'validate-email',
          name: 'Validate Email',
          type: 'n8n-nodes-base.switch',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            dataType: 'string',
            value1: '={{ $json.email }}',
            rules: {
              rules: [
                {
                  value2: '',
                  operation: 'regexMatch',
                  output: 0
                }
              ]
            }
          }
        },

        // Add to email list (Mailchimp/SendGrid)
        {
          id: 'add-to-email-list',
          name: 'Add to Email List',
          type: 'n8n-nodes-base.mailchimp',
          typeVersion: 2,
          position: [900, 200],
          parameters: {
            operation: 'addOrUpdate',
            listId: '={{ $credentials.mailchimpApi.listId }}',
            email: '={{ $json.email }}',
            mergeFields: {
              FNAME: '={{ $json.firstName }}',
              LNAME: '={{ $json.lastName }}',
              PHONE: '={{ $json.phone }}'
            },
            tags: '={{ $credentials.defaultTags }}',
            options: {
              doubleOptin: false,
              updateExisting: true
            }
          }
        },

        // Send welcome email
        {
          id: 'send-welcome-email',
          name: 'Send Welcome Email',
          type: 'n8n-nodes-base.sendGrid',
          typeVersion: 2,
          position: [1120, 200],
          parameters: {
            operation: 'send',
            fromEmail: '={{ $credentials.emailService.fromEmail }}',
            fromName: '={{ $credentials.emailService.fromName }}',
            toEmail: '={{ $json.email }}',
            subject: '={{ $credentials.emailService.welcomeEmailSubject }}',
            text: '={{ $credentials.emailService.welcomeEmailContent }}',
            html: '={{ $credentials.emailService.welcomeEmailContent }}',
            options: {}
          }
        },

        // Schedule follow-up emails
        {
          id: 'schedule-followup',
          name: 'Schedule Follow-up',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1.1,
          position: [1340, 200],
          parameters: {
            amount: 1,
            unit: 'days'
          }
        },

        // Send first follow-up
        {
          id: 'send-followup-1',
          name: 'Send Follow-up 1',
          type: 'n8n-nodes-base.sendGrid',
          typeVersion: 2,
          position: [1560, 200],
          parameters: {
            operation: 'send',
            fromEmail: '={{ $credentials.emailService.fromEmail }}',
            fromName: '={{ $credentials.emailService.fromName }}',
            toEmail: '={{ $json.email }}',
            subject: '={{ $credentials.emailService.followUpSubjects[0] }}',
            text: '={{ $credentials.emailService.followUpContent[0] }}',
            html: '={{ $credentials.emailService.followUpContent[0] }}',
            options: {}
          }
        },

        // Lead magnet delivery
        {
          id: 'deliver-lead-magnet',
          name: 'Deliver Lead Magnet',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [900, 400],
          parameters: {
            url: '={{ $credentials.leadMagnet.deliveryUrl }}',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              email: '={{ $json.email }}',
              leadMagnetType: '={{ $json.leadMagnetType }}',
              firstName: '={{ $json.firstName }}',
              timestamp: '={{ $json.timestamp }}'
            },
            options: {}
          }
        },

        // Error handling
        {
          id: 'handle-error',
          name: 'Handle Error',
          type: 'n8n-nodes-base.set',
          typeVersion: 3.3,
          position: [680, 500],
          parameters: {
            values: [
              {
                name: 'error',
                value: '={{ $json.error || "Unknown error" }}'
              },
              {
                name: 'timestamp',
                value: '={{ $now }}'
              },
              {
                name: 'requestId',
                value: '={{ $runIndex }}'
              }
            ],
            options: {}
          }
        },

        // Log error
        {
          id: 'log-error',
          name: 'Log Error',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [900, 500],
          parameters: {
            url: '={{ $credentials.logging.errorWebhook }}',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              error: '={{ $json.error }}',
              timestamp: '={{ $json.timestamp }}',
              requestId: '={{ $json.requestId }}',
              workflow: 'lead-magnet-workflow'
            },
            options: {}
          }
        }
      ],
      connections: {
        'Form Submission Webhook': {
          main: [[{ node: 'Validate Form Data', type: 'main', index: 0 }]]
        },
        'Validate Form Data': {
          main: [[{ node: 'Validate Email', type: 'main', index: 0 }]]
        },
        'Validate Email': {
          main: [
            [{ node: 'Add to Email List', type: 'main', index: 0 }], // Valid email
            [{ node: 'Handle Error', type: 'main', index: 0 }] // Invalid email
          ]
        },
        'Add to Email List': {
          main: [[{ node: 'Send Welcome Email', type: 'main', index: 0 }]]
        },
        'Send Welcome Email': {
          main: [[{ node: 'Deliver Lead Magnet', type: 'main', index: 0 }]]
        },
        'Schedule Follow-up': {
          main: [[{ node: 'Send Follow-up 1', type: 'main', index: 0 }]]
        },
        'Handle Error': {
          main: [[{ node: 'Log Error', type: 'main', index: 0 }]]
        }
      },
      active: false,
      settings: {
        executionOrder: 'v1',
        saveManualExecutions: true,
        callerPolicyDefaultOption: 'workflowsFromSameOwner'
      },
      staticData: {},
      pinData: {}
    };
  }

  /**
   * Get all available workflow templates
   */
  getTemplates(): WorkflowTemplateMetadata[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific workflow template by ID
   */
  getTemplate(templateId: string): WorkflowTemplateMetadata | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplateMetadata[] {
    return Array.from(this.templates.values()).filter(
      template => template.category === category
    );
  }

  /**
   * Validate template configuration
   */
  validateTemplateConfig(templateId: string, config: Partial<WorkflowTemplateConfig>): WorkflowValidationResult {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        isValid: false,
        errors: [{ field: 'templateId', message: 'Template not found', code: 'TEMPLATE_NOT_FOUND' }]
      };
    }

    const errors: WorkflowValidationError[] = [];

    // Validate each variable
    for (const variable of template.variables) {
      const value = config[variable.key as keyof WorkflowTemplateConfig];

      // Check required fields
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: variable.key,
          message: `${variable.label} is required`,
          code: 'REQUIRED_FIELD'
        });
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (variable.type === 'string' && typeof value !== 'string') {
        errors.push({
          field: variable.key,
          message: `${variable.label} must be a string`,
          code: 'INVALID_TYPE'
        });
      }

      if (variable.type === 'array' && !Array.isArray(value)) {
        errors.push({
          field: variable.key,
          message: `${variable.label} must be an array`,
          code: 'INVALID_TYPE'
        });
      }

      // Pattern validation for strings
      if (variable.type === 'string' && variable.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(variable.validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: variable.key,
            message: `${variable.label} format is invalid`,
            code: 'INVALID_FORMAT'
          });
        }
      }

      // Options validation
      if (variable.validation?.options && Array.isArray(variable.validation.options)) {
        if (!variable.validation.options.includes(value as string)) {
          errors.push({
            field: variable.key,
            message: `${variable.label} must be one of: ${variable.validation.options.join(', ')}`,
            code: 'INVALID_OPTION'
          });
        }
      }

      // Email validation
      if (variable.key === 'email' || variable.key === 'fromEmail') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value === 'string' && !emailRegex.test(value)) {
          errors.push({
            field: variable.key,
            message: `${variable.label} must be a valid email address`,
            code: 'INVALID_EMAIL'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Substitute variables in workflow template
   */
  async instantiateTemplate(templateId: string, config: WorkflowTemplateConfig): Promise<N8nWorkflowDefinition> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate configuration
    const validation = this.validateTemplateConfig(templateId, config);
    if (!validation.isValid) {
      throw new Error(`Template configuration is invalid: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Deep clone the template
    const workflow: N8nWorkflowDefinition = JSON.parse(JSON.stringify(template.n8nTemplate));

    // Substitute variables in workflow nodes
    for (const node of workflow.nodes) {
      node.parameters = this.substituteVariables(node.parameters, config);
    }

    // Update workflow name and metadata
    workflow.name = `${template.name} - ${new Date().toISOString().split('T')[0]}`;
    workflow.tags = [...template.tags, 'instantiated'];

    return workflow;
  }

  /**
   * Substitute variables in node parameters
   */
  private substituteVariables(parameters: any, config: WorkflowTemplateConfig): any {
    if (!parameters) return parameters;

    if (Array.isArray(parameters)) {
      return parameters.map(param => this.substituteVariables(param, config));
    }

    if (typeof parameters === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(parameters)) {
        if (typeof value === 'string' && value.includes('{{')) {
          // Handle n8n expressions with our variables
          result[key] = this.substituteN8nExpression(value, config);
        } else if (typeof value === 'object') {
          result[key] = this.substituteVariables(value, config);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return parameters;
  }

  /**
   * Substitute variables in n8n expressions
   */
  private substituteN8nExpression(expression: string, config: WorkflowTemplateConfig): string {
    // Replace template variables in n8n expressions
    let result = expression;

    // Simple variable substitution (this could be enhanced with proper expression parsing)
    const replacements: Record<string, any> = {
      'listId': config.listId,
      'fromEmail': config.fromEmail,
      'fromName': config.fromName,
      'leadMagnetUrl': config.leadMagnetUrl,
      'leadMagnetName': config.leadMagnetName,
      'welcomeEmailSubject': config.welcomeEmailSubject,
      'welcomeEmailContent': config.welcomeEmailContent,
      'defaultTags': config.defaultTags || []
    };

    for (const [key, value] of Object.entries(replacements)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\$\\{?${key}\\}?`, 'g');
        result = result.replace(regex, String(value));
      }
    }

    return result;
  }

  /**
   * Create a workflow from template in n8n
   */
  async createWorkflowFromTemplate(
    templateId: string,
    config: WorkflowTemplateConfig,
    workflowName?: string
  ): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Instantiate the template with configuration
    const workflowDefinition = await this.instantiateTemplate(templateId, config);

    // Create the workflow in n8n
    const workflow = await n8nClient.createWorkflow(
      workflowName || template.name,
      workflowDefinition,
      template.tags
    );

    return workflow.id;
  }

  /**
   * Test workflow template with sample data
   */
  async testTemplate(templateId: string, config: WorkflowTemplateConfig): Promise<any> {
    const workflowDefinition = await this.instantiateTemplate(templateId, config);

    // Create a temporary test workflow
    const testWorkflow = await n8nClient.createWorkflow(
      `Test: ${templateId}`,
      workflowDefinition,
      ['test']
    );

    try {
      // Execute with test data
      const testData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        leadMagnetType: config.leadMagnetType || 'pdf',
        formId: 'test-form'
      };

      const result = await n8nClient.executeWorkflow(testWorkflow.id, testData);
      return result;
    } finally {
      // Clean up test workflow
      await n8nClient.deleteWorkflow(testWorkflow.id);
    }
  }
}

// Export singleton instance
export const workflowTemplateManager = new WorkflowTemplateManager();

// Helper function to create lead magnet configuration
export function createLeadMagnetConfig(overrides: Partial<WorkflowTemplateConfig> = {}): WorkflowTemplateConfig {
  return {
    emailProvider: 'mailchimp',
    leadMagnetType: 'pdf',
    welcomeEmailSubject: 'Your Free Guide is Ready!',
    welcomeEmailContent: 'Thank you for subscribing! Here is your free guide.',
    followUpDays: [1, 3, 7],
    followUpSubjects: [
      'Quick tip to get started',
      'How are you finding the guide?',
      'More resources for you'
    ],
    followUpContent: [
      'Here\'s a quick tip to help you get the most out of your free guide...',
      'I hope you\'re finding the guide helpful! Here are some additional resources...',
      'Here are some more resources that might help you...'
    ],
    formFields: [
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        placeholder: 'Enter your email'
      },
      {
        id: 'firstName',
        type: 'name',
        label: 'First Name',
        required: false,
        placeholder: 'Enter your first name'
      }
    ],
    defaultTags: ['lead-magnet', 'new-subscriber'],
    ...overrides
  };
}