// Mailchimp API integration types

export interface MailchimpCredential {
  id: string;
  workspace_id: string;
  name: string;
  api_key: string; // This will be encrypted in the database
  data_center?: string; // Extracted from API key (e.g., 'us1', 'us2', etc.)
  is_valid: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MailchimpList {
  id: string;
  name: string;
  contact: {
    company: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  campaign_defaults: {
    from_name: string;
    from_email: string;
    subject: string;
    language: string;
  };
  email_type_option: boolean;
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
    member_count_since_send: number;
  };
  created_at: string;
}

export interface MailchimpMember {
  id: string;
  email_address: string;
  unique_email_id: string;
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  merge_fields: Record<string, any>;
  interests: Record<string, boolean>;
  tags: string[];
  ip_signup?: string;
  timestamp_signup?: string;
  ip_opt?: string;
  timestamp_opt?: string;
  last_changed: string;
  location?: {
    latitude: number;
    longitude: number;
    gmtoff: number;
    dstoff: number;
    country_code: string;
    region: string;
  };
  marketing_permissions?: Array<{
    marketing_permission_id: string;
    text: string;
    enabled: boolean;
  }>;
  source: string;
  created_at: string;
}

export interface MailchimpCampaign {
  id: string;
  type: 'regular' | 'plaintext' | 'absplit' | 'rss' | 'variate';
  recipients: {
    list_id: string;
    segment_text?: string;
    recipient_count: number;
  };
  settings: {
    subject_line: string;
    preview_text?: string;
    title: string;
    from_name: string;
    reply_to: string;
    use_conversation: boolean;
    to_name?: string;
    folder_id?: string;
    authenticate: boolean;
    auto_footer: boolean;
    inline_css: boolean;
    auto_tweet: boolean;
    fb_comments: boolean;
    timewarp: boolean;
    template_id?: number;
    drag_and_drop: boolean;
  };
  tracking: {
    opens: boolean;
    html_clicks: boolean;
    text_clicks: boolean;
    goal_tracking: boolean;
    ecomm360: boolean;
    google_analytics: string;
    clicktale: string;
    salesforce: {
      enabled: boolean;
      campaign?: string;
      notes?: string;
    };
    capsule: {
      enabled: boolean;
      notes?: string;
    };
  };
  rss_opts?: {
    url: string;
    schedule: {
      hour: number;
      daily: 'daily' | 'weekly' | 'monthly';
      weekly?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
      monthly?: number;
    };
    constrain_rss_image: boolean;
  };
  ab_split_opts?: {
    split_test: string;
    pick_winner: string;
    winner_criteria: string;
    test_size: number;
    from_name_a?: string;
    from_name_b?: string;
    reply_email_a?: string;
    reply_email_b?: string;
    subject_a?: string;
    subject_b?: string;
  };
  social_card?: {
    image_url?: string;
    description?: string;
    title?: string;
  };
  delivery_status?: {
    enabled: boolean;
  };
  send_time?: string;
  create_time: string;
  archive_url: string;
  long_archive_url: string;
  status: 'save' | 'paused' | 'schedule' | 'sending' | 'sent' | 'canceled' | 'archived';
  emails_sent?: number;
  content_type: string;
  needs_send_approval?: boolean;
  needs_send_approval_last_updated?: string;
  send_approval_status?: 'approved' | 'denied' | 'pending';
  content?: {
    plain?: string;
    html?: string;
    sections?: Record<string, string>;
    template?: {
      id: number;
      sections?: Record<string, string>;
    };
  };
}

export interface MailchimpTemplate {
  id: number;
  name: string;
  category: 'base' | '1 column' | '2 column' | '3 column' | 'multi column' | 'custom';
  layout: string;
  preview_image?: string;
  date_created: string;
  drag_and_drop: boolean;
  active: boolean;
  folder_id?: string;
  thumbnail?: string;
  created_by?: string;
  edited_by?: string;
}

// API Request/Response types
export interface MailchimpListMembersRequest {
  list_id: string;
  status?: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';
  count?: number;
  offset?: number;
  since_timestamp_opt?: string;
  before_timestamp_opt?: string;
}

export interface MailchimpAddMemberRequest {
  list_id: string;
  email_address: string;
  status?: 'subscribed' | 'pending' | 'transactional';
  merge_fields?: Record<string, any>;
  interests?: Record<string, boolean>;
  tags?: string[];
  update_existing?: boolean;
}

export interface MailchimpErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Service types
export interface MailchimpServiceConfig {
  apiKey: string;
  dataCenter: string;
}

export interface CredentialValidationResult {
  isValid: boolean;
  error?: string;
  dataCenter?: string;
}

export interface MailchimpApiError extends Error {
  status?: number;
  type?: string;
  detail?: string;
}

// Funnel integration types
export interface MailchimpFunnelConfig {
  listId: string;
  tags?: string[];
  doubleOptIn?: boolean;
  welcomeEmail?: boolean;
  mergeFields?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    [key: string]: string;
  };
}

export interface LeadMagnetConfig {
  mailchimp: MailchimpFunnelConfig;
  delivery: {
    emailImmediately?: boolean;
    delayMinutes?: number;
    followupSequence?: string[];
  };
}

// Helper types for common operations
export type MailchimpListSummary = Pick<MailchimpList, 'id' | 'name' | 'stats' | 'created_at'>;

export type MailchimpMemberCreate = Omit<MailchimpMember,
  'id' | 'unique_email_id' | 'last_changed' | 'created_at' | 'marketing_permissions' | 'source'
> & {
  email_address: string;
  status?: 'subscribed' | 'pending' | 'transactional';
};

// Export a union type for all possible API responses
export type MailchimpApiResponse =
  | MailchimpList
  | MailchimpMember
  | MailchimpCampaign
  | MailchimpTemplate
  | { lists: MailchimpList[]; total_items: number }
  | { members: MailchimpMember[]; total_items: number }
  | { campaigns: MailchimpCampaign[]; total_items: number }
  | { templates: MailchimpTemplate[]; total_items: number };