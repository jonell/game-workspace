import http from './client';

export const dashboardApi = {
  get: (studioId?: string) => http.get('/dashboard', { params: studioId ? { studioId } : {} }),
  trend: (days?: number) => http.get('/dashboard/trend', { params: { days } }),
  companions: () => http.get('/dashboard/companions'),
};
