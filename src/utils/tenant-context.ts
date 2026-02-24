import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantContextState {
  tenantId?: string;
  userId?: string;
  role?: 'CLIENT' | 'AGENT' | 'ADMIN';
}

const storage = new AsyncLocalStorage<TenantContextState>();

export const runWithTenantContext = <T>(state: TenantContextState, callback: () => T): T => {
  return storage.run(state, callback);
};

export const getTenantContext = (): TenantContextState => {
  return storage.getStore() ?? {};
};
