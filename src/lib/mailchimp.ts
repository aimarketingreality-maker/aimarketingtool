import axios, { AxiosInstance, AxiosError } from 'axios';
import CryptoJS from 'crypto-js';
import {
  MailchimpServiceConfig,
  MailchimpList,
  MailchimpMember,
  MailchimpCampaign,
  MailchimpTemplate,
  MailchimpAddMemberRequest,
  MailchimpListMembersRequest,
  MailchimpErrorResponse,
  CredentialValidationResult,
  MailchimpApiError,
  MailchimpListSummary
} from '@/types/mailchimp';
import { supabaseAdmin } from './db';

// Encryption utilities
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'default-key-change-in-production';

export function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

export function decryptData(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Extract data center from API key
export function extractDataCenter(apiKey: string): string {
  const match = apiKey.match(/([a-z0-9-]+)\.api\.mailchimp\.com/);
  if (match) {
    return match[1];
  }

  // Alternative format: key-datacenter
  const parts = apiKey.split('-');
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }

  throw new Error('Invalid API key format. Expected format: key-datacenter or key.datacenter.api.mailchimp.com');
}

export function validateApiKeyFormat(apiKey: string): boolean {
  // Mailchimp API keys are typically 32-36 characters and contain letters, numbers, and dashes
  const apiKeyRegex = /^[a-f0-9]{32}-[a-z0-9-]+$/i;
  const alternativeFormat = /^[a-f0-9-]+\.[a-z0-9-]+\.api\.mailchimp\.com$/i;

  return apiKeyRegex.test(apiKey) || alternativeFormat.test(apiKey);
}

export class MailchimpService {
  private api: AxiosInstance;
  private dataCenter: string;

  constructor(config: MailchimpServiceConfig) {
    this.dataCenter = config.dataCenter;

    this.api = axios.create({
      baseURL: `https://${config.dataCenter}.api.mailchimp.com/3.0`,
      auth: {
        username: 'anystring', // Mailchimp auth requires a username but only uses the API key
        password: config.apiKey
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<MailchimpErrorResponse>) => {
        const mailchimpError: MailchimpApiError = new Error(
          error.response?.data?.detail || error.message || 'Mailchimp API error'
        );

        mailchimpError.status = error.response?.status;
        mailchimpError.type = error.response?.data?.type;
        mailchimpError.detail = error.response?.data?.detail;

        throw mailchimpError;
      }
    );
  }

  /**
   * Validate API key by testing connection to Mailchimp
   */
  async validateConnection(): Promise<CredentialValidationResult> {
    try {
      // Test by fetching account info
      const response = await this.api.get('/');

      return {
        isValid: true,
        dataCenter: this.dataCenter
      };
    } catch (error) {
      const mailchimpError = error as MailchimpApiError;

      if (mailchimpError.status === 401) {
        return {
          isValid: false,
          error: 'Invalid API key'
        };
      }

      return {
        isValid: false,
        error: mailchimpError.message || 'Failed to connect to Mailchimp'
      };
    }
  }

  /**
   * Get all lists for the account
   */
  async getLists(count: number = 50, offset: number = 0): Promise<{ lists: MailchimpList[]; total: number }> {
    const response = await this.api.get('/lists', {
      params: {
        count,
        offset
      }
    });

    return {
      lists: response.data.lists,
      total: response.data.total_items
    };
  }

  /**
   * Get a specific list by ID
   */
  async getList(listId: string): Promise<MailchimpList> {
    const response = await this.api.get(`/lists/${listId}`);
    return response.data;
  }

  /**
   * Get list summary (lighter version)
   */
  async getListSummaries(): Promise<MailchimpListSummary[]> {
    const { lists } = await this.getLists(100);

    return lists.map(list => ({
      id: list.id,
      name: list.name,
      stats: list.stats,
      created_at: list.created_at
    }));
  }

  /**
   * Get members of a specific list
   */
  async getListMembers(request: MailchimpListMembersRequest): Promise<{ members: MailchimpMember[]; total: number }> {
    const { list_id, status, count = 50, offset = 0, since_timestamp_opt, before_timestamp_opt } = request;

    const params: any = {
      count,
      offset
    };

    if (status) params.status = status;
    if (since_timestamp_opt) params.since_timestamp_opt = since_timestamp_opt;
    if (before_timestamp_opt) params.before_timestamp_opt = before_timestamp_opt;

    const response = await this.api.get(`/lists/${list_id}/members`, { params });

    return {
      members: response.data.members,
      total: response.data.total_items
    };
  }

  /**
   * Add a member to a list
   */
  async addMember(request: MailchimpAddMemberRequest): Promise<MailchimpMember> {
    const {
      list_id,
      email_address,
      status = 'pending',
      merge_fields = {},
      interests = {},
      tags = [],
      update_existing = true
    } = request;

    const response = await this.api.post(`/lists/${list_id}/members`, {
      email_address,
      status,
      merge_fields,
      interests,
      tags,
      update_existing
    });

    return response.data;
  }

  /**
   * Update a member in a list
   */
  async updateMember(listId: string, email: string, updates: Partial<MailchimpMember>): Promise<MailchimpMember> {
    const response = await this.api.patch(`/lists/${listId}/members/${this.getSubscriberHash(email)}`, updates);
    return response.data;
  }

  /**
   * Remove a member from a list
   */
  async removeMember(listId: string, email: string): Promise<void> {
    await this.api.delete(`/lists/${listId}/members/${this.getSubscriberHash(email)}`);
  }

  /**
   * Get campaigns
   */
  async getCampaigns(count: number = 50, offset: number = 0): Promise<{ campaigns: MailchimpCampaign[]; total: number }> {
    const response = await this.api.get('/campaigns', {
      params: {
        count,
        offset
      }
    });

    return {
      campaigns: response.data.campaigns,
      total: response.data.total_items
    };
  }

  /**
   * Get templates
   */
  async getTemplates(count: number = 50, offset: number = 0): Promise<{ templates: MailchimpTemplate[]; total: number }> {
    const response = await this.api.get('/templates', {
      params: {
        count,
        offset
      }
    });

    return {
      templates: response.data.templates,
      total: response.data.total_items
    };
  }

  /**
   * Test webhook configuration
   */
  async testWebhook(listId: string, webhookUrl: string): Promise<boolean> {
    try {
      await this.api.post(`/lists/${listId}/webhooks`, {
        url: webhookUrl,
        events: {
          subscribe: true,
          unsubscribe: true,
          profile: true,
          cleaned: true,
          campaign: true
        },
        sources: {
          user: true,
          admin: true,
          api: true
        }
      });

      // Clean up the test webhook
      await this.deleteWebhook(listId, webhookUrl);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(listId: string, webhookUrl: string): Promise<void> {
    // First find the webhook ID
    const response = await this.api.get(`/lists/${listId}/webhooks`);
    const webhook = response.data.webhooks.find((w: any) => w.url === webhookUrl);

    if (webhook) {
      await this.api.delete(`/lists/${listId}/webhooks/${webhook.id}`);
    }
  }

  /**
   * Helper method to generate subscriber hash (MD5 of lowercase email)
   */
  private getSubscriberHash(email: string): string {
    return CryptoJS.MD5(email.toLowerCase()).toString();
  }

  /**
   * Get API limits and usage
   */
  async getApiLimits(): Promise<any> {
    const response = await this.api.get('/');
    return {
      account_name: response.data.account_name,
      total_subscribers: response.data.total_subscribers,
      contact_count: response.data.contact_count
    };
  }
}

// Factory function to create MailchimpService instance from encrypted credentials
export async function createMailchimpService(credentialId: string): Promise<MailchimpService> {
  // Retrieve encrypted credentials from database
  const { data: credential, error } = await supabaseAdmin
    .from('credentials')
    .select('encrypted_data')
    .eq('id', credentialId)
    .eq('service', 'mailchimp')
    .single();

  if (error || !credential) {
    throw new Error('Mailchimp credential not found');
  }

  // Decrypt the credentials
  try {
    const decryptedData = JSON.parse(decryptData(credential.encrypted_data as string));

    if (!decryptedData.apiKey) {
      throw new Error('Invalid credential format');
    }

    const dataCenter = decryptedData.dataCenter || extractDataCenter(decryptedData.apiKey);

    return new MailchimpService({
      apiKey: decryptedData.apiKey,
      dataCenter
    });
  } catch (error) {
    throw new Error('Failed to decrypt Mailchimp credentials');
  }
}

// Credential management functions
export async function storeMailchimpCredential(
  workspaceId: string,
  name: string,
  apiKey: string
): Promise<string> {
  // Validate API key format
  if (!validateApiKeyFormat(apiKey)) {
    throw new Error('Invalid API key format');
  }

  const dataCenter = extractDataCenter(apiKey);

  // Encrypt the credentials
  const encryptedData = encryptData(JSON.stringify({
    apiKey,
    dataCenter
  }));

  // Test the credentials
  const testService = new MailchimpService({ apiKey, dataCenter });
  const validation = await testService.validateConnection();

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid API key');
  }

  // Store in database
  const { data, error } = await supabaseAdmin
    .from('credentials')
    .insert({
      workspace_id: workspaceId,
      service: 'mailchimp',
      name,
      encrypted_data: encryptedData,
      is_valid: true,
      last_verified_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to store credentials');
  }

  return data.id;
}

export async function updateMailchimpCredential(
  credentialId: string,
  name: string,
  apiKey: string
): Promise<void> {
  // Validate API key format
  if (!validateApiKeyFormat(apiKey)) {
    throw new Error('Invalid API key format');
  }

  const dataCenter = extractDataCenter(apiKey);

  // Encrypt the credentials
  const encryptedData = encryptData(JSON.stringify({
    apiKey,
    dataCenter
  }));

  // Test the credentials
  const testService = new MailchimpService({ apiKey, dataCenter });
  const validation = await testService.validateConnection();

  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid API key');
  }

  // Update in database
  const { error } = await supabaseAdmin
    .from('credentials')
    .update({
      name,
      encrypted_data: encryptedData,
      is_valid: true,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', credentialId);

  if (error) {
    throw new Error('Failed to update credentials');
  }
}

export async function deleteMailchimpCredential(credentialId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('credentials')
    .delete()
    .eq('id', credentialId)
    .eq('service', 'mailchimp');

  if (error) {
    throw new Error('Failed to delete credentials');
  }
}

export async function getMailchimpCredentials(workspaceId: string): Promise<Array<{
  id: string;
  name: string;
  is_valid: boolean;
  last_verified_at: string | null;
  created_at: string;
}>> {
  const { data, error } = await supabaseAdmin
    .from('credentials')
    .select('id, name, is_valid, last_verified_at, created_at')
    .eq('workspace_id', workspaceId)
    .eq('service', 'mailchimp')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch credentials');
  }

  return data || [];
}