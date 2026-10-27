import api from './axios';

export const getCompareMeta = () => api.get('/compare/meta').then((r) => r.data.data);

export const getCompareData = ({ items, startDate, endDate }) =>
  api
    .get('/compare', {
      params: { items: items.map((i) => `${i.unitId}:${i.paramId}`).join(','), startDate, endDate },
    })
    .then((r) => r.data.data);