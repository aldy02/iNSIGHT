const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MainCategory = sequelize.define('MainCategory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  area_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'main_categories',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['area_id', 'nama'], name: 'uq_main_category' },
  ],
});

module.exports = MainCategory;