# Funnel Publishing API Test Examples

## API Endpoint
`POST /api/workspaces/{workspaceId}/funnels/{funnelId}/publish`
`DELETE /api/workspaces/{workspaceId}/funnels/{funnelId}/publish`

## Authentication
Authorization: Bearer {jwt_token}

## POST Request Examples

### 1. Publish a Funnel Successfully
```bash
curl -X POST http://localhost:3000/api/workspaces/ws-123/funnels/funnel-456/publish \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"
```

**Success Response (200):**
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
  "published_url": "https://example.com/f/marketing-team/lead-magnet-funnel",
  "message": "Funnel published successfully!"
}
```

### 2. Already Published Funnel
**Response (200):**
```json
{
  "success": true,
  "funnel": { /* funnel details */ },
  "published_url": "https://example.com/f/marketing-team/lead-magnet-funnel",
  "message": "Funnel is already published"
}
```

### 3. Validation Errors
**Response (400):**
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

### 4. Permission Denied
**Response (403):**
```json
{
  "error": "Insufficient permissions to publish funnels in this workspace",
  "requiredRole": "owner, admin, or editor",
  "currentRole": "viewer"
}
```

### 5. Funnel Not Found
**Response (404):**
```json
{
  "error": "Funnel not found in this workspace"
}
```

### 6. Invalid Token
**Response (401):**
```json
{
  "error": "Invalid or expired token"
}
```

## DELETE Request Examples

### 1. Unpublish a Funnel Successfully
```bash
curl -X DELETE http://localhost:3000/api/workspaces/ws-123/funnels/funnel-456/publish \
  -H "Authorization: Bearer your-jwt-token"
```

**Success Response (200):**
```json
{
  "success": true,
  "funnel": {
    "id": "funnel-456",
    "published": false,
    "slug": null,
    /* other funnel details */
  },
  "message": "Funnel unpublished successfully!"
}
```

### 2. Already Unpublished Funnel
**Response (200):**
```json
{
  "success": true,
  "funnel": { /* funnel details */ },
  "message": "Funnel is already unpublished"
}
```

## URL Structure
Published funnels will be accessible at: `https://your-domain.com/f/{workspace-slug}/{funnel-slug}`

## Error Handling
- All errors include appropriate HTTP status codes
- Detailed error messages for validation failures
- Audit logging for all publish/unpublish actions
- Development mode includes stack traces for debugging