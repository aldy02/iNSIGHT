const { Op } = require('sequelize');
const {
  Plant,
  Area,
  MainCategory,
  SubCategory,
  Unit,
} = require('../models');

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Check if name is empty
const isEmptyName = (s) => !s || s.trim() === '' || s.trim() === '-';

exports.getAllPlants = async (req, res) => {
  try {
    const plants = await Plant.findAll({
      attributes: ['id', 'nama', 'kode'],
      order: [['nama', 'ASC']],
    });
    res.json({ data: plants });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil daftar pabrik', error: err.message });
  }
};

// GET /api/plants/menu-structure
exports.getMenuStructure = async (req, res) => {
  try {
    const plants = await Plant.findAll({
      attributes: ['id', 'nama', 'kode'],
      where: { kode: { [Op.ne]: null } },
      order: [
        ['kode', 'ASC'],
        [Area, 'id', 'ASC'],
        [Area, MainCategory, 'id', 'ASC'],
        [Area, MainCategory, SubCategory, 'id', 'ASC'],
        [Area, MainCategory, SubCategory, Unit, 'id', 'ASC'],
      ],
      include: [
        {
          model: Area,
          attributes: ['id', 'nama'],
          required: false,
          include: [
            {
              model: MainCategory,
              attributes: ['id', 'nama'],
              required: false,
              include: [
                {
                  model: SubCategory,
                  attributes: ['id', 'nama'],
                  required: false,
                  include: [
                    { model: Unit, attributes: ['id', 'nama'], required: false },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const data = plants.map((plant) => {
      // Merge main category with same name from diferent area
      const cats = new Map();

      (plant.Areas || []).forEach((area) => {
        (area.MainCategories || []).forEach((mc) => {
          const catSlug = slugify(mc.nama);

          if (!cats.has(catSlug)) {
            cats.set(catSlug, { label: mc.nama, slug: catSlug, subs: new Map() });
          }
          const cat = cats.get(catSlug);

          (mc.SubCategories || []).forEach((sc) => {
            if (isEmptyName(sc.nama)) return;

            // Only unit with the real name not "-"
            const realUnits = (sc.Units || []).filter((u) => !isEmptyName(u.nama));
            if (realUnits.length === 0) return; // If not have unit, then the branch will not created

            const subSlug = slugify(sc.nama);
            if (!cat.subs.has(subSlug)) {
              cat.subs.set(subSlug, {
                label: sc.nama,
                slug: subSlug,
                defaultUnitId: realUnits[0].id,
              });
            }
          });
        });
      });

      return {
        kode: plant.kode,
        label: plant.nama,
        subMenu: [...cats.values()].map((c) => {
          const children = [...c.subs.values()];
          return {
            label: c.label,
            slug: c.slug,
            // branches only if there is more than one subcategory that has an original unit
            ...(children.length > 1 && { children }),
          };
        }),
      };
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil struktur menu', error: err.message });
  }
};