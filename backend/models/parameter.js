const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Parameter = sequelize.define('Parameter', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  deskripsi: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'parameters',
  underscored: true,
  timestamps: true,
});

module.exports = Parameter;