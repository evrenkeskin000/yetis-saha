import { vi } from 'vitest';

type ChainResult = { data: unknown; error: unknown; count?: number | null };

/** Zincirlenen Supabase sorgu mock'u. */
export function createQueryBuilder(result: ChainResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'gte',
    'lte',
    'order',
    'range',
    'limit',
    'single',
    'maybeSingle',
  ];
  for (const m of methods) {
    builder[m] = vi.fn(self);
  }
  builder.then = undefined;
  // terminal
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  // make thenable for await query
  (builder as { then?: unknown }).then = (
    resolve: (v: ChainResult) => unknown
  ) => Promise.resolve(result).then(resolve);
  return builder;
}

export function createSupabaseMock(options?: {
  user?: { id: string } | null;
  profile?: Record<string, unknown> | null;
  queryResult?: ChainResult;
}) {
  const user = options?.user === undefined ? { id: 'user-1' } : options.user;
  const profile =
    options?.profile === undefined
      ? {
          id: 'user-1',
          role: 'yetis_admin',
          is_active: true,
          dealership_id: null,
        }
      : options.profile;

  const query = createQueryBuilder(
    options?.queryResult ?? { data: profile, error: null }
  );

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
        error: null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => query),
    _query: query,
  };
}
