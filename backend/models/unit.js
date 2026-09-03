const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  sub_category_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  nama: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: '-',
  },
}, {
  tableName: 'units',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['sub_category_id', 'nama'], name: 'uq_unit' },
  ],
});

module.exports = Unit;