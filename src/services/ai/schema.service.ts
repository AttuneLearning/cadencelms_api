/**
 * AI-Friendly Schema Documentation Service
 * Returns JSON Schema definitions with examples for AI agents to learn the API structure
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Schema response interface
 */
export interface SchemaResponse {
  schema: JsonSchema;
  examples: Array<{ description: string; data: any }>;
  validations: Record<string, ValidationRule>;
}

/**
 * JSON Schema interface (Draft 7)
 */
export interface JsonSchema {
  $schema: string;
  title?: string;
  description?: string;
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  enum?: any[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  examples?: any[];
  definitions?: Record<string, any>;
  [key: string]: any;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  pattern?: string;
  description: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: any[];
}

/**
 * SchemaService - Provides JSON Schema documentation for AI agents
 */
export class SchemaService {
  private static readonly SCHEMA_DIR = path.join(__dirname, '../../schemas/ai');
  private static readonly SUPPORTED_RESOURCES = ['course', 'module', 'exercise', 'question'];
  private static schemaCache: Map<string, SchemaResponse> = new Map();

  /**
   * Get JSON Schema for a resource
   * @param resource - Resource name (course, module, exercise, question)
   * @returns Schema response with schema, examples, and validations, or null if not found
   */
  static async getSchema(resource: string): Promise<SchemaResponse | null> {
    // Validate input
    if (!resource || typeof resource !== 'string') {
      return null;
    }

    // Sanitize resource name to prevent path traversal
    const sanitizedResource = resource.replace(/[^a-z0-9_-]/gi, '');
    if (!sanitizedResource || sanitizedResource !== resource) {
      return null;
    }

    // Check if resource is supported
    if (!this.SUPPORTED_RESOURCES.includes(sanitizedResource)) {
      return null;
    }

    // Check cache first
    if (this.schemaCache.has(sanitizedResource)) {
      return this.schemaCache.get(sanitizedResource)!;
    }

    // Load schema from file
    try {
      const schemaPath = path.join(this.SCHEMA_DIR, `${sanitizedResource}.schema.json`);
      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      const schemaData = JSON.parse(schemaContent);

      // Extract examples from schema
      const examples = schemaData.examples || [];
      delete schemaData.examples; // Remove examples from schema object

      // Extract validation rules from schema
      const validations = schemaData.validations || {};
      delete schemaData.validations; // Remove validations from schema object

      // Build response
      const response: SchemaResponse = {
        schema: schemaData,
        examples,
        validations,
      };

      // Cache the response
      this.schemaCache.set(sanitizedResource, response);

      return response;
    } catch (error) {
      // File not found or parse error
      return null;
    }
  }

  /**
   * Clear the schema cache
   * Useful for testing or when schemas are updated
   */
  static clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Get all supported resource types
   * @returns Array of supported resource names
   */
  static getSupportedResources(): string[] {
    return [...this.SUPPORTED_RESOURCES];
  }

  /**
   * Validate that a schema is a valid JSON Schema Draft 7
   * @param schema - Schema to validate
   * @returns True if valid, false otherwise
   */
  static isValidJsonSchema(schema: any): boolean {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // Must have $schema field
    if (!schema.$schema || schema.$schema !== 'http://json-schema.org/draft-07/schema#') {
      return false;
    }

    // Must have type field
    if (!schema.type) {
      return false;
    }

    // Type must be a valid JSON Schema type
    const validTypes = ['object', 'array', 'string', 'number', 'boolean', 'integer', 'null'];
    if (!validTypes.includes(schema.type)) {
      return false;
    }

    return true;
  }
}
