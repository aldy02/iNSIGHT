const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SubCategory = sequelize.define('SubCategory', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  main_category_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'sub_categories',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['main_category_id', 'nama'], name: 'uq_sub_category' },
  ],
});

module.exports = SubCategory;