/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-empty-function */
/* eslint-disable class-methods-use-this */
module.exports = class TestAdapter {
  constructor(config) {
    this.config = config;
    this.existingMigrationsStore = [];
    this.migrationsTableIsExistsValue = true;
  }

  async migrationsTableIsExists() {
    return this.migrationsTableIsExistsValue;
  }

  async createMigrationsTable() {
    this.migrationsTableIsExistsValue = true;
  }

  async getExistingMigrations() {
    return this.existingMigrationsStore.slice(0);
  }

  getMigrationFileTemplate(name) {
    return (
      `module.exports = {
  // migration ${name}
  up: () => {},
  down: () => {},
  options: {},
};
`
    );
  }

  getSeedFileTemplate(name) {
    return (
      `module.exports = {
  // seed ${name}
  seed: () => {},
  options: {},
};
`
    );
  }

  async up(migration) {
    const migrationResult = { name: migration.name, date: new Date() };
    this.existingMigrationsStore.push(migrationResult);
    return migrationResult;
  }

  async down(migration) {
    const migrationResult = this.existingMigrationsStore.find(em => (
      em.name === migration.name
    ));
    this.existingMigrationsStore = this.existingMigrationsStore.filter(em => (
      em.name !== migration.name
    ));
    return migrationResult;
  }

  async seed(seed) {

  }

  getConfig() {
    return {
      ...this.config,
    };
  }
};
