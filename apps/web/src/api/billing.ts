import http from './client';
import axios from 'axios';

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const billingApi = {
  list: (params?: { status?: string }) =>
    http.get('/transactions', { params }),
  approve: (id: string) => http.put(`/transactions/${id}/approve`),
  reject: (id: string) => http.put(`/transactions/${id}/reject`),
  batchApprove: (ids: string[]) =>
    http.put('/transactions/batch', { ids, action: 'approve' }),
  batchReject: (ids: string[]) =>
    http.put('/transactions/batch', { ids, action: 'reject' }),
  dailyRevenue: (date: string) =>
    http.get('/revenue/daily', { params: { date } }),
  monthlyRevenue: (month: string) =>
    http.get('/revenue/monthly', { params: { month } }),
  profitLoss: (secondToken: string) =>
    http.get('/revenue/stats', {
      headers: { 'x-second-token': secondToken },
    }),
  expenses: (secondToken: string) =>
    http.get('/expenses', {
      headers: { 'x-second-token': secondToken },
    }),
  downloadDailyCSV: async (date: string) => {
    const token = sessionStorage.getItem('accessToken');
    const res = await axios.get('/api/revenue/daily/csv', {
      params: { date },
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const cd = res.headers['content-disposition'] ?? '';
    const m = cd.match(/filename="?(.+?)"?$/);
    const filename = m ? m[1] : `revenue-daily-${date}.csv`;
    triggerDownload(res.data, filename);
  },
  walletTransactions: (params?: { status?: string }) =>
    http.get('/wallet-transactions', { params }),
  reviewWalletTransaction: (id: string, status: string) =>
    http.put(`/wallet-transactions/${id}/review`, { status }),
  downloadMonthlyCSV: async (month: string) => {
    const token = sessionStorage.getItem('accessToken');
    const res = await axios.get('/api/revenue/monthly/csv', {
      params: { month },
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const cd = res.headers['content-disposition'] ?? '';
    const m = cd.match(/filename="?(.+?)"?$/);
    const filename = m ? m[1] : `revenue-monthly-${month}.csv`;
    triggerDownload(res.data, filename);
  },
};
