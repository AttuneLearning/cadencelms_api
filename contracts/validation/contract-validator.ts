/**
 * Contract Validator
 * Version: 1.0.0
 * 
 * Validates API requests and responses against defined contracts.
 * Used in development to ensure contract compliance.
 */

import { AuthContracts } from '../api/auth.contract';

// Contract registry - add new contracts here
const contracts: Record<string, unknown> = {
  'POST /api/v2/auth/register': AuthContracts.register,
  'POST /api/v2/auth/login': AuthContracts.login,
  'POST /api/v2/auth/logout': AuthContracts.logout,
  'POST /api/v2/auth/refresh': AuthContracts.refreshToken,
  'POST /api/v2/auth/forgot-password': AuthContracts.forgotPassword,
  'POST /api/v2/auth/reset-password': AuthContracts.resetPassword,
  'GET /api/v2/auth/me': AuthContracts.me,
  'POST /api/v2/auth/change-password': AuthContracts.changePassword,
};

interface ContractDefinition {
  endpoint: string;
  method: string;
  version: string;
  request: {
    headers?: Record<string, string>;
    body?: Record<string, FieldDefinition>;
  };
  response: {
    success: {
      status: number;
      body: Record<string, unknown>;
    };
    errors: Array<{
      status: number;
      code: string;
      message: string;
    }>;
  };
}

interface FieldDefinition {
  type: string;
  required: boolean;
  format?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  default?: unknown;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ContractValidator {
  private static isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Get contract for an endpoint
   */
  static getContract(endpointKey: string): ContractDefinition | undefined {
    return contracts[endpointKey] as ContractDefinition | undefined;
  }

  /**
   * List all registered contracts
   */
  static listContracts(): string[] {
    return Object.keys(contracts);
  }

  /**
   * Validate request body against contract
   */
  static validateRequest(endpointKey: string, body: Record<string, unknown>): ValidationResult {
    const contract = this.getContract(endpointKey);
    
    if (!contract) {
      return {
        valid: false,
        errors: [`No contract found for endpoint: ${endpointKey}`]
      };
    }

    const errors: string[] = [];
    const bodySpec = contract.request.body || {};

    // Check required fields
    for (const [field, spec] of Object.entries(bodySpec)) {
      if (spec.required && !(field in body)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check field types and constraints
    for (const [field, value] of Object.entries(body)) {
      const spec = bodySpec[field];
      
      if (!spec) {
        // Unknown field - could be warning or error depending on strictness
        continue;
      }

      // Type validation
      const actualType = typeof value;
      if (spec.type === 'string' && actualType !== 'string') {
        errors.push(`Field ${field} should be string, got ${actualType}`);
      }
      if (spec.type === 'number' && actualType !== 'number') {
        errors.push(`Field ${field} should be number, got ${actualType}`);
      }
      if (spec.type === 'boolean' && actualType !== 'boolean') {
        errors.push(`Field ${field} should be boolean, got ${actualType}`);
      }

      // String constraints
      if (spec.type === 'string' && typeof value === 'string') {
        if (spec.minLength && value.length < spec.minLength) {
          errors.push(`Field ${field} must be at least ${spec.minLength} characters`);
        }
        if (spec.maxLength && value.length > spec.maxLength) {
          errors.push(`Field ${field} must be at most ${spec.maxLength} characters`);
        }
        if (spec.format === 'email' && !this.isValidEmail(value)) {
          errors.push(`Field ${field} must be a valid email address`);
        }
      }

      // Enum validation
      if (spec.enum && !spec.enum.includes(value as string)) {
        errors.push(`Field ${field} must be one of: ${spec.enum.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate response against contract
   */
  static validateResponse(
    endpointKey: string,
    response: Record<string, unknown>,
    statusCode: number = 200
  ): ValidationResult {
    const contract = this.getContract(endpointKey);
    
    if (!contract) {
      return {
        valid: false,
        errors: [`No contract found for endpoint: ${endpointKey}`]
      };
    }

    const errors: string[] = [];

    // Check if it's an error response
    const errorSpec = contract.response.errors.find(e => e.status === statusCode);
    if (errorSpec) {
      // Validate error response structure
      if (!response.success && response.error) {
        // Valid error response
        return { valid: true, errors: [] };
      }
    }

    // Validate success response
    if (statusCode === contract.response.success.status) {
      const expectedBody = contract.response.success.body;
      
      // Check top-level fields
      for (const [field, expectedType] of Object.entries(expectedBody)) {
        if (!(field in response)) {
          errors.push(`Missing response field: ${field}`);
        } else if (typeof expectedType === 'string') {
          const actualType = typeof response[field];
          const normalizedExpected = expectedType.toLowerCase();
          
          if (normalizedExpected === 'date' && typeof response[field] !== 'string') {
            errors.push(`Field ${field} should be Date string, got ${actualType}`);
          } else if (normalizedExpected !== 'date' && actualType !== normalizedExpected) {
            // Allow for flexibility with nested objects
            if (normalizedExpected !== 'object' && actualType !== normalizedExpected) {
              errors.push(`Field ${field} type mismatch: expected ${expectedType}, got ${actualType}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Middleware for Express to validate requests
   */
  static middleware(endpointKey: string) {
    return (req: { body: Record<string, unknown> }, res: { status: (code: number) => { json: (data: unknown) => void } }, next: () => void) => {
      if (!this.isDevelopment) {
        return next();
      }

      const result = this.validateRequest(endpointKey, req.body);
      
      if (!result.valid) {
        console.warn(`[Contract Validation] ${endpointKey}:`, result.errors);
        // In development, we warn but don't block
        // Could be configured to block if strict mode is enabled
      }
      
      next();
    };
  }

  /**
   * Export all contracts to JSON for UI team
   */
  static exportToJson(): Record<string, unknown> {
    const exported: Record<string, unknown> = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      contracts: {}
    };

    for (const [key, contract] of Object.entries(contracts)) {
      (exported.contracts as Record<string, unknown>)[key] = contract;
    }

    return exported;
  }

  /**
   * Generate OpenAPI spec from contracts
   */
  static generateOpenApiSpec(): Record<string, unknown> {
    const paths: Record<string, unknown> = {};

    for (const [key, contractDef] of Object.entries(contracts)) {
      const contract = contractDef as ContractDefinition;
      const [method, ...pathParts] = key.split(' ');
      const path = pathParts.join(' ');

      if (!paths[path]) {
        paths[path] = {};
      }

      (paths[path] as Record<string, unknown>)[method.toLowerCase()] = {
        summary: path,
        requestBody: contract.request.body ? {
          required: true,
          content: {
            'application/json': {
              schema: this.bodyToSchema(contract.request.body)
            }
          }
        } : undefined,
        responses: {
          [contract.response.success.status]: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: contract.response.success.body
                }
              }
            }
          },
          ...Object.fromEntries(
            contract.response.errors.map(err => [
              err.status,
              {
                description: err.message,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: err.code },
                            message: { type: 'string', example: err.message }
                          }
                        }
                      }
                    }
                  }
                }
              }
            ])
          )
        }
      };
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'LMS API',
        version: '2.0.0',
        description: 'Learning Management System API'
      },
      servers: [
        { url: 'http://localhost:5000', description: 'Development' }
      ],
      paths
    };
  }

  private static bodyToSchema(body: Record<string, FieldDefinition>): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [field, spec] of Object.entries(body)) {
      properties[field] = {
        type: spec.type,
        format: spec.format,
        minLength: spec.minLength,
        maxLength: spec.maxLength,
        enum: spec.enum,
        default: spec.default
      };

      if (spec.required) {
        required.push(field);
      }
    }

    return {
      type: 'object',
      properties,
      required
    };
  }
}

// Export for use in scripts
export default ContractValidator;
