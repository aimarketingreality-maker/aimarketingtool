# Mailchimp Integration Guide

This guide explains how to use the Mailchimp credential service for the marketing funnel builder.

## Overview

The Mailchimp integration allows you to:
- Securely store Mailchimp API keys
- Validate API credentials
- Manage email lists and subscribers
- Integrate with lead magnet funnels
- Track campaign performance

## Setup

### 1. Database Setup

First, run the SQL script to create the credentials table:

```sql
-- Run this script in your Supabase SQL editor
-- See: scripts/setup-credentials-table.sql
```

### 2. Environment Variables

Set up the encryption key in your `.env.local` file:

```env
# Generate a secure random key for credential encryption
CREDENTIALS_ENCRYPTION_KEY=your-secure-encryption-key-here
```

You can generate a secure key with:
```bash
openssl rand -base64 32
```

### 3. Dependencies

The integration uses these additional packages:
- `crypto-js` - For credential encryption
- `axios` - For Mailchimp API calls
- `@types/crypto-js` - TypeScript types

## API Endpoints

### Credential Management

#### GET /api/workspaces/[workspaceId]/credentials/mailchimp
List all Mailchimp credentials for a workspace.

**Query Parameters:**
- `includeTest` (boolean): Test the first valid credential

**Response:**
```json
{
  "credentials": [
    {
      "id": "uuid",
      "name": "Main Mailchimp Account",
      "is_valid": true,
      "last_verified_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "testResult": {
    "credentialId": "uuid",
    "credentialName": "Main Mailchimp Account",
    "isValid": true,
    "testedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /api/workspaces/[workspaceId]/credentials/mailchimp
Create a new Mailchimp credential.

**Request Body:**
```json
{
  "name": "Main Mailchimp Account",
  "apiKey": "your-api-key-us1"
}
```

#### PUT /api/workspaces/[workspaceId]/credentials/mailchimp
Update an existing Mailchimp credential.

**Request Body:**
```json
{
  "credentialId": "uuid",
  "name": "Updated Account Name",
  "apiKey": "new-api-key-here"
}
```

#### DELETE /api/workspaces/[workspaceId]/credentials/mailchimp?credentialId=uuid
Delete a Mailchimp credential.

### Testing and Validation

#### POST /api/workspaces/[workspaceId]/credentials/mailchimp/test
Test a Mailchimp credential's validity.

**Request Body:**
```json
{
  "credentialId": "uuid",
  "testLists": true
}
```

**Response:**
```json
{
  "testResult": {
    "credentialId": "uuid",
    "credentialName": "Main Mailchimp Account",
    "isValid": true,
    "lists": {
      "count": 5,
      "data": [
        {
          "id": "list1",
          "name": "Newsletter Subscribers",
          "stats": {
            "member_count": 1500,
            "unsubscribe_count": 25
          }
        }
      ]
    },
    "testedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /api/workspaces/[workspaceId]/credentials/mailchimp/test?credentialId=uuid
Get Mailchimp lists for a credential.

**Query Parameters:**
- `credentialId` (string): The credential ID
- `limit` (number): Maximum number of lists to return (default: 50)

## Usage Examples

### 1. Adding a Mailchimp Credential

```typescript
const response = await fetch('/api/workspaces/workspace-id/credentials/mailchimp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Main Account',
    apiKey: 'your-api-key-us1'
  })
});

const result = await response.json();
```

### 2. Testing Credentials

```typescript
const testResponse = await fetch('/api/workspaces/workspace-id/credentials/mailchimp/test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credentialId: 'credential-uuid',
    testLists: true
  })
});

const testResult = await testResponse.json();
```

### 3. Using the Mailchimp Service

```typescript
import { createMailchimpService } from '@/lib/mailchimp';

// Create service instance from credential
const mailchimpService = await createMailchimpService('credential-id');

// Get lists
const { lists } = await mailchimpService.getLists();

// Add subscriber
const member = await mailchimpService.addMember({
  list_id: 'list-id',
  email_address: 'user@example.com',
  status: 'subscribed',
  merge_fields: {
    FNAME: 'John',
    LNAME: 'Doe'
  }
});
```

## Funnel Integration

### Lead Magnet Configuration

When configuring a lead magnet funnel with Mailchimp:

```typescript
interface MailchimpFunnelConfig {
  listId: string;
  tags?: string[];
  doubleOptIn?: boolean;
  welcomeEmail?: boolean;
  mergeFields?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
  };
}
```

### Example Funnel Component

```typescript
// In your funnel component configuration
{
  type: 'optin-form',
  config: {
    mailchimpCredentialId: 'credential-uuid',
    mailchimpListId: 'list-uuid',
    doubleOptIn: false,
    tags: ['lead-magnet', 'free-download'],
    mergeFields: {
      firstName: 'FIRST_NAME',
      lastName: 'LAST_NAME'
    }
  }
}
```

## Security Considerations

1. **API Key Storage**: All API keys are encrypted using AES encryption before database storage
2. **Workspace Isolation**: Credentials are scoped to specific workspaces with row-level security
3. **Permission Control**: Only workspace owners and admins can manage credentials
4. **Validation**: Credentials are validated against the Mailchimp API before storage
5. **Audit Trail**: All credential operations are tracked with timestamps

## Error Handling

### Common Errors

1. **Invalid API Key Format**
   - Format: `key-datacenter` (e.g., `your-api-key-us1`)
   - Get your key from Mailchimp: Account > Extras > API keys

2. **Authentication Errors**
   - Check that the API key is valid
   - Verify the data center is correct
   - Ensure the account has the necessary permissions

3. **Rate Limiting**
   - Mailchimp API has rate limits
   - Implement exponential backoff for retries
   - Monitor API usage in your Mailchimp account

## API Rate Limits

Mailchimp imposes the following rate limits:
- **Standard Plans**: 10 requests per second
- **Premium Plans**: Higher limits based on plan

The service includes:
- Request timeout (30 seconds)
- Automatic retry logic for certain errors
- Rate limit detection and handling

## Testing

### Unit Tests

```typescript
import { validateApiKeyFormat, extractDataCenter } from '@/lib/mailchimp';

// Test API key validation
expect(validateApiKeyFormat('your-api-key-us1')).toBe(true);
expect(validateApiKeyFormat('invalid-key')).toBe(false);

// Test data center extraction
expect(extractDataCenter('your-api-key-us1')).toBe('us1');
```

### Integration Tests

The API endpoints can be tested using the test endpoints provided. Make sure to:
1. Create test credentials in a development workspace
2. Use the test endpoints to validate connectivity
3. Verify list access and subscriber management

## Troubleshooting

### Common Issues

1. **"Failed to decrypt credentials"**
   - Check your `CREDENTIALS_ENCRYPTION_KEY` environment variable
   - Ensure the key is the same as when credentials were stored

2. **"Invalid API key format"**
   - Verify the API key format matches Mailchimp requirements
   - Get a new API key from your Mailchimp account

3. **"Insufficient permissions"**
   - Check your workspace role (must be owner or admin to manage credentials)
   - Verify you're using the correct workspace ID

4. **"Failed to connect to Mailchimp"**
   - Check network connectivity
   - Verify the data center is correct
   - Test the API key manually with curl or Postman

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed error messages in API responses.

## Migration from Existing Systems

If you're migrating from another system:

1. **Export existing API keys**
2. **Import using the API endpoints**
3. **Update funnel configurations**
4. **Test all integrations**
5. **Update any hardcoded API keys in code**

## Support

For issues with the Mailchimp integration:
1. Check the Supabase logs for database errors
2. Review the browser console for client-side errors
3. Verify API key validity in Mailchimp dashboard
4. Test connectivity with the test endpoints

## API Reference

For complete Mailchimp API documentation:
- [Mailchimp API v3 Reference](https://mailchimp.com/developer/api/marketing/)
- [Authentication Guide](https://mailchimp.com/developer/marketing/docs/fundamentals/)
- [Rate Limits](https://mailchimp.com/developer/marketing/docs/fundamentals/#api-limits)