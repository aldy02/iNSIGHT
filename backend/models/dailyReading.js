const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DailyReading = sequelize.define('DailyReading', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  tanggal: {
    type: DataTypes.DATEONLY,
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
  nilai_text: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  nilai_numeric: {
    type: DataTypes.DECIMAL(14, 6),
    allowNull: true,
  },
  status: {
    // di-override otomatis oleh TRIGGER MySQL berdasarkan kop_parameters
    type: DataTypes.ENUM('normal', 'out_of_range', 'no_kop'),
    allowNull: false,
    defaultValue: 'no_kop',
  },
  source: {
    type: DataTypes.ENUM('manual', 'import'),
    allowNull: false,
    defaultValue: 'manual',
  },
  input_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  keterangan: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'daily_readings',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['tanggal', 'unit_id', 'parameter_id'], name: 'uq_reading_per_day' },
    { fields: ['tanggal'], name: 'idx_dr_tanggal' },
    { fields: ['unit_id'], name: 'idx_dr_unit' },
    { fields: ['status'], name: 'idx_dr_status' },
  ],
});

module.exports = DailyReading;