const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Area = sequelize.define('Area', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  plant_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'areas',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['plant_id', 'nama'], name: 'uq_area' },
  ],
});

module.exports = Area;