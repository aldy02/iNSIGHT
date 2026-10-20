const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Combine report + start date and end date
const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  plant_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'final'),
    allowNull: false,
    defaultValue: 'draft',
  },
  created_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'reports',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['plant_id', 'start_date', 'end_date'], name: 'uq_report_period' },
  ],
});

module.exports = Report;