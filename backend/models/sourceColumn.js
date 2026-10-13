const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SourceColumn = sequelize.define('SourceColumn', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  data_source_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  column_letter: {
    type: DataTypes.STRING(5),
    allowNull: false,
    set(value) {
      this.setDataValue('column_letter', String(value).trim().toUpperCase());
    },
    validate: { is: /^[A-Z]{1,3}$/ },
  },
  unit_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  parameter_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  header_hint: {
    type: DataTypes.STRING(100),
    allowNull: true,
    set(value) {
      const v = value === null || value === undefined ? '' : String(value).trim();
      this.setDataValue('header_hint', v === '' ? null : v);
    },
  },
}, {
  tableName: 'source_columns',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, name: 'uq_source_col', fields: ['data_source_id', 'column_letter'] },
    { unique: true, name: 'uq_measure_point', fields: ['unit_id', 'parameter_id'] },
  ],
});

module.exports = SourceColumn;
