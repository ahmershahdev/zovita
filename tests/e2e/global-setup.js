import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Before the run: give the seeded owner the known test two-step secret (tests/e2e/prepare.php). */
export default function globalSetup() {
    execFileSync('php', ['tests/e2e/prepare.php'], { stdio: 'inherit' });
    rmSync(join(tmpdir(), 'zovita-e2e-totp-step'), { force: true });
}
