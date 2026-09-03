const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Plant = sequelize.define('Plant', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  kode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
}, {
  tableName: 'plants',
  underscored: true,
  timestamps: true,
});

module.exports = Plant;