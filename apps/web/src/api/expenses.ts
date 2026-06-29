import http from './client';

export const expenseReportsApi = {
  create: (data: { type: string; amount: number; screenshotUrl?: string; description?: string }) =>
    http.post('/expense-reports', data),
  list: (params?: { status?: string }) => http.get('/expense-reports', { params }),
  review: (id: string, status: string, note?: string) =>
    http.put(`/expense-reports/${id}/review`, { status, note }),
  monthlySummary: (month?: string) =>
    http.get('/expense-reports/monthly-summary', { params: { month } }),
};
