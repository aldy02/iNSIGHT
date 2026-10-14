const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DataSource = sequelize.define('DataSource', {
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
  sheet_name: {
    type: DataTypes.STRING(100),
    allowNull: true, // null = sheet pertama
  },
  date_column: {
    type: DataTypes.STRING(5),
    allowNull: false,
    set(value) {
      this.setDataValue('date_column', String(value).trim().toUpperCase());
    },
    validate: { is: /^[A-Z]{1,3}$/ },
  },
  data_start_row: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 6,
    validate: { min: 1 },
  },
}, {
  tableName: 'data_sources',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, name: 'uq_source', fields: ['plant_id', 'nama'] },
  ],
});

module.exports = DataSource;
