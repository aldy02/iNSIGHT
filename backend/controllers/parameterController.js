const { QueryTypes } = require('sequelize');
const {
  sequelize, Plant, SubCategory, Unit, Parameter, DataSource, SourceColumn,
} = require('../models');

// Helper
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const clean = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const todayStr = () => new Date().toISOString().slice(0, 10);
const compactName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

function toNumberOrNull(v, label) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) throw new HttpError(400, `${label} harus berupa angka.`);
  return n;
}

// Validate and normalize body for add/edit
function parseBody(body) {
  const v = {
    plantId: Number(body.plantId),
    parameter: clean(body.parameter),
    main: clean(body.main),
    sub: clean(body.sub),
    unit: clean(body.unit),
    sourceId: Number(body.sourceId),
    newSourceName: clean(body.newSource?.nama),
    column: String(body.column ?? '').trim().toUpperCase(),
    min: toNumberOrNull(body.min, 'Minimum'),
    max: toNumberOrNull(body.max, 'Maksimum'),
    minInc: body.minInc === undefined ? true : !!body.minInc,
    maxInc: body.maxInc === undefined ? true : !!body.maxInc,
    satuan: clean(body.satuan),
    effectiveDate: body.effectiveDate ? String(body.effectiveDate).slice(0, 10) : todayStr(),
    // Permision to create new sub category / unit / source (sended from frontend when user chooste to "+ Buat baru")
    allowCreate: {
      sub: !!body.allowCreate?.sub,
      unit: !!body.allowCreate?.unit,
      source: !!body.allowCreate?.source,
    },
  };

  if (!Number.isInteger(v.plantId) || v.plantId <= 0) throw new HttpError(400, 'plantId wajib dikirim.');
  if (!v.parameter) throw new HttpError(400, 'Nama parameter wajib diisi.');
  if (v.parameter.length > 100) throw new HttpError(400, 'Nama parameter maksimal 100 karakter.');
  for (const [key, label] of [['main', 'Kategori utama'], ['sub', 'Sub kategori'], ['unit', 'Unit']]) {
    if (!v[key]) throw new HttpError(400, `${label} wajib diisi (isi "-" kalau tidak dipakai).`);
    if (v[key].length > (key === 'unit' ? 150 : 100)) throw new HttpError(400, `${label} terlalu panjang.`);
  }
  if (v.allowCreate.source) {
    // New source: source name is enough
    if (!v.newSourceName) throw new HttpError(400, 'Nama sumber wajib diisi.');
    if (v.newSourceName.length > 100) throw new HttpError(400, 'Nama sumber maksimal 100 karakter.');
    if (!compactName(v.newSourceName)) throw new HttpError(400, 'Nama sumber harus memuat huruf atau angka.');
  } else if (!Number.isInteger(v.sourceId) || v.sourceId <= 0) {
    throw new HttpError(400, 'File sumber wajib dipilih.');
  }
  if (!/^[A-Z]{1,3}$/.test(v.column)) throw new HttpError(400, 'Huruf kolom tidak valid. Contoh: D atau AB.');
  if (v.min !== null && v.max !== null && v.min > v.max) {
    throw new HttpError(400, 'Nilai maksimum tidak boleh lebih kecil dari minimum.');
  }
  v.hasKop = v.min !== null || v.max !== null;
  if (v.satuan.length > 20) throw new HttpError(400, 'Satuan maksimal 20 karakter.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveDate)) throw new HttpError(400, 'Format tanggal berlaku tidak valid.');
  return v;
}

const pointKey = (req) => {
  const unitId = Number(req.params.unitId);
  const parameterId = Number(req.params.parameterId);
  if (!Number.isInteger(unitId) || !Number.isInteger(parameterId)) throw new HttpError(400, 'Parameter URL tidak valid.');
  return { unitId, parameterId };
};

// Create new source file for one plant
async function createSource(t, plantId, nama) {
  const existing = await DataSource.findAll({
    where: { plant_id: plantId },
    order: [['id', 'ASC']],
    transaction: t,
  });
  if (existing.some((s) => compactName(s.nama) === compactName(nama))) {
    throw new HttpError(409, `Sumber "${nama}" sudah ada di pabrik ini.`);
  }
  const tpl = existing[0];
  return DataSource.create(
    {
      plant_id: plantId,
      nama,
      sheet_name: tpl ? tpl.sheet_name : 'Sheet',
      date_column: tpl ? tpl.date_column : 'A',
      data_start_row: tpl ? tpl.data_start_row : 6,
    },
    { transaction: t },
  );
}

// Re calculate daily status data (formula equal wiht tigger in DB)
// Need to call after KOP change, Cause trigge only run when daily data change
async function recomputeStatus(t, unitId, parameterId) {
  await sequelize.query(
    `UPDATE daily_readings dr
       LEFT JOIN kop_parameters k
         ON k.unit_id = dr.unit_id AND k.parameter_id = dr.parameter_id AND k.is_active = 1
        SET dr.status = CASE
          WHEN k.id IS NULL THEN 'no_kop'
          WHEN dr.nilai_numeric IS NULL THEN 'no_kop'
          WHEN (k.min_value IS NOT NULL AND ((k.min_inclusive = 1 AND dr.nilai_numeric < k.min_value) OR (k.min_inclusive = 0 AND dr.nilai_numeric <= k.min_value)))
            OR (k.max_value IS NOT NULL AND ((k.max_inclusive = 1 AND dr.nilai_numeric > k.max_value) OR (k.max_inclusive = 0 AND dr.nilai_numeric >= k.max_value)))
            THEN 'out_of_range'
          ELSE 'normal' END
      WHERE dr.unit_id = :unitId AND dr.parameter_id = :parameterId`,
    { replacements: { unitId, parameterId }, transaction: t },
  );
}

// Unit + parameter is considered registered if has an active kop or column
async function pointExists(t, unitId, parameterId) {
  const [row] = await sequelize.query(
    `SELECT (SELECT COUNT(*) FROM source_columns WHERE unit_id = :unitId AND parameter_id = :parameterId)
          + (SELECT COUNT(*) FROM kop_parameters WHERE unit_id = :unitId AND parameter_id = :parameterId AND is_active = 1) AS n`,
    { replacements: { unitId, parameterId }, type: QueryTypes.SELECT, transaction: t },
  );
  return Number(row.n) > 0;
}

// Daily data ammount for one parameter
async function countReadings(t, unitId, parameterId) {
  const [row] = await sequelize.query(
    'SELECT COUNT(*) AS n FROM daily_readings WHERE unit_id = :unitId AND parameter_id = :parameterId',
    { replacements: { unitId, parameterId }, type: QueryTypes.SELECT, transaction: t },
  );
  return Number(row.n);
}

// Areas table only use as a pabrik connector (not displayed for user)
const LIST_SQL = `
  SELECT pts.unit_id, pts.parameter_id,
         ar.plant_id, mc.nama AS main, sc.nama AS sub, u.nama AS unit, p.nama AS parameter,
         s.data_source_id AS source_id, s.column_letter,
         k.min_value, k.min_inclusive, k.max_value, k.max_inclusive, k.satuan, k.keterangan,
         DATE_FORMAT(k.effective_date, '%Y-%m-%d') AS effective_date
    FROM (SELECT unit_id, parameter_id FROM source_columns
          UNION
          SELECT unit_id, parameter_id FROM kop_parameters WHERE is_active = 1) pts
    JOIN units u            ON u.id  = pts.unit_id
    JOIN sub_categories sc  ON sc.id = u.sub_category_id
    JOIN main_categories mc ON mc.id = sc.main_category_id
    JOIN areas ar           ON ar.id = mc.area_id
    JOIN parameters p       ON p.id  = pts.parameter_id
    LEFT JOIN source_columns s ON s.unit_id = pts.unit_id AND s.parameter_id = pts.parameter_id
    LEFT JOIN kop_parameters k ON k.unit_id = pts.unit_id AND k.parameter_id = pts.parameter_id AND k.is_active = 1
   WHERE ar.plant_id = :plantId`;

const num = (x) => (x === null || x === undefined ? null : Number(x));

function mapRow(r) {
  return {
    id: `${r.unit_id}-${r.parameter_id}`,
    unitId: r.unit_id,
    parameterId: r.parameter_id,
    plantId: r.plant_id,
    parameter: r.parameter,
    main: r.main,
    sub: r.sub,
    unit: r.unit,
    sourceId: r.source_id,
    column: r.column_letter,
    min: num(r.min_value),
    max: num(r.max_value),
    minInc: r.min_inclusive === null ? true : !!r.min_inclusive,
    maxInc: r.max_inclusive === null ? true : !!r.max_inclusive,
    satuan: r.satuan || '',
    effectiveDate: r.effective_date,
    keterangan: r.keterangan,
  };
}

async function fetchPoint(unitId, parameterId, plantId) {
  const rows = await sequelize.query(
    `${LIST_SQL} AND pts.unit_id = :unitId AND pts.parameter_id = :parameterId`,
    { replacements: { plantId, unitId, parameterId }, type: QueryTypes.SELECT },
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

// save parameter + location + column source + KOP, oldkey = null for add new
async function savePoint(body, oldKey) {
  const v = parseBody(body);

  const plant = await Plant.findByPk(v.plantId);
  if (!plant) throw new HttpError(404, `Pabrik dengan id ${v.plantId} tidak ditemukan.`);

  const t = await sequelize.transaction();
  try {
    // Source File: Choose the existing one or create new one
    const source = v.allowCreate.source
      ? await createSource(t, v.plantId, v.newSourceName)
      : await DataSource.findOne({ where: { id: v.sourceId, plant_id: v.plantId }, transaction: t });
    if (!source) throw new HttpError(400, 'File sumber tidak ditemukan untuk pabrik ini.');

    // Edit: make sure the old point actually belongs to this plant
    if (oldKey) {
      const [own] = await sequelize.query(
        `SELECT COUNT(*) AS n FROM units u
           JOIN sub_categories sc ON sc.id = u.sub_category_id
           JOIN main_categories mc ON mc.id = sc.main_category_id
           JOIN areas ar ON ar.id = mc.area_id
          WHERE u.id = :unitId AND ar.plant_id = :plantId`,
        { replacements: { unitId: oldKey.unitId, plantId: v.plantId }, type: QueryTypes.SELECT, transaction: t },
      );
      if (Number(own.n) === 0 || !(await pointExists(t, oldKey.unitId, oldKey.parameterId))) {
        throw new HttpError(404, 'Parameter yang diedit tidak ditemukan.');
      }
    }

    // New name: use the existing parameter or create new one
    const [param] = await Parameter.findOrCreate({ where: { nama: v.parameter }, transaction: t });

    // Main category mush be exist in this plant (Menentukan menu dashboard), not created from form
    const mains = await sequelize.query(
      `SELECT mc.id FROM main_categories mc
         JOIN areas ar ON ar.id = mc.area_id
        WHERE ar.plant_id = :plantId AND mc.nama = :main`,
      { replacements: { plantId: v.plantId, main: v.main }, type: QueryTypes.SELECT, transaction: t },
    );
    if (mains.length === 0) throw new HttpError(422, `Kategori utama "${v.main}" belum ada. Pilih dari daftar.`);
    if (mains.length > 1) throw new HttpError(409, `Kategori utama "${v.main}" ganda di pabrik ini. Hubungi admin.`);
    const mainId = mains[0].id;

    // Sub category and unit: creat only if frontend give permision (+ Buat Baru)
    const resolve = async (Model, where, label, allow) => {
      const found = await Model.findOne({ where, transaction: t });
      if (found) return found;
      if (!allow) throw new HttpError(422, `${label} "${where.nama}" belum ada. Pilih dari daftar atau pakai "Buat baru".`);
      return Model.create(where, { transaction: t });
    };
    const sub = await resolve(SubCategory, { main_category_id: mainId, nama: v.sub }, 'Sub kategori', v.allowCreate.sub);
    const unit = await resolve(Unit, { sub_category_id: sub.id, nama: v.unit }, 'Unit', v.allowCreate.unit);

    const newKey = { unitId: unit.id, parameterId: param.id };
    const moved = !oldKey || oldKey.unitId !== newKey.unitId || oldKey.parameterId !== newKey.parameterId;

    // If parameter already exist in this unit
    if (moved && (await pointExists(t, newKey.unitId, newKey.parameterId))) {
      throw new HttpError(409, 'Parameter ini sudah terdaftar di unit tersebut. Edit baris yang sudah ada.');
    }

    if (oldKey && moved && (await countReadings(t, newKey.unitId, newKey.parameterId)) > 0) {
      throw new HttpError(409, 'Titik tujuan sudah punya data harian, sehingga tidak bisa digabung. Hubungi admin.');
    }

    // One column in one file only allow to use for 1 parameter
    const clash = await SourceColumn.findOne({
      where: { data_source_id: source.id, column_letter: v.column },
      transaction: t,
    });
    if (clash && !(oldKey && clash.unit_id === oldKey.unitId && clash.parameter_id === oldKey.parameterId)) {
      const [who] = await sequelize.query(
        `SELECT p.nama AS parameter, u.nama AS unit, sc.nama AS sub, mc.nama AS main
           FROM units u
           JOIN sub_categories sc ON sc.id = u.sub_category_id
           JOIN main_categories mc ON mc.id = sc.main_category_id
           JOIN parameters p ON p.id = :pid
          WHERE u.id = :uid`,
        { replacements: { pid: clash.parameter_id, uid: clash.unit_id }, type: QueryTypes.SELECT, transaction: t },
      );
      const where = who ? [who.main, who.sub, who.unit].filter((x) => x && x !== '-').join(' › ') : '';
      throw new HttpError(409, `Kolom ${v.column} di file ${source.nama} sudah dipakai ${who ? who.parameter : 'parameter lain'}${where ? ` (${where})` : ''}.`);
    }

    // Source column
    const existingCol = oldKey
      ? await SourceColumn.findOne({ where: { unit_id: oldKey.unitId, parameter_id: oldKey.parameterId }, transaction: t })
      : null;
    if (existingCol) {
      await existingCol.update(
        { data_source_id: source.id, column_letter: v.column, unit_id: newKey.unitId, parameter_id: newKey.parameterId },
        { transaction: t },
      );
    } else {
      await SourceColumn.create(
        { data_source_id: source.id, column_letter: v.column, unit_id: newKey.unitId, parameter_id: newKey.parameterId },
        { transaction: t },
      );
    }

    // KOP
    const [existingKop] = oldKey
      ? await sequelize.query(
          'SELECT id FROM kop_parameters WHERE unit_id = :unitId AND parameter_id = :parameterId AND is_active = 1',
          { replacements: oldKey, type: QueryTypes.SELECT, transaction: t },
        )
      : [];
    const kopValues = {
      unitId: newKey.unitId, parameterId: newKey.parameterId,
      min: v.min, minInc: v.minInc ? 1 : 0, max: v.max, maxInc: v.maxInc ? 1 : 0,
      satuan: v.satuan || null, effectiveDate: v.effectiveDate,
    };
    if (v.hasKop && existingKop) {
      await sequelize.query(
        `UPDATE kop_parameters
            SET unit_id = :unitId, parameter_id = :parameterId, min_value = :min, min_inclusive = :minInc,
                max_value = :max, max_inclusive = :maxInc, satuan = :satuan, effective_date = :effectiveDate
          WHERE id = :id`,
        { replacements: { ...kopValues, id: existingKop.id }, transaction: t },
      );
    } else if (v.hasKop) {
      await sequelize.query(
        `INSERT INTO kop_parameters (unit_id, parameter_id, min_value, min_inclusive, max_value, max_inclusive, satuan, effective_date, is_active)
         VALUES (:unitId, :parameterId, :min, :minInc, :max, :maxInc, :satuan, :effectiveDate, 1)`,
        { replacements: kopValues, transaction: t },
      );
    } else if (existingKop) {
      await sequelize.query('DELETE FROM kop_parameters WHERE id = :id', { replacements: { id: existingKop.id }, transaction: t });
    }

    // If unit in parameter change and there is no parameter exist in the change unit so it will allowwd
    if (oldKey && moved) {
      await sequelize.query(
        `UPDATE daily_readings
            SET unit_id = :newUnitId, parameter_id = :newParameterId
          WHERE unit_id = :oldUnitId AND parameter_id = :oldParameterId`,
        {
          replacements: {
            newUnitId: newKey.unitId,
            newParameterId: newKey.parameterId,
            oldUnitId: oldKey.unitId,
            oldParameterId: oldKey.parameterId,
          },
          transaction: t,
        },
      );
    }

    // Status daily data updated
    await recomputeStatus(t, newKey.unitId, newKey.parameterId);
    if (oldKey && moved) await recomputeStatus(t, oldKey.unitId, oldKey.parameterId);

    await t.commit();
    return { plantId: v.plantId, ...newKey };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

function handleError(res, err) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Data bentrok dengan data yang sudah ada (kolom atau titik ukur sudah dipakai).' });
  }
  console.error('Parameter admin error:', err);
  return res.status(500).json({ message: 'Terjadi kesalahan di server.', error: err.message });
}

// Handlers
// GET /api/parameters/meta?plantId=
exports.getMeta = async (req, res) => {
  try {
    const plantId = Number(req.query.plantId);
    if (!Number.isInteger(plantId) || plantId <= 0) throw new HttpError(400, 'plantId wajib dikirim.');

    const flat = await sequelize.query(
      `SELECT mc.nama AS main, sc.nama AS sub, u.nama AS unit
         FROM areas ar
         JOIN main_categories mc      ON mc.area_id = ar.id
         LEFT JOIN sub_categories sc  ON sc.main_category_id = mc.id
         LEFT JOIN units u            ON u.sub_category_id = sc.id
        WHERE ar.plant_id = :plantId
        ORDER BY mc.nama, sc.nama, u.nama`,
      { replacements: { plantId }, type: QueryTypes.SELECT },
    );

    const tree = [];
    for (const r of flat) {
      let m = tree.find((x) => x.nama === r.main);
      if (!m) { m = { nama: r.main, subs: [] }; tree.push(m); }
      if (!r.sub) continue;
      let s = m.subs.find((x) => x.nama === r.sub);
      if (!s) { s = { nama: r.sub, units: [] }; m.subs.push(s); }
      if (r.unit && !s.units.includes(r.unit)) s.units.push(r.unit);
    }

    const parameters = (await Parameter.findAll({ order: [['nama', 'ASC']] })).map((p) => p.nama);
    const sources = (await DataSource.findAll({
      where: { plant_id: plantId }, attributes: ['id', 'nama'], order: [['nama', 'ASC']],
    })).map((s) => ({ id: s.id, nama: s.nama }));

    return res.status(200).json({ tree, parameters, sources });
  } catch (err) {
    return handleError(res, err);
  }
};

// GET /api/parameters?plantId=
// List parameter (parameter + location + column + kop)
exports.listParameters = async (req, res) => {
  try {
    const plantId = Number(req.query.plantId);
    if (!Number.isInteger(plantId) || plantId <= 0) throw new HttpError(400, 'plantId wajib dikirim.');
    const rows = await sequelize.query(
      `${LIST_SQL} ORDER BY mc.nama, sc.nama, u.nama, p.nama`,
      { replacements: { plantId }, type: QueryTypes.SELECT },
    );
    return res.status(200).json(rows.map(mapRow));
  } catch (err) {
    return handleError(res, err);
  }
};

// POST /api/parameters
exports.createParameter = async (req, res) => {
  try {
    const saved = await savePoint(req.body, null);
    const point = await fetchPoint(saved.unitId, saved.parameterId, saved.plantId);
    return res.status(201).json({ message: 'Parameter ditambahkan.', data: point });
  } catch (err) {
    return handleError(res, err);
  }
};

// PUT /api/parameters/:unitId/:parameterId
exports.updateParameter = async (req, res) => {
  try {
    const saved = await savePoint(req.body, pointKey(req));
    const point = await fetchPoint(saved.unitId, saved.parameterId, saved.plantId);
    return res.status(200).json({ message: 'Parameter diperbarui.', data: point });
  } catch (err) {
    return handleError(res, err);
  }
};

// DELETE /api/parameters/:unitId/:parameterId
// Delete parameter and clean the parent (Source file, unit, sub category, dan parameter) if not used in other place or root
exports.deleteParameter = async (req, res) => {
  let t;
  try {
    const { unitId, parameterId } = pointKey(req);
    t = await sequelize.transaction();
    if (!(await pointExists(t, unitId, parameterId))) throw new HttpError(404, 'Parameter tidak ditemukan.');

    const rows = (sql, replacements) =>
      sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction: t });
    const exec = (sql, replacements) =>
      sequelize.query(sql, { replacements, transaction: t });
    const count = async (sql, replacements) => Number((await rows(sql, replacements))[0].n);

    const sourceIds = (await rows(
      'SELECT DISTINCT data_source_id AS id FROM source_columns WHERE unit_id = :unitId AND parameter_id = :parameterId',
      { unitId, parameterId },
    )).map((r) => r.id);
    const [unitRow] = await rows('SELECT sub_category_id FROM units WHERE id = :unitId', { unitId });
    const subId = unitRow?.sub_category_id;

    // Hapus titik ukur beserta data hariannya
    // Delete parameter and all daily data
    await exec('DELETE FROM daily_readings WHERE unit_id = :unitId AND parameter_id = :parameterId', { unitId, parameterId });
    await exec('DELETE FROM source_columns WHERE unit_id = :unitId AND parameter_id = :parameterId', { unitId, parameterId });
    await exec('DELETE FROM kop_parameters WHERE unit_id = :unitId AND parameter_id = :parameterId', { unitId, parameterId });

    const cleaned = { source: 0, unit: 0, sub: 0, parameter: 0 };

    // 1. Delete Source file name if there is no other column
    for (const sid of sourceIds) {
      if ((await count('SELECT COUNT(*) AS n FROM source_columns WHERE data_source_id = :sid', { sid })) === 0) {
        await exec('DELETE FROM data_sources WHERE id = :sid', { sid });
        cleaned.source++;
      }
    }

    // 2. Unit: Delete if there is no other parameter that have daily data
    const unitUsed =
      (await count('SELECT COUNT(*) AS n FROM source_columns WHERE unit_id = :unitId', { unitId })) +
      (await count('SELECT COUNT(*) AS n FROM kop_parameters WHERE unit_id = :unitId', { unitId })) +
      (await count('SELECT COUNT(*) AS n FROM daily_readings WHERE unit_id = :unitId', { unitId }));
    if (unitUsed === 0) {
      await exec('DELETE FROM units WHERE id = :unitId', { unitId });
      cleaned.unit++;

      // 3. Sub category: Delete if didnt have any unit
      if (subId && (await count('SELECT COUNT(*) AS n FROM units WHERE sub_category_id = :subId', { subId })) === 0) {
        await exec('DELETE FROM sub_categories WHERE id = :subId', { subId });
        cleaned.sub++;
      }
    }

    // 4. Parameter name: Delete if not used anywhere
    const paramUsed =
      (await count('SELECT COUNT(*) AS n FROM source_columns WHERE parameter_id = :parameterId', { parameterId })) +
      (await count('SELECT COUNT(*) AS n FROM kop_parameters WHERE parameter_id = :parameterId', { parameterId })) +
      (await count('SELECT COUNT(*) AS n FROM daily_readings WHERE parameter_id = :parameterId', { parameterId }));
    if (paramUsed === 0) {
      await exec('DELETE FROM parameters WHERE id = :parameterId', { parameterId });
      cleaned.parameter++;
    }

    await t.commit();
    return res.status(200).json({ message: 'Parameter dihapus.', cleaned });
  } catch (err) {
    if (t) await t.rollback();
    return handleError(res, err);
  }
};