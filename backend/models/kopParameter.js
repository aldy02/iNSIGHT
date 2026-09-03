const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const KopParameter = sequelize.define('KopParameter', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  unit_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  parameter_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  min_value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true,
  },
  min_inclusive: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
  },
  max_value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true,
  },
  max_inclusive: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
  },
  satuan: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  keterangan: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'kop_parameters',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['unit_id', 'parameter_id', 'is_active'], name: 'uq_kop_active' },
  ],
});

module.exports = KopParameter;