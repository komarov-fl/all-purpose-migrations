#!/usr/bin/env node
/* eslint-disable import/no-dynamic-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
/* eslint-disable no-case-declarations */

const { ArgumentParser } = require('argparse');
const path = require('path');
const { version } = require('../package.json');
const { APM } = require('../dist/index');

const parser = new ArgumentParser({
  version,
  addHelp: true,
  description: 'universal migrations library',
  prog: 'apm',
});

async function migrationModule(command, parameters, apm) {
  try {
    switch (command) {
      case 'create':
        if (!parameters[0]) {
          throw new Error('Required parameter "name" is not present');
        }
        await apm.createMigrationFile(parameters[0]);
        break;
      case 'up':
        let upConfig = {};
        if (parameters[0]) {
          const steps = parseInt(parameters[0], 10);
          if (Number.isNaN(steps)) {
            throw new Error('Parameter must be integer');
          }
          upConfig = { steps };
        }
        await apm.up(upConfig);
        break;
      case 'down':
        let downConfig = {};
        if (parameters[0]) {
          const steps = parseInt(parameters[0], 10);
          if (Number.isNaN(steps)) {
            throw new Error('Parameter must be integer');
          }
          downConfig = { steps };
        }
        await apm.down(downConfig);
        break;
      default:
        throw new Error(`"migration ${command}" command not found`);
    }
  } catch (e) {
    parser.error(e);
  }
}

async function seedModule(command, parameters, apm) {
  try {
    switch (command) {
      case 'create':
        if (!parameters[0]) {
          throw new Error('Required parameter "name" is not present');
        }
        await apm.createSeedFile(parameters[0]);
        break;
      case 'run':
        if (parameters[0]) {
          await apm.seed(parameters[0]);
        } else {
          await apm.seed();
        }
        break;
      default:
        throw new Error(`"seed ${command}" command not found`);
    }
  } catch (e) {
    parser.error(e);
  }
}

parser.addArgument(
  ['-c', '--config'],
  {
    help: 'path to config file',
    nargs: '?',
    defaultValue: '.apmconfig.js',
  },
);

parser.addArgument(
  'module',
  {
    nargs: '?',
    choices: [
      'migration',
      'seed',
    ],
    metavar: 'module',
    help: 'Modules {migration, seed}',
  },
);

parser.addArgument(
  'command',
  {
    nargs: '?',
    choices: [
      'create',
      'up',
      'down',
      'run',
    ],
    metavar: 'command',
    help: 'For migration module {create, up, down}. For seed module {create, run}',
  },
);

parser.addArgument(
  'parameters',
  {
    nargs: '*',
    help: 'Parameters for command',
  },
);

const args = parser.parseArgs();
try {
  const adapter = require(path.resolve(args.config));
  const apm = new APM(adapter);

  switch (args.module) {
    case 'migration':
      migrationModule(args.command, args.parameters, apm);
      break;
    case 'seed':
      seedModule(args.command, args.parameters, apm);
      break;
    default:
      throw new Error(`${args.module} not found`);
  }
} catch (e) {
  parser.error(e);
}
