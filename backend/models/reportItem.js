const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// teks deskriptif per parameter
const ReportItem = sequelize.define('ReportItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  report_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  unit_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  parameter_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'report_items',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['report_id', 'unit_id', 'parameter_id'], name: 'uq_report_item' },
    { fields: ['unit_id', 'parameter_id'], name: 'idx_ri_unit_param' },
  ],
});

module.exports = ReportItem;