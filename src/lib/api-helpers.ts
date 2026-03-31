import { NextRequest, NextResponse } from 'next/server'
import {
  ApiResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  HTTP_STATUS,
  ERROR_CODES,
} from './api-response'
import crypto from 'crypto'

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK,
  requestId?: string,
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string,
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit)

  const response: ApiPaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  }

  return NextResponse.json(response, { status: HTTP_STATUS.OK })
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: Record<string, unknown>,
  requestId?: string,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Standardized error handlers
 */
export const ApiErrors = {
  badRequest: (message: string, details?: Record<string, unknown>, requestId?: string) =>
    errorResponse(ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details, requestId),

  unauthorized: (message: string = 'Unauthorized', requestId?: string) =>
    errorResponse(ERROR_CODES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED, undefined, requestId),

  forbidden: (message: string = 'Access denied', requestId?: string) =>
    errorResponse(ERROR_CODES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN, undefined, requestId),

  notFound: (resource: string, requestId?: string) =>
    errorResponse(
      ERROR_CODES.NOT_FOUND,
      `${resource} not found`,
      HTTP_STATUS.NOT_FOUND,
      undefined,
      requestId,
    ),

  conflict: (message: string, requestId?: string) =>
    errorResponse(ERROR_CODES.CONFLICT, message, HTTP_STATUS.CONFLICT, undefined, requestId),

  unprocessableEntity: (message: string, details?: Record<string, unknown>, requestId?: string) =>
    errorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      message,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      details,
      requestId,
    ),

  internalError: (message: string = 'Internal server error', requestId?: string) =>
    errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      undefined,
      requestId,
    ),

  invalidCredentials: (requestId?: string) =>
    errorResponse(
      ERROR_CODES.INVALID_CREDENTIALS,
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      requestId,
    ),

  tokenExpired: (requestId?: string) =>
    errorResponse(
      ERROR_CODES.TOKEN_EXPIRED,
      'Token has expired',
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      requestId,
    ),

  insufficientPermissions: (requestId?: string) =>
    errorResponse(
      ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      'You do not have permission to access this resource',
      HTTP_STATUS.FORBIDDEN,
      undefined,
      requestId,
    ),
}

/**
 * Validation helper - checks required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[],
  requestId?: string,
): NextResponse<ApiErrorResponse> | null {
  const missing = requiredFields.filter((field) => !data[field])

  if (missing.length > 0) {
    return errorResponse(
      ERROR_CODES.MISSING_FIELD,
      `Missing required fields: ${missing.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      { missingFields: missing },
      requestId,
    )
  }

  return null
}
