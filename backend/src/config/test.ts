/** Set DENO_INTEGRATION_TEST=1 to run tests that require external binaries. */
export const skipIntegration = Deno.env.get('DENO_INTEGRATION_TEST') !== '1';
