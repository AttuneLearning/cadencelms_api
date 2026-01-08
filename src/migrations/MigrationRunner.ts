export interface Migration {
  name: string;
  version: number;
  description?: string;
  up: () => Promise<boolean>;
  down: () => Promise<boolean>;
}

interface MigrationStatus {
  name: string;
  version: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedAt?: Date;
  executionTime?: number;
  error?: string;
}

interface MigrationLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export class MigrationRunner {
  private migrations: Map<string, Migration> = new Map();
  private statuses: Map<string, MigrationStatus> = new Map();
  private logs: Map<string, MigrationLog[]> = new Map();

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    // Validate migration structure
    if (!migration.name || migration.name.trim() === '') {
      throw new Error('Migration name is required');
    }

    if (typeof migration.version !== 'number' || migration.version < 1) {
      throw new Error('Migration version must be a positive number');
    }

    if (typeof migration.up !== 'function') {
      throw new Error('Migration up function is required');
    }

    if (typeof migration.down !== 'function') {
      throw new Error('Migration down function is required');
    }

    // Check for duplicate names
    if (this.migrations.has(migration.name)) {
      throw new Error(`Migration "${migration.name}" already registered`);
    }

    // Check for duplicate versions
    for (const existing of this.migrations.values()) {
      if (existing.version === migration.version) {
        throw new Error(`Version ${migration.version} already used by migration "${existing.name}"`);
      }
    }

    this.migrations.set(migration.name, migration);
    this.statuses.set(migration.name, {
      name: migration.name,
      version: migration.version,
      status: 'pending',
    });
    this.logs.set(migration.name, []);
  }

  /**
   * Get all registered migrations sorted by version
   */
  getMigrations(): Migration[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.version - b.version);
  }

  /**
   * Get a specific migration by name
   */
  getMigration(name: string): Migration | undefined {
    return this.migrations.get(name);
  }

  /**
   * Execute up migration
   */
  async up(name: string): Promise<void> {
    const migration = this.migrations.get(name);
    if (!migration) {
      throw new Error(`Migration "${name}" not found`);
    }

    const status = this.statuses.get(name)!;
    if (status.status === 'completed') {
      this.addLog(name, 'info', 'Migration already executed, skipping');
      return;
    }

    try {
      this.addLog(name, 'info', `Starting migration: ${name}`);
      status.status = 'running';
      
      const startTime = Date.now();
      await migration.up();
      const executionTime = Date.now() - startTime;

      status.status = 'completed';
      status.executedAt = new Date();
      status.executionTime = executionTime;
      
      this.addLog(name, 'info', `Migration completed in ${executionTime}ms`);
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      this.addLog(name, 'error', `Migration failed: ${status.error}`);
      throw error;
    }
  }

  /**
   * Execute down migration (rollback)
   */
  async down(name: string): Promise<void> {
    const migration = this.migrations.get(name);
    if (!migration) {
      throw new Error(`Migration "${name}" not found`);
    }

    try {
      const status = this.statuses.get(name)!;
      this.addLog(name, 'info', `Rolling back migration: ${name}`);
      
      const startTime = Date.now();
      await migration.down();
      const executionTime = Date.now() - startTime;

      status.status = 'pending';
      status.executedAt = undefined;
      status.executionTime = undefined;
      status.error = undefined;
      
      this.addLog(name, 'info', `Rollback completed in ${executionTime}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addLog(name, 'error', `Rollback failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollback(name: string): Promise<void> {
    await this.down(name);
  }

  /**
   * Rollback to a specific version (rollback all migrations after that version)
   */
  async rollbackTo(version: number): Promise<void> {
    const migrations = this.getMigrations();
    const toRollback = migrations
      .filter(m => m.version > version)
      .filter(m => this.statuses.get(m.name)?.status === 'completed')
      .reverse(); // Rollback in reverse order

    for (const migration of toRollback) {
      await this.down(migration.name);
    }
  }

  /**
   * Execute all pending migrations
   */
  async upAll(): Promise<void> {
    const migrations = this.getMigrations();
    const pending = migrations.filter(
      m => this.statuses.get(m.name)?.status === 'pending'
    );

    for (const migration of pending) {
      await this.up(migration.name);
    }
  }

  /**
   * Get migration status
   */
  async getStatus(name: string): Promise<string> {
    const status = this.statuses.get(name);
    return status?.status || 'unknown';
  }

  /**
   * Get migration execution time
   */
  async getExecutionTime(name: string): Promise<number | undefined> {
    const status = this.statuses.get(name);
    return status?.executionTime;
  }

  /**
   * Get migration logs
   */
  async getLogs(name: string): Promise<MigrationLog[]> {
    return this.logs.get(name) || [];
  }

  /**
   * Add log entry
   */
  private addLog(name: string, level: 'info' | 'warn' | 'error', message: string): void {
    const logs = this.logs.get(name) || [];
    logs.push({
      timestamp: new Date(),
      level,
      message,
    });
    this.logs.set(name, logs);
  }

  /**
   * Get all migration statuses
   */
  getAllStatuses(): MigrationStatus[] {
    return Array.from(this.statuses.values()).sort((a, b) => a.version - b.version);
  }

  /**
   * Reset all migrations (for testing)
   */
  reset(): void {
    for (const name of this.migrations.keys()) {
      const status = this.statuses.get(name)!;
      status.status = 'pending';
      status.executedAt = undefined;
      status.executionTime = undefined;
      status.error = undefined;
    }
    
    for (const name of this.logs.keys()) {
      this.logs.set(name, []);
    }
  }
}

export default MigrationRunner;
