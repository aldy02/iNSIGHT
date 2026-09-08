const { sequelize, Plant, Area, MainCategory, SubCategory, Unit, Parameter, KopParameter, DailyReading } = require('../models');
const { Op } = require('sequelize');

// Ubah kategori utama jadi slug
function toSlug(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-');
}

// Grouping sub kategori
const GROUP_PER_SUBCATEGORY = ['Boiler Water'];

exports.getStructure = async (req, res) => {
  try {
    const { plantId, kategori } = req.query;
    if (!plantId || !kategori) {
      return res.status(400).json({ message: 'plantId dan kategori wajib diisi' });
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

    const subCategoriesData = subCategories.map((sub) => {
      const units = sub.Units.map((u) => ({ id: String(u.id), nama: u.nama }));

      const parameterMap = new Map();
      const kopMap = {};

      sub.Units.forEach((u) => {
        u.KopParameters.forEach((kp) => {
          const p = kp.Parameter;
          const pid = String(p.id);
          parameterMap.set(pid, { id: pid, nama: p.nama, satuan: kp.satuan || '' });
          kopMap[pid] = {
            min: kp.min_value != null ? parseFloat(kp.min_value) : null,
            max: kp.max_value != null ? parseFloat(kp.max_value) : null,
            minInclusive: kp.min_inclusive,
            maxInclusive: kp.max_inclusive,
          };
        });
      });

      return {
        id: String(sub.id),
        nama: sub.nama,
        slug: toSlug(sub.nama),
        units,
        parameters: [...parameterMap.values()],
        kop: kopMap,
      };
    });

    // Implementasi aturan grouping
    const groups = GROUP_PER_SUBCATEGORY.includes(mainCategory.nama)
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

// Get data aktual harian
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