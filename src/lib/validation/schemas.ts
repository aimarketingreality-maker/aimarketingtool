import { z } from 'zod';

// Common validation schemas
export const IdSchema = z.string().uuid('Invalid ID format');

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SearchSchema = z.object({
  search: z.string().optional(),
  sort: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Funnel validation schemas
export const CreateFunnelSchema = z.object({
  name: z.string()
    .min(1, 'Funnel name is required')
    .max(100, 'Funnel name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Funnel name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  template_id: z.string().optional(),
  workspace_id: z.string().optional(),
});

export const UpdateFunnelSchema = CreateFunnelSchema.partial();

export const PublishFunnelSchema = z.object({
  published: z.boolean(),
  custom_domain: z.string()
    .regex(/^[a-zA-Z0-9\-\.]+$/, 'Invalid domain format')
    .optional(),
});

// Page validation schemas
export const CreatePageSchema = z.object({
  name: z.string()
    .min(1, 'Page name is required')
    .max(100, 'Page name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Page name can only contain letters, numbers, spaces, hyphens, and underscores'),
  slug: z.string()
    .min(1, 'Page slug is required')
    .max(100, 'Page slug must be less than 100 characters')
    .regex(/^[a-z0-9\-]+$/, 'Page slug can only contain lowercase letters, numbers, and hyphens'),
  funnel_id: IdSchema,
});

export const UpdatePageSchema = CreatePageSchema.partial().omit({ funnel_id: true });

// Component validation schemas
export const ComponentConfigSchema = z.record(z.unknown());

export const CreateComponentSchema = z.object({
  type: z.enum([
    'hero-section',
    'opt-in-form',
    'testimonial',
    'countdown-timer',
    'payment-button',
    'video-embed',
    'text-block',
    'image-block',
    'button-block',
    'divider-block'
  ], {
    errorMap: () => ({ message: 'Invalid component type' })
  }),
  order: z.number().int().min(0, 'Order must be a non-negative integer'),
  config: ComponentConfigSchema,
  page_id: IdSchema,
});

export const UpdateComponentSchema = CreateComponentSchema.partial().omit({ page_id: true });

export const BatchUpdateComponentsSchema = z.object({
  components: z.array(z.object({
    id: IdSchema,
    order: z.number().int().min(0),
    config: ComponentConfigSchema.optional(),
  })).min(1, 'At least one component must be provided'),
});

// Authentication validation schemas
export const LoginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email address is too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long'),
});

export const SignupSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email address is too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  full_name: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s\-\.']+$/, 'Full name can only contain letters, spaces, hyphens, periods, and apostrophes'),
});

export const ResetPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email address is too long'),
});

export const UpdatePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

// Workspace validation schemas
export const CreateWorkspaceSchema = z.object({
  name: z.string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'),
  slug: z.string()
    .min(1, 'Workspace slug is required')
    .max(50, 'Workspace slug must be less than 50 characters')
    .regex(/^[a-z0-9\-]+$/, 'Workspace slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

export const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial();

export const InviteMemberSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email address is too long'),
  role: z.enum(['owner', 'admin', 'editor', 'viewer'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
});

// Template validation schemas
export const CreateTemplateSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  category: z.enum(['lead-magnet', 'sales', 'webinar', 'booking', 'custom'], {
    errorMap: () => ({ message: 'Invalid template category' })
  }),
  pages: z.array(z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9\-]+$/),
    components: z.array(z.unknown()).optional(),
  })).min(1, 'At least one page is required'),
});

// Workflow validation schemas
export const CreateWorkflowSchema = z.object({
  name: z.string()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  trigger_type: z.enum(['form_submission', 'button_click', 'webhook'], {
    errorMap: () => ({ message: 'Invalid trigger type' })
  }),
  trigger_component_id: IdSchema.optional(),
  n8n_workflow_id: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export const ExecuteWorkflowSchema = z.object({
  trigger_data: z.record(z.unknown()).optional(),
  test_mode: z.boolean().default(false),
});

// Integration validation schemas
export const MailchimpConfigSchema = z.object({
  api_key: z.string()
    .min(1, 'Mailchimp API key is required')
    .regex(/^[a-f0-9]{32}-[a-z]{2}\d{2}$/, 'Invalid Mailchimp API key format'),
  list_id: z.string()
    .min(1, 'Mailchimp list ID is required')
    .max(50, 'List ID is too long'),
  from_email: z.string()
    .email('Invalid from email address')
    .max(255, 'Email address is too long'),
  from_name: z.string()
    .min(1, 'From name is required')
    .max(100, 'From name is too long'),
});

export const StripeConfigSchema = z.object({
  secret_key: z.string()
    .min(1, 'Stripe secret key is required')
    .regex(/^sk_test_|^sk_live_/, 'Invalid Stripe secret key format'),
  publishable_key: z.string()
    .min(1, 'Stripe publishable key is required')
    .regex(/^pk_test_|^pk_live_/, 'Invalid Stripe publishable key format'),
  webhook_secret: z.string().optional(),
});

// Form submission validation schemas
export const FormSubmissionSchema = z.object({
  funnel_id: IdSchema,
  page_id: IdSchema,
  component_id: IdSchema,
  form_data: z.record(z.unknown()),
  utm_source: z.string().max(255).optional(),
  utm_medium: z.string().max(255).optional(),
  utm_campaign: z.string().max(255).optional(),
  utm_content: z.string().max(255).optional(),
  utm_term: z.string().max(255).optional(),
});

// Webhook validation schemas
export const WebhookEventSchema = z.object({
  event_id: z.string(),
  event_type: z.string(),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  signature: z.string().optional(),
});

// Export all schemas for easy importing
export const ValidationSchemas = {
  // Common
  Id: IdSchema,
  Pagination: PaginationSchema,
  Search: SearchSchema,

  // Funnels
  CreateFunnel: CreateFunnelSchema,
  UpdateFunnel: UpdateFunnelSchema,
  PublishFunnel: PublishFunnelSchema,

  // Pages
  CreatePage: CreatePageSchema,
  UpdatePage: UpdatePageSchema,

  // Components
  CreateComponent: CreateComponentSchema,
  UpdateComponent: UpdateComponentSchema,
  BatchUpdateComponents: BatchUpdateComponentsSchema,

  // Authentication
  Login: LoginSchema,
  Signup: SignupSchema,
  ResetPassword: ResetPasswordSchema,
  UpdatePassword: UpdatePasswordSchema,

  // Workspaces
  CreateWorkspace: CreateWorkspaceSchema,
  UpdateWorkspace: UpdateWorkspaceSchema,
  InviteMember: InviteMemberSchema,

  // Templates
  CreateTemplate: CreateTemplateSchema,

  // Workflows
  CreateWorkflow: CreateWorkflowSchema,
  ExecuteWorkflow: ExecuteWorkflowSchema,

  // Integrations
  MailchimpConfig: MailchimpConfigSchema,
  StripeConfig: StripeConfigSchema,

  // Forms & Webhooks
  FormSubmission: FormSubmissionSchema,
  WebhookEvent: WebhookEventSchema,
};

// Type inference for TypeScript
export type CreateFunnelInput = z.infer<typeof CreateFunnelSchema>;
export type UpdateFunnelInput = z.infer<typeof UpdateFunnelSchema>;
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
export type CreateComponentInput = z.infer<typeof CreateComponentSchema>;
export type UpdateComponentInput = z.infer<typeof UpdateComponentSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type FormSubmissionInput = z.infer<typeof FormSubmissionSchema>;