import api from './axios';

// Get pabrik list
export const getPlants = async () => {
  const res = await api.get('/reports/plants');
  return res.data.data; // [{ id, nama, kode }]
};

// Report Structure
export const getSummaryStructure = async (plantId) => {
  const res = await api.get('/reports/structure', { params: { plantId } });
  return res.data.data;
};

// Daily data, one parameter
export const getReadings = async ({ unitId, parameterId, start, end }) => {
  const res = await api.get('/reports/readings', {
    params: { unitId, parameterId, startDate: start, endDate: end },
  });
  return res.data.data;
};

// Get plant report with period, if none return null
export const getReport = async ({ plantId, start, end }) => {
  const res = await api.get('/reports', { params: { plantId, start, end } });
  return res.data.data;
};

// Save report
export const saveReport = async (payload) => {
  const res = await api.put('/reports', payload);
  return res.data;
};
