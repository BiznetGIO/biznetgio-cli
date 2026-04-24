import { rmSync } from 'fs';
import { getCredentialsPath } from '../utils/credentials.js';

/**
 * Delete the credential file.
 * Returns 'deleted' if file was removed, 'not_found' if it was already absent.
 * Throws on unexpected filesystem errors.
 */
export function performLogout(credPath = getCredentialsPath()) {
  try {
    rmSync(credPath);
    return 'deleted';
  } catch (err) {
    if (err.code === 'ENOENT') return 'not_found';
    throw err;
  }
}

export function registerLogoutCommand(program) {
  program
    .command('logout')
    .description('Remove saved credentials (~/.biznetgio.json)')
    .action(() => {
      const credPath = getCredentialsPath();
      let result;
      try {
        result = performLogout(credPath);
      } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }

      if (result === 'deleted') {
        console.log(`✓ Logged out. Credentials removed from ${credPath}`);
      } else {
        console.log('Already logged out (no credential file found).');
      }
    });
}
