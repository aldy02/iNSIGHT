const { QueryTypes, Op } = require('sequelize');
const { sequelize, Plant, DailyReading } = require('../models');

// Unit + parameted that have source columns or active kop
const PTS = `(SELECT unit_id, parameter_id FROM source_columns
              UNION
              SELECT unit_id, parameter_id FROM kop_parameters WHERE is_active = 1)`;

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const num = (x) => (x === null || x === undefined ? null : Number(x));
const toYmd = (v) => (typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10));
const toLabel = (ymd) => {
  const [, m, d] = ymd.split('-').map(Number);
  return `${d} ${BULAN[m - 1]}`;
};

// GET /api/compare/meta
// { data: { minDate: 'YYYY-MM-DD' | null, plants: [{ id, nama, kode, categories: [{ nama, subs: [{ nama, units: [{ id, nama, parameters: [{ id, nama, satuan }] }] }] }] }] } }
exports.getMeta = async (req, res) => {
  try {
    const plants = await Plant.findAll({ attributes: ['id', 'nama', 'kode'], order: [['nama', 'ASC']] });

    // The earliest date, used in frontend as limit date range
    const minTanggal = await DailyReading.min('tanggal');

    const rows = await sequelize.query(
      `SELECT ar.plant_id, mc.nama AS main, sc.nama AS sub,
              u.id AS unit_id, u.nama AS unit, p.id AS parameter_id, p.nama AS parameter, k.satuan
         FROM ${PTS} pts
         JOIN units u             ON u.id  = pts.unit_id
         JOIN sub_categories sc   ON sc.id = u.sub_category_id
         JOIN main_categories mc  ON mc.id = sc.main_category_id
         JOIN areas ar            ON ar.id = mc.area_id
         JOIN parameters p        ON p.id  = pts.parameter_id
         LEFT JOIN kop_parameters k
                ON k.unit_id = pts.unit_id AND k.parameter_id = pts.parameter_id AND k.is_active = 1
        ORDER BY mc.nama, sc.nama, u.nama, p.nama`,
      { type: QueryTypes.SELECT },
    );

    const byPlant = new Map();
    rows.forEach((r) => {
      if (!byPlant.has(r.plant_id)) byPlant.set(r.plant_id, []);
      const cats = byPlant.get(r.plant_id);

      let cat = cats.find((c) => c.nama === r.main);
      if (!cat) { cat = { nama: r.main, subs: [] }; cats.push(cat); }

      let sub = cat.subs.find((s) => s.nama === r.sub);
      if (!sub) { sub = { nama: r.sub, units: [] }; cat.subs.push(sub); }

      let unit = sub.units.find((u) => u.id === String(r.unit_id));
      if (!unit) { unit = { id: String(r.unit_id), nama: r.unit, parameters: [] }; sub.units.push(unit); }

      unit.parameters.push({ id: String(r.parameter_id), nama: r.parameter, satuan: r.satuan || '' });
    });

    const data = plants
      .map((p) => ({ id: p.id, nama: p.nama, kode: p.kode, categories: byPlant.get(p.id) || [] }))
      .filter((p) => p.categories.length > 0);

    res.json({ data: { plants: data, minDate: minTanggal ? toYmd(minTanggal) : null } });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data filter perbandingan', error: err.message });
  }
};

// GET /api/compare?items=12:3,15:3&startDate=...&endDate=...   (item = unitId:parameterId)
// { data: [{ unitId, parameterId, plantKode, plantNama, main, sub, unit, parameter, satuan, kop, data: [...] }] }
exports.getCompare = async (req, res) => {
  try {
    const { items, startDate, endDate } = req.query;
    if (!items || !startDate || !endDate) {
      return res.status(400).json({ message: 'items, startDate, endDate wajib diisi' });
    }

    const pairs = String(items)
      .split(',')
      .map((s) => s.trim().split(':').map(Number))
      .filter(([u, p]) => Number.isInteger(u) && Number.isInteger(p) && u > 0 && p > 0);
    if (pairs.length === 0) return res.status(400).json({ message: 'Format items tidak valid (unitId:parameterId)' });

    const unitIds = [...new Set(pairs.map(([u]) => u))];
    const paramIds = [...new Set(pairs.map(([, p]) => p))];

    const points = await sequelize.query(
      `SELECT pts.unit_id, pts.parameter_id, ar.plant_id,
              mc.nama AS main, sc.nama AS sub, u.nama AS unit, p.nama AS parameter,
              k.min_value, k.min_inclusive, k.max_value, k.max_inclusive, k.satuan
         FROM ${PTS} pts
         JOIN units u             ON u.id  = pts.unit_id
         JOIN sub_categories sc   ON sc.id = u.sub_category_id
         JOIN main_categories mc  ON mc.id = sc.main_category_id
         JOIN areas ar            ON ar.id = mc.area_id
         JOIN parameters p        ON p.id  = pts.parameter_id
         LEFT JOIN kop_parameters k
                ON k.unit_id = pts.unit_id AND k.parameter_id = pts.parameter_id AND k.is_active = 1
        WHERE pts.unit_id IN (:unitIds) AND pts.parameter_id IN (:paramIds)`,
      { replacements: { unitIds, paramIds }, type: QueryTypes.SELECT },
    );
    const pointMap = new Map(points.map((p) => [`${p.unit_id}:${p.parameter_id}`, p]));

    const plantRows = await Plant.findAll({ where: { id: [...new Set(points.map((p) => p.plant_id))] } });
    const plantById = new Map(plantRows.map((p) => [p.id, p]));

    const readings = await DailyReading.findAll({
      attributes: ['unit_id', 'parameter_id', 'tanggal', 'nilai_numeric', 'status'],
      where: {
        unit_id: unitIds,
        parameter_id: paramIds,
        tanggal: { [Op.between]: [startDate, endDate] },
      },
      order: [['tanggal', 'ASC']],
    });

    const readingMap = new Map();
    readings.forEach((r) => {
      const key = `${r.unit_id}:${r.parameter_id}`;
      if (!pointMap.has(key)) return; // only requested pair
      const tanggal = toYmd(r.tanggal);
      if (!readingMap.has(key)) readingMap.set(key, []);
      readingMap.get(key).push({
        tanggal,
        label: toLabel(tanggal),
        nilai: r.nilai_numeric != null ? parseFloat(r.nilai_numeric) : null,
        status: r.status,
      });
    });

    const seen = new Set();
    const data = [];
    pairs.forEach(([unitId, parameterId]) => {
      const key = `${unitId}:${parameterId}`;
      const p = pointMap.get(key);
      if (!p || seen.has(key)) return;
      seen.add(key);
      const plant = plantById.get(p.plant_id);
      data.push({
        unitId: String(unitId),
        parameterId: String(parameterId),
        plantKode: plant?.kode ?? '',
        plantNama: plant?.nama ?? '',
        main: p.main,
        sub: p.sub,
        unit: p.unit,
        parameter: p.parameter,
        satuan: p.satuan || '',
        kop: {
          min: num(p.min_value),
          max: num(p.max_value),
          minInclusive: p.min_inclusive == null ? true : !!p.min_inclusive,
          maxInclusive: p.max_inclusive == null ? true : !!p.max_inclusive,
        },
        data: readingMap.get(key) || [],
      });
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data perbandingan', error: err.message });
  }
};