#!/usr/bin/env node
/**
 * Root postinstall — installs dependencies for the Seventh Sky subprojects that
 * actually ship: the Express API, the Next.js website, and the admin SPA.
 *
 * Resilient by design: a missing or optional subproject is skipped, never fatal
 * (so a Git/host build like Hostinger's does not break when a folder is absent).
 * Cross-platform (pure Node, no shell chaining).
 *
 * Skip entirely with:  SKIP_WORKSPACE_INSTALL=1 npm install
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.env.SKIP_WORKSPACE_INSTALL) {
  console.log('postinstall: SKIP_WORKSPACE_INSTALL set — skipping workspace installs.');
  process.exit(0);
}

// The deployable subprojects, in dependency order. Add optional portals here if
// you ever deploy them; missing ones are simply skipped.
const WORKSPACES = ['backend', 'admin-portal', 'website'];

let installed = 0;

for (const ws of WORKSPACES) {
  const dir = path.join(__dirname, '..', ws);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.log(`postinstall: skipping ${ws} (not present).`);
    continue;
  }
  console.log(`\npostinstall: installing dependencies in ${ws} …`);
  // shell:true resolves `npm` to npm.cmd on Windows and `npm` on Linux/host.
  const result = spawnSync('npm install --no-audit --no-fund', {
    cwd: dir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SKIP_WORKSPACE_INSTALL: '1' }, // guard against recursion
  });
  if (result.status !== 0) {
    console.error(`postinstall: FAILED installing ${ws} (exit ${result.status}).`);
    process.exit(result.status || 1);
  }
  installed += 1;
}

console.log(`\npostinstall: done (${installed} workspace${installed === 1 ? '' : 's'} installed).`);
