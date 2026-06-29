import http from './client';

export const configApi = {
  getAll: () => http.get('/config'),
  get: (keys: string[]) => http.get('/config', { params: { keys: keys.join(',') } }),
  update: (data: Record<string, any>) => http.put('/config', data),
};
