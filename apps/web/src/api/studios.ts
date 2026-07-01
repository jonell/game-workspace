import http from './client';

export const studiosApi = {
  list: () => http.get('/studios'),
  create: (
    name: string,
    type: string,
    managerUsername: string,
    managerPassword: string,
    managerDisplayName?: string,
  ) => http.post('/studios', {
    name, type, managerUsername, managerPassword, managerDisplayName,
  }),
  update: (id: string, name: string, type: string) => http.put(`/studios/${id}`, { name, type }),
};
