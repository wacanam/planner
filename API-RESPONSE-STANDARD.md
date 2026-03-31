# API Response Format Standard

All Ministry Planner API endpoints must follow this standardized response format for consistency, error handling, and client-side error recovery.

## Success Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "timestamp": "2026-03-31T13:50:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Fields:**
- `success` (boolean) - Always `true` for successful responses
- `data` (T) - Response payload (can be any type)
- `message` (string, optional) - Human-readable success message
- `timestamp` (ISO 8601) - Server timestamp when response was generated
- `requestId` (UUID) - Unique identifier for tracking requests in logs

**HTTP Status Codes:**
- `200 OK` - Standard success response
- `201 Created` - Resource created successfully
- `204 No Content` - Success with no response body

## Paginated Response Format

```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "..." },
    { "id": "...", "name": "..." }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasMore": true
  },
  "timestamp": "2026-03-31T13:50:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Pagination Fields:**
- `total` (number) - Total number of records
- `page` (number) - Current page (1-indexed)
- `limit` (number) - Records per page
- `totalPages` (number) - Total number of pages
- `hasMore` (boolean) - Whether more records exist

**Usage:**
```bash
GET /api/households?page=1&limit=10
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "missingFields": ["email"]
    }
  },
  "timestamp": "2026-03-31T13:50:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Fields:**
- `success` (boolean) - Always `false` for error responses
- `error.code` (string) - Machine-readable error code
- `error.message` (string) - Human-readable error message
- `error.details` (object, optional) - Additional error context
- `timestamp` (ISO 8601) - Server timestamp
- `requestId` (UUID) - Unique identifier for tracking

## Error Codes

### Authentication Errors
- `INVALID_CREDENTIALS` - Invalid email or password (401)
- `UNAUTHORIZED` - Missing or invalid auth token (401)
- `TOKEN_EXPIRED` - JWT token has expired (401)
- `INVALID_TOKEN` - JWT token is malformed (401)

### Validation Errors
- `VALIDATION_ERROR` - General validation error (400/422)
- `MISSING_FIELD` - Required field is missing (400)
- `INVALID_FORMAT` - Field format is invalid (400)

### Resource Errors
- `NOT_FOUND` - Resource not found (404)
- `ALREADY_EXISTS` - Resource already exists (409)
- `CONFLICT` - Request conflicts with existing data (409)

### Permission Errors
- `FORBIDDEN` - Access denied (403)
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions (403)

### Server Errors
- `INTERNAL_ERROR` - Unexpected server error (500)
- `DATABASE_ERROR` - Database operation failed (500)
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable (503)

## HTTP Status Code Mapping

| Code | Meaning | Use Case |
|------|---------|----------|
| `200` | OK | Standard successful request |
| `201` | Created | Resource successfully created |
| `400` | Bad Request | Invalid input or validation error |
| `401` | Unauthorized | Authentication required or failed |
| `403` | Forbidden | Authenticated but not authorized |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Semantic validation error |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Service temporarily down |

## Usage Examples

### Success Response (GET)

```typescript
// src/app/api/users/[id]/route.ts
import { successResponse, ApiErrors } from '@/lib/api-helpers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = req.headers.get('x-request-id') || undefined
  
  const user = await db.user.findUnique({ where: { id: params.id } })
  
  if (!user) {
    return ApiErrors.notFound('User', requestId)
  }
  
  return successResponse(user, 'User retrieved successfully', 200, requestId)
}
```

### Creation Response (POST)

```typescript
// src/app/api/users/route.ts
import { successResponse, ApiErrors, validateRequired } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || undefined
  const body = await req.json()

  // Validate required fields
  const validation = validateRequired(body, ['email', 'password', 'firstName'], requestId)
  if (validation) return validation

  const user = await db.user.create({ data: body })

  return successResponse(user, 'User created successfully', 201, requestId)
}
```

### Error Response (Unauthorized)

```typescript
// src/app/api/protected/route.ts
import { ApiErrors } from '@/lib/api-helpers'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || undefined
  
  const auth = await withAuth(req)
  if (auth instanceof NextResponse) {
    return ApiErrors.unauthorized('Missing authentication token', requestId)
  }

  // Protected logic here
  return successResponse({ data: 'secret' })
}
```

### Error Response (Validation)

```typescript
// src/app/api/auth/register/route.ts
import { ApiErrors } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || undefined
  const body = await req.json()

  if (!body.email?.includes('@')) {
    return ApiErrors.badRequest(
      'Invalid email format',
      { field: 'email', value: body.email },
      requestId,
    )
  }

  // Register logic here
}
```

### Paginated Response (LIST)

```typescript
// src/app/api/territories/route.ts
import { paginatedResponse } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || undefined
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

  const [territories, total] = await Promise.all([
    db.territory.findMany({ skip: (page - 1) * limit, take: limit }),
    db.territory.count(),
  ])

  return paginatedResponse(territories, total, page, limit, requestId)
}
```

## Client-Side Integration

### React Hook Example

```typescript
// src/hooks/useApi.ts
import { ApiResponse, ApiErrorResponse } from '@/lib/api-response'

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export function useApi<T>(url: string, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const response = await fetch(url, {
        method: options?.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      })

      const json = await response.json()

      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error.message)
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, fetch }
}
```

## Request ID Tracking

Include `X-Request-ID` header in requests for better tracing:

```bash
curl -H "X-Request-ID: 550e8400-e29b-41d4-a716-446655440000" \
  https://api.example.com/api/users
```

Server echoes back in response for correlation.

## Best Practices

1. ✅ Always include `requestId` for tracing
2. ✅ Always include `timestamp` for logging
3. ✅ Use appropriate HTTP status codes
4. ✅ Provide meaningful error messages
5. ✅ Include `details` for validation errors
6. ✅ Use consistent error codes across app
7. ✅ Never expose sensitive info in error messages
8. ✅ Always validate input before processing
9. ✅ Return `201 Created` for resource creation
10. ✅ Return pagination info for list endpoints
