import http from './client';

export const aiApi = {
  analyzeCustomer: (id: string) => http.post(`/ai/analyze/${id}`),
};
