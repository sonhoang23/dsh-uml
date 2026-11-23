import type { BetterSidebarService } from 'dsh-better-sidebar'

export interface Scope { sessionId: string; cwd?: string }
export type ReadResult =
  | { kind: 'text'; content: string; mtimeMs?: number; size: number }
  | { kind: 'binary' | 'too-large'; size: number }

const payload = (scope: Scope, path: string) => ({
  sessionId: scope.sessionId, path, ...(scope.cwd ? { cwd: scope.cwd } : {}),
})

async function envelope<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null) as
    | { ok?: boolean; value?: T; error?: { message?: string } }
    | null
  if (!response.ok || result?.ok !== true || result.value === undefined)
    throw new Error(result?.error?.message ?? ('HTTP ' + response.status))
  return result.value
}

/** Use Better Sidebar's session-bound authenticated routes, never raw file URLs. */
export async function readUml(
  service: BetterSidebarService, scope: Scope, path: string, signal?: AbortSignal,
): Promise<ReadResult> {
  return envelope<ReadResult>(await fetch(service.hostRouteUrl('sidebar/api/fs.read'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload(scope, path)),
    signal,
  }))
}

export async function writeUml(
  service: BetterSidebarService, scope: Scope, path: string, text: string, mtime: number,
): Promise<number> {
  const query = new URLSearchParams({
    ...payload(scope, path), expectedMtimeMs: String(mtime),
  })
  const result = await envelope<{ mtimeMs?: number }>(await fetch(
    service.hostRouteUrl('sidebar/write?' + query.toString()),
    { method: 'POST', headers: { 'content-type': 'text/plain; charset=utf-8' }, body: text },
  ))
  if (typeof result.mtimeMs !== 'number') throw new Error('The file service did not provide a new mtime.')
  return result.mtimeMs
}
