// Split out from betaReward.ts so client components can read this constant
// without pulling in that file's `pg`/db import (which breaks the client bundle).
export const FIRST_N_COUNT = 10;
