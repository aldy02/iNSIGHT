import api from './axios';

// Pilihan untuk form: struktur menu (kategori utama > sub kategori > unit), daftar parameter, file sumber
export const getParameterMeta = (plantId) =>
  api.get('/parameters/meta', { params: { plantId } }).then((r) => r.data);

// Daftar parameter (parameter + lokasi + kolom + KOP) untuk satu pabrik
export const getParameters = (plantId) =>
  api.get('/parameters', { params: { plantId } }).then((r) => r.data);

export const createParameter = (payload) =>
  api.post('/parameters', payload).then((r) => r.data);

export const updateParameter = (unitId, parameterId, payload) =>
  api.put(`/parameters/${unitId}/${parameterId}`, payload).then((r) => r.data);

export const deleteParameter = (unitId, parameterId) =>
  api.delete(`/parameters/${unitId}/${parameterId}`).then((r) => r.data);