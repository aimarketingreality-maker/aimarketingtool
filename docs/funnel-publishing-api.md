# Funnel Publishing API Documentation

## Overview

The funnel publishing API allows users to publish and unpublish their marketing funnels, making them publicly accessible. This API supports workspace-based organization with proper authentication and authorization.

## API Endpoints

### Publish a Funnel
```
POST /api/workspaces/{workspaceId}/funnels/{funnelId}/publish
```

### Unpublish a Funnel
```
DELETE /api/workspaces/{workspaceId}/funnels/{funnelId}/publish
```

## Authentication

All requests must include a valid JWT token in the Authorization header:

```
Authorization: Bearer {jwt_token}
```

## Permissions

Users must be workspace members with one of the following roles to publish/unpublish funnels:
- `owner` - Full access to all workspace resources
- `admin` - Can manage all funnels and settings
- `editor` - Can create, edit, and publish funnels

Users with `viewer` role can only view published funnels but cannot publish or unpublish them.

## Request Examples

### Publishing a Funnel

```bash
curl -X POST https://your-domain.com/api/workspaces/ws-123/funnels/funnel-456/publish \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"
```

**Successful Response (200):**
```json
{
  "success": true,
  "funnel": {
    "id": "funnel-456",
    "workspace_id": "ws-123",
    "user_id": "user-789",
    "name": "Lead Magnet Funnel",
    "published": true,
    "slug": "lead-magnet-funnel",
    "created_at": "2025-10-07T10:00:00Z",
    "updated_at": "2025-10-07T11:00:00Z",
    "workspace": {
      "id": "ws-123",
      "name": "Marketing Team",
      "slug": "marketing-team"
    }
  },
  "published_url": "https://your-domain.com/f/marketing-team/lead-magnet-funnel",
  "message": "Funnel published successfully!"
}
```

### Unpublishing a Funnel

```bash
curl -X DELETE https://your-domain.com/api/workspaces/ws-123/funnels/funnel-456/publish \
  -H "Authorization: Bearer your-jwt-token"
```

**Successful Response (200):**
```json
{
  "success": true,
  "funnel": {
    "id": "funnel-456",
    "workspace_id": "ws-123",
    "user_id": "user-789",
    "name": "Lead Magnet Funnel",
    "published": false,
    "slug": null,
    "created_at": "2025-10-07T10:00:00Z",
    "updated_at": "2025-10-07T11:30:00Z"
  },
  "message": "Funnel unpublished successfully!"
}
```

## Validation Rules

Before a funnel can be published, it must meet the following criteria:

1. **At least one page**: The funnel must contain one or more pages
2. **Components on each page**: Every page must have at least one component
3. **Component configuration**: All components must have valid configuration
4. **Opt-in form workflows**: Opt-in form components must be connected to n8n workflows

### Validation Error Response (400)
```json
{
  "error": "Funnel validation failed",
  "details": [
    "Page \"Landing Page\" must have at least one component before publishing",
    "Opt-in form on page \"Lead Capture\" must be connected to an n8n workflow before publishing"
  ],
  "summary": {
    "pageCount": 2,
    "componentCount": 3,
    "errors": 2
  }
}
```

## Slug Generation

When a funnel is published, the system automatically generates a unique, SEO-friendly slug based on the funnel name:

1. Convert to lowercase
2. Remove special characters
3. Replace spaces with hyphens
4. Ensure uniqueness within the workspace (adds suffix if needed)

**Examples:**
- "My Lead Magnet" → "my-lead-magnet"
- "My Lead Magnet" (if exists) → "my-lead-magnet-1"
- "My Lead Magnet" (if both exist) → "my-lead-magnet-2"

## Public URL Structure

Published funnels are accessible at:
```
https://your-domain.com/f/{workspace-slug}/{funnel-slug}
```

## Error Handling

### Authentication Errors (401)
```json
{
  "error": "Invalid or expired token"
}
```

### Authorization Errors (403)
```json
{
  "error": "Insufficient permissions to publish funnels in this workspace",
  "requiredRole": "owner, admin, or editor",
  "currentRole": "viewer"
}
```

### Not Found Errors (404)
```json
{
  "error": "Funnel not found in this workspace"
}
```

### Server Errors (500)
```json
{
  "error": "Internal server error",
  "details": "Additional error details in development mode"
}
```

## Database Schema

The API works with the following database tables:

### workspaces
- `id` (uuid, primary key)
- `name` (text)
- `slug` (text, unique)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### workspace_members
- `id` (uuid, primary key)
- `workspace_id` (uuid, foreign key)
- `user_id` (uuid, foreign key)
- `role` (enum: owner, admin, editor, viewer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### funnels
- `id` (uuid, primary key)
- `workspace_id` (uuid, foreign key)
- `user_id` (uuid, foreign key)
- `name` (text)
- `published` (boolean)
- `slug` (text, nullable, unique within workspace)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Audit Logging

All publish and unpublish actions are logged for audit purposes:
- User ID performing the action
- Workspace ID
- Funnel ID
- Action type (publish/unpublish)
- Timestamp

## Security Features

1. **JWT Authentication**: All requests require valid JWT tokens
2. **Row Level Security**: Database queries use workspace-based filtering
3. **Role-Based Access Control**: Only authorized roles can publish/unpublish
4. **Input Validation**: Comprehensive validation of funnel structure
5. **Audit Logging**: All actions are logged for security monitoring

## Development Notes

- API uses Next.js 15 App Router with async params
- Database queries use Supabase client with RLS policies
- TypeScript for type safety
- Comprehensive error handling with detailed messages
- Development mode includes stack traces for debugging

## Rate Limiting

Currently not implemented, but recommended for production:
- Limit publish/unpublish requests per user per hour
- Implement exponential backoff for repeated failures
- Consider workspace-based limits for enterprise accounts