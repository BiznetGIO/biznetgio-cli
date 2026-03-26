#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { registerMetalCommands } from '../src/commands/metal.js';
import { registerElasticStorageCommands } from '../src/commands/elastic-storage.js';
import { registerAdditionalIpCommands } from '../src/commands/additional-ip.js';
import { registerNeoliteCommands } from '../src/commands/neolite.js';
import { registerNeoliteProCommands } from '../src/commands/neolite-pro.js';
import { registerObjectStorageCommands } from '../src/commands/object-storage.js';

const program = new Command();

program
  .name('biznetgio')
  .description('CLI tool for Biznet Gio Portal API')
  .version('1.0.0')
  .option('--api-key <key>', 'API key (overrides BIZNETGIO_API_KEY env)')
  .option('--output <format>', 'Output format: json or table', 'json');

registerMetalCommands(program);
registerElasticStorageCommands(program);
registerAdditionalIpCommands(program);
registerNeoliteCommands(program);
registerNeoliteProCommands(program);
registerObjectStorageCommands(program);

program.parse();
