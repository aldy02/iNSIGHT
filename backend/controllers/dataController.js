const { QueryTypes, Op } = require('sequelize');
const { sequelize, Plant, Area, MainCategory, SubCategory, Unit, Parameter, KopParameter, DailyReading } = require('../models');

// Change main category to slug
function toSlug(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-');
}

// Grouping per sub category per plant (plant code => main category list)
const GROUP_PER_SUBCATEGORY = {
  P6: ['Boiler Water'],
};

exports.getStructure = async (req, res) => {
  try {
    const { plantId, kategori } = req.query;
    if (!plantId || !kategori) {
      return res.status(400).json({ message: 'plantId dan kategori wajib diisi' });
    }

    const plant = await Plant.findByPk(plantId);
    if (!plant) {
      return res.status(404).json({ message: `Pabrik dengan id ${plantId} tidak ditemukan` });
    }

    const mainCategories = await MainCategory.findAll({
      include: [{ model: Area, required: true, where: { plant_id: plantId } }],
    });

    const mainCategory = mainCategories.find((mc) => toSlug(mc.nama) === kategori);
    if (!mainCategory) {
      return res.status(404).json({ message: `Kategori "${kategori}" tidak ditemukan untuk pabrik ini` });
    }

    const subCategories = await SubCategory.findAll({
      where: { main_category_id: mainCategory.id },
      include: [{
        model: Unit,
        include: [{
          model: KopParameter,
          where: { is_active: true },
          required: false,
          include: [{ model: Parameter }],
        }],
      }],
    });

    // Unit + parameter in this category from souce column or active kop
    const allUnitIds = subCategories.flatMap((s) => s.Units.map((u) => u.id));
    const points = allUnitIds.length
      ? await sequelize.query(
          `SELECT pts.unit_id, pts.parameter_id, p.nama, k.satuan
             FROM (SELECT unit_id, parameter_id FROM source_columns
                   UNION
                   SELECT unit_id, parameter_id FROM kop_parameters WHERE is_active = 1) pts
             JOIN parameters p ON p.id = pts.parameter_id
             LEFT JOIN kop_parameters k
               ON k.unit_id = pts.unit_id AND k.parameter_id = pts.parameter_id AND k.is_active = 1
            WHERE pts.unit_id IN (:unitIds)
            ORDER BY p.nama`,
          { replacements: { unitIds: allUnitIds }, type: QueryTypes.SELECT },
        )
      : [];

    const subCategoriesData = subCategories.map((sub) => {
      const parameterMap = new Map();
      const unitIdSet = new Set(sub.Units.map((u) => u.id));

      // List parameter + unitIds (unit where the parameter exist)
      points
        .filter((pt) => unitIdSet.has(pt.unit_id))
        .forEach((pt) => {
          const pid = String(pt.parameter_id);
          const existing = parameterMap.get(pid);
          if (existing) {
            existing.unitIds.push(String(pt.unit_id));
            if (!existing.satuan && pt.satuan) existing.satuan = pt.satuan;
          } else {
            parameterMap.set(pid, {
              id: pid,
              nama: pt.nama,
              satuan: pt.satuan || '',
              unitIds: [String(pt.unit_id)],
            });
          }
        });

      const units = sub.Units.map((u) => {
        const kop = {};
        u.KopParameters.forEach((kp) => {
          const pid = String(kp.Parameter.id);
          kop[pid] = {
            min: kp.min_value != null ? parseFloat(kp.min_value) : null,
            max: kp.max_value != null ? parseFloat(kp.max_value) : null,
            minInclusive: kp.min_inclusive,
            maxInclusive: kp.max_inclusive,
          };
          const entry = parameterMap.get(pid);
          if (entry && !entry.satuan && kp.satuan) entry.satuan = kp.satuan;
        });
        return { id: String(u.id), nama: u.nama, kop };
      });

      return {
        id: String(sub.id),
        nama: sub.nama,
        slug: toSlug(sub.nama),
        units,
        parameters: [...parameterMap.values()],
      };
    });

    // Implement grouping rule per plant
    const groupedCategories = GROUP_PER_SUBCATEGORY[plant.kode?.toUpperCase()] || [];
    const groups = groupedCategories.includes(mainCategory.nama)
      ? subCategoriesData.map((sub) => ({ subCategories: [sub] }))
      : [{ subCategories: subCategoriesData }];

    res.json({
      data: {
        label: mainCategory.nama,
        groups,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil struktur data', error: err.message });
  }
};

// Get daily actual data
exports.getReadings = async (req, res) => {
  try {
    const { unitId, parameterId, startDate, endDate } = req.query;
    if (!unitId || !parameterId || !startDate || !endDate) {
      return res.status(400).json({ message: 'unitId, parameterId, startDate, endDate wajib diisi' });
    }

    const readings = await DailyReading.findAll({
      where: {
        unit_id: unitId,
        parameter_id: parameterId,
        tanggal: { [Op.between]: [startDate, endDate] },
      },
      order: [['tanggal', 'ASC']],
    });

    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = readings.map((r) => {
      const d = new Date(r.tanggal);
      return {
        tanggal: r.tanggal,
        label: `${d.getDate()} ${bulan[d.getMonth()]}`,
        nilai: r.nilai_numeric != null ? parseFloat(r.nilai_numeric) : null,
        status: r.status,
      };
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data reading', error: err.message });
  }
};