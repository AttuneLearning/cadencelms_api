/**
 * Export Contracts Script
 * 
 * Exports all contracts to JSON format for consumption by the UI team.
 * Run with: npm run contracts:export
 */

import * as fs from 'fs';
import * as path from 'path';

const contractsDir = path.join(__dirname, '../contracts/api');
const outputDir = path.join(__dirname, '../contracts/dist');

interface ExportedContracts {
  version: string;
  generatedAt: string;
  generator: string;
  contracts: Record<string, unknown>;
}

function main(): void {
  console.log('╔════════════════════════════════════════╗');
  console.log('║       Contract Export Utility          ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }
  
  // Check if contracts directory exists
  if (!fs.existsSync(contractsDir)) {
    console.error(`❌ Contracts directory not found: ${contractsDir}`);
    process.exit(1);
  }
  
  // Find all contract files
  const contractFiles = fs.readdirSync(contractsDir)
    .filter(f => f.endsWith('.contract.ts'));
  
  if (contractFiles.length === 0) {
    console.log('⚠️  No contract files found');
    process.exit(0);
  }
  
  console.log(`Found ${contractFiles.length} contract file(s)\n`);
  
  // Build export object
  const exported: ExportedContracts = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    generator: 'lms-api-v2/scripts/export-contracts.ts',
    contracts: {}
  };

  let failedCount = 0;
  let skippedCount = 0;
  
  // Process each contract file
  for (const file of contractFiles) {
    const filePath = path.join(contractsDir, file);
    const contractName = file.replace('.contract.ts', '');
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const contractModule = require(filePath);
      
      // Find the main export
      const exportNames = Object.keys(contractModule);
      const contractExport = exportNames.find(name => 
        name.endsWith('Contract') || name.endsWith('Contracts')
      );
      
      if (contractExport) {
        exported.contracts[contractName] = contractModule[contractExport];
        console.log(`✅ Exported: ${file}`);
      } else {
        skippedCount++;
        console.log(`⚠️  Skipped: ${file} (no Contract export found)`);
      }
    } catch (error) {
      failedCount++;
      console.log(`❌ Failed: ${file} - ${(error as Error).message}`);
    }
  }
  
  // Write JSON output
  const jsonOutput = path.join(outputDir, 'contracts.json');
  fs.writeFileSync(jsonOutput, JSON.stringify(exported, null, 2));
  console.log(`\n📄 Written: ${jsonOutput}`);
  
  // Also write a TypeScript types file for the UI team
  const typesOutput = generateTypeDefinitions(exported);
  const typesPath = path.join(outputDir, 'contract-types.d.ts');
  fs.writeFileSync(typesPath, typesOutput);
  console.log(`📄 Written: ${typesPath}`);
  
  // Print summary
  console.log('\n' + '─'.repeat(50));
  console.log('\n📊 EXPORT SUMMARY\n');
  console.log(`   Contracts exported: ${Object.keys(exported.contracts).length}`);
  console.log(`   Contracts failed: ${failedCount}`);
  console.log(`   Contracts skipped: ${skippedCount}`);
  console.log(`   Output directory: ${outputDir}`);
  console.log(`   Files generated:`);
  console.log(`     • contracts.json`);
  console.log(`     • contract-types.d.ts`);
  console.log('\n' + '─'.repeat(50));

  if (failedCount > 0 || skippedCount > 0) {
    console.error('\n❌ Export failed quality gate: partial contract export is not allowed.\n');
    process.exit(1);
  }

  console.log('\n✅ Export complete! Share contracts/dist/ with the UI team.\n');
}

function generateTypeDefinitions(exported: ExportedContracts): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated contract type definitions',
    ` * Generated: ${exported.generatedAt}`,
    ' * DO NOT EDIT MANUALLY',
    ' */',
    '',
    'declare module "@lms/contracts" {',
  ];
  
  for (const [name, contract] of Object.entries(exported.contracts)) {
    const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
    lines.push(`  export const ${pascalName}Contract: ${JSON.stringify(contract, null, 2).replace(/"/g, "'")};`);
  }
  
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

main();
