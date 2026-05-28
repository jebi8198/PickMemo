export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal server error';
}
