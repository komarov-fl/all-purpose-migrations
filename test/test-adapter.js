/* eslint-disable @typescript-eslint/no-var-requires */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { APM } = require('../dist/index');
const TestAdapter = require('./test-adapter/index');

const config = {
  migrationsPath: path.resolve(path.join(__dirname, 'test-adapter/migrations')),
  seedsPath: path.resolve(path.join(__dirname, 'test-adapter/seeds')),
  ext: 'js',
};

describe('Test adapter', () => {
  beforeEach(() => {
    this.adapter = new TestAdapter(config);
    this.apm = new APM(this.adapter);
  });

  it('Create migration file', async () => {
    const name = 'temp-test-adapter-migration';
    const filePath = await this.apm.createMigrationFile(name);
    const expectedContent = this.adapter.getMigrationFileTemplate(name);
    const content = fs.readFileSync(filePath).toString();
    assert.equal(content, expectedContent);
    fs.unlinkSync(filePath);
  });

  it('Create seed file', async () => {
    const name = 'temp-test-adapter-seed';
    const filePath = await this.apm.createSeedFile(name);
    const expectedContent = this.adapter.getSeedFileTemplate(name);
    const content = fs.readFileSync(filePath).toString();
    assert.equal(content, expectedContent);
    fs.unlinkSync(filePath);
  });

  it('Empty existing migrations', async () => {
    const existingMigrations = await this.apm.getExistingMigrations();
    assert.deepEqual(existingMigrations, []);
  });

  it('Migration up', async () => {
    const result = await this.apm.up();
    const existingMigrations = await this.apm.getExistingMigrations();
    assert.equal(existingMigrations.length, 3);
    assert.equal(result.length, 3);
  });

  it('Migration up steps', async () => {
    await this.apm.up({ steps: 2 });
    const existingMigrations = await this.apm.getExistingMigrations();
    assert.equal(existingMigrations.length, 2);
  });

  it('Migration up with existing migrations', async () => {
    let result = await this.apm.up({ steps: 2 });
    let existingMigrations = await this.apm.getExistingMigrations();
    assert.equal(existingMigrations.length, 2);
    assert.equal(result.length, 2);
    result = await this.apm.up();
    existingMigrations = await this.apm.getExistingMigrations();
    assert.equal(existingMigrations.length, 3);
    assert.equal(result.length, 1);
  });

  it('Migration down', async () => {
    await this.apm.up();
    const result = await this.apm.down();
    const existingMigrations = await this.apm.getExistingMigrations();
    assert.equal(result.length, 3);
    assert.equal(existingMigrations.length, 0);
  });

  it('Migration down steps', async () => {
    await this.apm.up({ steps: 2 });
    const result = await this.apm.down({ steps: 1 });
    const existingMigrations = await this.apm.getExistingMigrations();
    assert.equal(result.length, 1);
    assert.equal(result[0].name, '1557302785606_test-adapter-migration');
    assert.equal(existingMigrations.length, 1);
    assert.equal(existingMigrations[0].name, '1557302785605_test-adapter-migration');
  });

  it('Seed', async () => {
    const result = await this.apm.seed();
    assert.deepEqual(result, [
      '1557303031684_test-adapter-seed',
      '1557303031685_test-adapter-seed',
    ]);
  });

  it('Seed by name', async () => {
    const result = await this.apm.seed('1557303031684_test-adapter-seed');
    assert.deepEqual(result, [
      '1557303031684_test-adapter-seed',
    ]);
  });

  it('Seed by name file not found error', async () => {
    const name = 'not-existing-file';
    let err;
    try {
      await this.apm.seed(name);
    } catch (e) {
      err = e.message;
    }
    assert.equal(err, `Seed file ${name} not found`);
  });

  it('Existing migrations file not found error', async () => {
    this.adapter.existingMigrationsStore = [
      {
        name: 'not-existing-file',
        date: new Date(),
      },
    ];

    let err;

    try {
      await this.apm.up();
    } catch (e) {
      err = e.message;
    }

    assert.equal(err, 'not-existing-file file not found');
  });

  it('Existing migrations order violated error', async () => {
    this.adapter.existingMigrationsStore = [
      {
        name: '1557302785605_test-adapter-migration',
        date: new Date(),
      },
      {
        name: '1557302785607_test-adapter-migration',
        date: new Date(),
      },
    ];

    let err;

    try {
      await this.apm.up();
    } catch (e) {
      err = e.message;
    }

    assert.equal(err, 'Migration order violated');
  });

  it('Create migrations table', async () => {
    this.adapter.migrationsTableIsExistsValue = false;
    await this.apm.up();
    assert.equal(this.adapter.migrationsTableIsExistsValue, true);
  });
});
