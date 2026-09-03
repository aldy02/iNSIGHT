const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

// Sign Up
exports.signup = async (req, res) => {
  try {
    const { nama, npk, email, jabatan, password } = req.body;

    if (!nama || !npk || !email || !password) {
      return res.status(400).json({ message: 'Field wajib tidak boleh kosong' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password minimal 8 karakter' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const existingNpk = await User.findOne({ where: { npk } });
    if (existingNpk) {
      return res.status(400).json({ message: 'NPK sudah terdaftar' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      nama,
      npk,
      email,
      jabatan,
      password: password_hash,
    });

    res.status(201).json({ message: 'Registrasi berhasil', id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email atau password salah' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Akun ini telah dinonaktifkan. Silahkan hubungi administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        nama: user.nama,
        npk: user.npk,
        email: user.email,
        jabatan: user.jabatan,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// Logout
exports.logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logout berhasil' });
};

// Check Login Status Saat App Pertama Kali Dibuka
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'nama', 'npk', 'email', 'jabatan', 'role'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};