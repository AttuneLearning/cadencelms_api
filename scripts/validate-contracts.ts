/**
 * Validate Contracts Script
 * 
 * Checks all contract files for proper structure and consistency.
 * Run with: npm run contracts:validate
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  extractErrorResponses,
  getContractEndpointEntries,
  getContractExportName,
  getNonEndpointEntryNames,
  getSuccessStatus
} from './contract-utils';

const contractsDir = path.join(__dirname, '../contracts/api');
const errors: string[] = [];
const warnings: string[] = [];

interface ContractEndpoint {
  endpoint: string;
  method: string;
  version: string;
  request?: {
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
  response: Record<string, unknown>;
  example?: {
    request?: unknown;
    response?: unknown;
  };
}

function validateContractFile(filePath: string): void {
  const fileName = path.basename(filePath);
  console.log(`\nValidating: ${fileName}`);
  
  try {
    // Dynamic import not available in ts-node easily, so we'll use require
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contractModule = require(filePath);
    
    // Find the main export (usually named *Contract or *Contracts)
    const contractExport = getContractExportName(contractModule as Record<string, unknown>);
    
    if (!contractExport) {
      errors.push(`${fileName}: No *Contract or *Contracts export found`);
      return;
    }
    
    const contract = contractModule[contractExport] as Record<string, unknown>;
    const endpointEntries = getContractEndpointEntries(contract);
    const nonEndpointEntries = getNonEndpointEntryNames(contract);

    if (endpointEntries.length === 0) {
      errors.push(`${fileName}: Contract export '${contractExport}' has no endpoint entries`);
      return;
    }

    if (nonEndpointEntries.length > 0) {
      warnings.push(
        `${fileName}: Ignoring non-endpoint entries [${nonEndpointEntries.join(', ')}]`
      );
    }

    // Validate each endpoint in the contract
    for (const [endpointName, endpoint] of endpointEntries) {
      validateEndpoint(fileName, endpointName, endpoint as ContractEndpoint);
    }
    
  } catch (error) {
    errors.push(`${fileName}: Failed to load - ${(error as Error).message}`);
  }
}

function validateEndpoint(
  fileName: string, 
  endpointName: string, 
  endpoint: ContractEndpoint
): void {
  const prefix = `${fileName}:${endpointName}`;
  
  // Required fields
  if (!endpoint.endpoint) {
    errors.push(`${prefix}: Missing 'endpoint' field`);
  } else if (!endpoint.endpoint.startsWith('/api/')) {
    warnings.push(`${prefix}: Endpoint should start with '/api/'`);
  }
  
  if (!endpoint.method) {
    errors.push(`${prefix}: Missing 'method' field`);
  } else if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) {
    errors.push(`${prefix}: Invalid method '${endpoint.method}'`);
  }
  
  if (!endpoint.version) {
    warnings.push(`${prefix}: Missing 'version' field`);
  } else if (!/^\d+\.\d+\.\d+$/.test(endpoint.version)) {
    warnings.push(`${prefix}: Version should be semver format (e.g., '1.0.0')`);
  }
  
  // Response validation
  if (!endpoint.response || typeof endpoint.response !== 'object') {
    errors.push(`${prefix}: Missing 'response' field`);
  } else {
    const successStatus = getSuccessStatus(endpoint.response);
    const successObject = (endpoint.response as Record<string, unknown>).success;

    if (!successObject || typeof successObject !== 'object') {
      errors.push(`${prefix}: Missing 'response.success' field`);
    } else {
      if (!successStatus) {
        errors.push(`${prefix}: Missing 'response.success.status' field`);
      }

      if (!(successObject as Record<string, unknown>).body) {
        errors.push(`${prefix}: Missing 'response.success.body' field`);
      }
    }
    
    const normalizedErrors = extractErrorResponses(endpoint.response);
    if (normalizedErrors.length === 0) {
      warnings.push(`${prefix}: No error responses defined`);
    }
  }
  
  // Example validation
  const maybeEndpoint = endpoint as unknown as Record<string, unknown>;
  if (!maybeEndpoint.example && !maybeEndpoint.examples) {
    warnings.push(`${prefix}: No example provided (helpful for mocking)`);
  }
  
  console.log(`  ✓ ${endpointName}`);
}

function main(): void {
  console.log('╔════════════════════════════════════════╗');
  console.log('║      Contract Validation Report        ║');
  console.log('╚════════════════════════════════════════╝');
  
  // Check if contracts directory exists
  if (!fs.existsSync(contractsDir)) {
    console.error(`\n❌ Contracts directory not found: ${contractsDir}`);
    process.exit(1);
  }
  
  // Find all contract files
  const contractFiles = fs.readdirSync(contractsDir)
    .filter(f => f.endsWith('.contract.ts'));
  
  if (contractFiles.length === 0) {
    console.log('\n⚠️  No contract files found');
    process.exit(0);
  }
  
  console.log(`\nFound ${contractFiles.length} contract file(s)`);
  
  // Validate each contract file
  for (const file of contractFiles) {
    validateContractFile(path.join(contractsDir, file));
  }
  
  // Print summary
  console.log('\n' + '─'.repeat(50));
  console.log('\n📊 VALIDATION SUMMARY\n');
  
  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`   • ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`   • ${w}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All contracts are valid!');
  } else if (errors.length === 0) {
    console.log('\n✅ No errors found (warnings can be ignored)');
  }
  
  console.log('\n' + '─'.repeat(50));
  
  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
