import { NextRequest } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Validates request body against a Zod schema
 * @param request - NextRequest object
 * @param schema - Zod schema to validate against
 * @returns Parsed data or error response
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data?: T; error?: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: errorDetails,
          },
          { status: 400 }
        ),
      };
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        error: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        ),
      };
    }

    console.error('Validation error:', error);
    return {
      error: NextResponse.json(
        { error: 'Internal validation error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validates URL query parameters against a Zod schema
 * @param request - NextRequest object
 * @param schema - Zod schema to validate against
 * @returns Parsed data or error response
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data?: T; error?: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const paramsObject: Record<string, string | string[]> = {};

    // Convert URLSearchParams to plain object
    for (const [key, value] of searchParams.entries()) {
      if (key in paramsObject) {
        // Handle multiple values for the same key
        const existingValue = paramsObject[key];
        if (Array.isArray(existingValue)) {
          existingValue.push(value);
        } else {
          paramsObject[key] = [existingValue, value];
        }
      } else {
        paramsObject[key] = value;
      }
    }

    const data = schema.parse(paramsObject);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        error: NextResponse.json(
          {
            error: 'Query parameter validation failed',
            details: errorDetails,
          },
          { status: 400 }
        ),
      };
    }

    console.error('Query validation error:', error);
    return {
      error: NextResponse.json(
        { error: 'Internal validation error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validates URL path parameters against a Zod schema
 * @param params - URL parameters object
 * @param schema - Zod schema to validate against
 * @returns Parsed data or error response
 */
export function validatePathParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): { data?: T; error?: NextResponse } {
  try {
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      const errorDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        error: NextResponse.json(
          {
            error: 'Path parameter validation failed',
            details: errorDetails,
          },
          { status: 400 }
        ),
      };
    }

    console.error('Path parameter validation error:', error);
    return {
      error: NextResponse.json(
        { error: 'Internal validation error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Sanitizes and validates string input
 * @param input - Raw string input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, maxLength);
}

/**
 * Validates email format with additional security checks
 * @param email - Email address to validate
 * @returns Valid email or null
 */
export function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string') {
    return null;
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const sanitizedEmail = sanitizeString(email.toLowerCase(), 255);

  if (!emailRegex.test(sanitizedEmail)) {
    return null;
  }

  // Additional security checks
  if (sanitizedEmail.includes('..') || sanitizedEmail.startsWith('.') || sanitizedEmail.endsWith('.')) {
    return null;
  }

  return sanitizedEmail;
}

/**
 * Validates UUID format
 * @param uuid - UUID string to validate
 * @returns Valid UUID or null
 */
export function validateUUID(uuid: unknown): string | null {
  if (typeof uuid !== 'string') {
    return null;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid) ? uuid.toLowerCase() : null;
}

/**
 * Creates a validation middleware for API routes
 * @param schema - Zod schema to validate against
 * @param source - Source of data ('body', 'query', 'params')
 * @returns Middleware function
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (
    request: NextRequest,
    params?: Record<string, string>
  ): Promise<{ data?: T; error?: NextResponse }> => {
    switch (source) {
      case 'body':
        return validateRequestBody(request, schema);
      case 'query':
        return validateQueryParams(request, schema);
      case 'params':
        if (!params) {
          return {
            error: NextResponse.json(
              { error: 'Path parameters required' },
              { status: 500 }
            ),
          };
        }
        return validatePathParams(params, schema);
      default:
        return {
          error: NextResponse.json(
            { error: 'Invalid validation source' },
            { status: 500 }
          ),
        };
    }
  };
}

/**
 * Handles validation errors consistently across API routes
 * @param error - Validation error
 * @returns Formatted error response
 */
export function handleValidationError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const errorDetails = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return NextResponse.json(
      {
        error: 'Validation failed',
        details: errorDetails,
      },
      { status: 400 }
    );
  }

  console.error('Unexpected validation error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}