const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  npk: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  jabatan: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('karyawan', 'admin'),
    allowNull: false,
    defaultValue: 'karyawan',
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
});

module.exports = User;