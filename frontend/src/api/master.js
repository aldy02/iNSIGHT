import api from './axios';

export const getStructure = (plantId, kategoriSlug) =>
  api.get('/master/structure', { params: { plantId, kategori: kategoriSlug } }).then((res) => res.data.data);

export const getReadings = (unitId, parameterId, startDate, endDate) =>
  api.get('/readings', { params: { unitId, parameterId, startDate, endDate } }).then((res) => res.data.data);