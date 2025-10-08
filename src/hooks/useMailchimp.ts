import { useState, useCallback } from 'react';
import { MailchimpList, MailchimpMember, MailchimpApiError } from '@/types/mailchimp';

interface MailchimpCredential {
  id: string;
  name: string;
  is_valid: boolean;
  last_verified_at: string | null;
  created_at: string;
}

interface UseMailchimpProps {
  workspaceId: string;
  token: string;
}

export function useMailchimp({ workspaceId, token }: UseMailchimpProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/credentials/mailchimp${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, token]);

  // Get all Mailchimp credentials
  const getCredentials = useCallback(async (includeTest = false) => {
    const params = new URLSearchParams({ includeTest: includeTest.toString() });
    return apiCall(`?${params.toString()}`);
  }, [apiCall]);

  // Create a new credential
  const createCredential = useCallback(async (name: string, apiKey: string) => {
    return apiCall('', {
      method: 'POST',
      body: JSON.stringify({ name, apiKey }),
    });
  }, [apiCall]);

  // Update an existing credential
  const updateCredential = useCallback(async (credentialId: string, name: string, apiKey: string) => {
    return apiCall('', {
      method: 'PUT',
      body: JSON.stringify({ credentialId, name, apiKey }),
    });
  }, [apiCall]);

  // Delete a credential
  const deleteCredential = useCallback(async (credentialId: string) => {
    const params = new URLSearchParams({ credentialId });
    return apiCall(`?${params.toString()}`, {
      method: 'DELETE',
    });
  }, [apiCall]);

  // Test a credential
  const testCredential = useCallback(async (credentialId: string, testLists = false) => {
    return apiCall('/test', {
      method: 'POST',
      body: JSON.stringify({ credentialId, testLists }),
    });
  }, [apiCall]);

  // Get lists for a credential
  const getLists = useCallback(async (credentialId: string, limit = 50) => {
    const params = new URLSearchParams({
      credentialId,
      limit: limit.toString()
    });
    return apiCall(`/test?${params.toString()}`);
  }, [apiCall]);

  return {
    loading,
    error,
    getCredentials,
    createCredential,
    updateCredential,
    deleteCredential,
    testCredential,
    getLists,
  };
}

// Hook for managing Mailchimp operations in a funnel context
export function useMailchimpFunnel({ workspaceId, token }: UseMailchimpProps) {
  const mailchimp = useMailchimp({ workspaceId, token });
  const [selectedCredential, setSelectedCredential] = useState<MailchimpCredential | null>(null);
  const [lists, setLists] = useState<MailchimpList[]>([]);

  // Select a credential and fetch its lists
  const selectCredential = useCallback(async (credential: MailchimpCredential) => {
    setSelectedCredential(credential);

    if (credential.is_valid) {
      try {
        const result = await mailchimp.getLists(credential.id);
        setLists(result.lists || []);
      } catch (error) {
        console.error('Failed to fetch lists:', error);
        setLists([]);
      }
    } else {
      setLists([]);
    }
  }, [mailchimp]);

  // Add a subscriber to a list
  const addSubscriber = useCallback(async (
    listId: string,
    email: string,
    options: {
      status?: 'subscribed' | 'pending' | 'transactional';
      mergeFields?: Record<string, string>;
      tags?: string[];
    } = {}
  ) => {
    if (!selectedCredential) {
      throw new Error('No credential selected');
    }

    const response = await fetch('/api/mailchimp/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentialId: selectedCredential.id,
        listId,
        email,
        ...options,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add subscriber');
    }

    return response.json();
  }, [selectedCredential, token]);

  return {
    ...mailchimp,
    selectedCredential,
    lists,
    selectCredential,
    addSubscriber,
    clearSelection: () => {
      setSelectedCredential(null);
      setLists([]);
    },
  };
}

// Helper hook for validating API key format
export function useMailchimpValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
    dataCenter?: string;
  } | null>(null);

  const validateApiKey = useCallback(async (apiKey: string) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Basic format validation
      const apiKeyRegex = /^[a-f0-9]{32}-[a-z0-9-]+$/i;
      const alternativeFormat = /^[a-f0-9-]+\.[a-z0-9-]+\.api\.mailchimp\.com$/i;

      if (!apiKeyRegex.test(apiKey) && !alternativeFormat.test(apiKey)) {
        setValidationResult({
          isValid: false,
          error: 'Invalid API key format. Expected format: key-datacenter (e.g., your-api-key-us1)'
        });
        return false;
      }

      // Extract data center
      let dataCenter: string;
      if (alternativeFormat.test(apiKey)) {
        const match = apiKey.match(/([a-z0-9-]+)\.api\.mailchimp\.com/);
        dataCenter = match ? match[1] : '';
      } else {
        const parts = apiKey.split('-');
        dataCenter = parts.length >= 2 ? parts[parts.length - 1] : '';
      }

      setValidationResult({
        isValid: true,
        dataCenter
      });

      return true;
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: 'Validation failed'
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    isValidating,
    validationResult,
    validateApiKey,
    clearValidation: () => setValidationResult(null),
  };
}