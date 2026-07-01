import http from './client';

export const dashboardApi = {
  get: (studioId?: string) => http.get('/dashboard', { params: studioId ? { studioId } : {} }),
  trend: (days?: number) => http.get('/dashboard/trend', { params: { days } }),
  companions: () => http.get('/dashboard/companions'),
  getRevenueOverview: () => http.get('/dashboard/revenue-overview'),
  getCompanionRevenueDetail: (id: string) => http.get(`/dashboard/companion-revenue/${id}`),
  getDailyRevenue: (days?: number) => http.get('/dashboard/trend', { params: { days: days || 31 } }),
};
