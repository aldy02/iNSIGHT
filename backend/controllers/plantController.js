const { Plant } = require('../models');

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