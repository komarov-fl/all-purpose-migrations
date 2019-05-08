import requireDir from 'require-dir';
import * as fs from 'fs';
import * as path from 'path';

export interface ExistingMigration {
  name: string;
  date: Date;
}

export interface Migration {
  name: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
  options?: any;
}

export interface Seed {
  name: string;
  seed: (db: any) => Promise<void>;
  options?: any;
}

export interface AdapterConfig {
  migrationsPath: string;
  seedsPath: string;
  ext: string;
}

export interface Adapter {
  migrationsTableIsExists: () => Promise<boolean>;
  createMigrationsTable: () => Promise<void>;
  getExistingMigrations: () => Promise<ExistingMigration[]>;
  getMigrationFileTemplate: (name: string) => string;
  getSeedFileTemplate: (name: string) => string;
  up: (migration: Migration) => Promise<ExistingMigration>;
  down: (migration: Migration) => Promise<ExistingMigration>;
  seed: (seed: Seed) => Promise<void>;
  getConfig: () => AdapterConfig;
}

export interface MigrationConfig {
  steps?: number;
}

export class APM {
  public adapter: Adapter

  public constructor(adapter: Adapter) {
    this.adapter = adapter;
  }

  public async getExistingMigrations(): Promise<ExistingMigration[]> {
    const migrationsTableIsExists = await this.adapter.migrationsTableIsExists();
    if (!migrationsTableIsExists) {
      return [];
    }

    return this.adapter.getExistingMigrations();
  }

  public async up(config: MigrationConfig = {}): Promise<ExistingMigration[]> {
    const migrationsTableIsExists = await this.adapter.migrationsTableIsExists();
    if (!migrationsTableIsExists) {
      await this.adapter.createMigrationsTable();
    }
    const existingMigrations = await this.adapter.getExistingMigrations();
    const allMigrations = this.getMigrations();
    this.сheckDataIntegrity(existingMigrations, allMigrations);
    let newMigrations = this.getNewMigrations(existingMigrations, allMigrations);
    if (config.steps) {
      newMigrations = newMigrations.slice(0, config.steps);
    }
    const result: ExistingMigration[] = [];

    for (let index = 0; index < newMigrations.length; index += 1) {
      const migration = newMigrations[index];
      const migrationResult = await this.adapter.up(migration);
      result.push(migrationResult);
    }

    return result;
  }

  public async down(config: MigrationConfig = {}): Promise<ExistingMigration[]> {
    const migrationsTableIsExists = await this.adapter.migrationsTableIsExists();
    if (!migrationsTableIsExists) {
      await this.adapter.createMigrationsTable();
      return [];
    }
    const existingMigrations = await this.adapter.getExistingMigrations();
    if (!existingMigrations.length) {
      return [];
    }

    let steps = existingMigrations.length;

    const allMigrations = this.getMigrations();
    this.сheckDataIntegrity(existingMigrations, allMigrations);
    if (config.steps) {
      // eslint-disable-next-line prefer-destructuring
      steps = config.steps;
    }
    const result: ExistingMigration[] = [];

    const migrationsReversed = allMigrations
      .filter(am => (

        existingMigrations.find(em => em.name === am.name)
      ))
      .sort()
      .reverse();

    for (let index = 0; index < steps; index += 1) {
      const migration = migrationsReversed[index];
      const migrationResult = await this.adapter.down(migration);
      result.push(migrationResult);
    }

    return result;
  }

  public async seed(name: string|undefined): Promise<string[]> {
    let seeds = this.getSeeds();
    if (name) {
      const found = seeds.find(s => s.name === name);
      if (!found) {
        throw new Error(`Seed file ${name} not found`);
      }
      seeds = [found];
    }

    const result: string[] = [];

    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      await this.adapter.seed(seed);
      result.push(seed.name);
    }

    return result;
  }

  public async createMigrationFile(name: string): Promise<string> {
    if (!name) {
      throw new Error('Name is empty');
    }
    const adapterConfig = this.adapter.getConfig();
    const template = this.adapter.getMigrationFileTemplate(name);
    const filePath = path.join(adapterConfig.migrationsPath, `${+new Date()}_${name}.${adapterConfig.ext}`);
    await new Promise((resolve, reject) => {
      fs.writeFile(filePath, template, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    return filePath;
  }

  public async createSeedFile(name: string): Promise<string> {
    if (!name) {
      throw new Error('Name is empty');
    }
    const adapterConfig = this.adapter.getConfig();
    const template = this.adapter.getSeedFileTemplate(name);
    const filePath = path.join(adapterConfig.seedsPath, `${+new Date()}_${name}.${adapterConfig.ext}`);
    await new Promise((resolve, reject) => {
      fs.writeFile(filePath, template, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    return filePath;
  }

  protected getNewMigrations(
    existingMigrations: ExistingMigration[],
    allMigrations: Migration[],
  ): Migration[] {
    return allMigrations.filter(migration => (
      !existingMigrations.find(existingMigration => existingMigration.name === migration.name)
    ));
  }

  protected getMigrations(): Migration[] {
    const migrations: {
      [path: string]: Migration;
    } = requireDir(this.adapter.getConfig().migrationsPath);
    return Object.keys(migrations).reduce((result, migrationName): Migration[] => [
      ...result,
      {
        ...migrations[migrationName],
        name: migrationName,
      },
    ], [] as Migration[]);
  }

  protected getSeeds(): Seed[] {
    const seeds: {
      [path: string]: Seed;
    } = requireDir(this.adapter.getConfig().seedsPath);
    return Object.keys(seeds).reduce((result, seedName): Seed[] => [
      ...result,
      {
        ...seeds[seedName],
        name: seedName,
      },
    ], [] as Seed[]);
  }

  protected сheckDataIntegrity(
    existingMigrations: ExistingMigration[],
    allMigrations: Migration[],
  ): void {
    existingMigrations.forEach((existingMigration, index) => {
      const found = allMigrations.find(migration => migration.name === existingMigration.name);
      if (!found) {
        throw new Error(`${existingMigration.name} file not found`);
      }

      if (allMigrations[index].name !== existingMigration.name) {
        throw new Error('Migration order violated');
      }
    });
  }
}
