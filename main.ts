// Comet Courier's entry program: hand the game in.
//
// It copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with buildDossier from the kit's
// library (vendor/makefun-game.ts, unchanged). The grader runs this twice in
// a sandbox with no network and a read-only repository; both runs must write
// the same bytes, so the copy walks directories in sorted order, refuses
// symlinks, and writes nothing but file contents and the dossier.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The competition's gate caps, as its rules state them.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function copyTree(sourceDir: string, targetDir: string): number {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  let copied = 0;
  for (const entry of entries) {
    const source = join(sourceDir, entry.name);
    const target = join(targetDir, entry.name);
    const stat = lstatSync(source);
    if (stat.isSymbolicLink()) {
      throw new Error(`refusing symlink in the entry: ${source}`);
    }
    if (stat.isDirectory()) {
      copied += copyTree(source, target);
    } else if (stat.isFile()) {
      writeFileSync(target, readFileSync(source));
      copied += 1;
    }
  }
  return copied;
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Start from a clean slate so a stale file can never survive into the
  // output; only the three paths this program owns are removed.
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    rmSync(join(OUTPUT_DIR, name), { recursive: true, force: true });
  }

  const gameFiles = copyTree(gameDir, join(OUTPUT_DIR, 'game'));
  const shotFiles = copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'));
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);

  console.log(
    `comet-courier: ${gameFiles} game files, ${shotFiles} screenshots, dossier.json ${dossier.length} bytes -> ${OUTPUT_DIR}`,
  );
}

main();
