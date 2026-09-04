require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const importRoutes = require('./routes/importRoutes');
const plantRoutes = require('./routes/plantRoutes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Route
app.use('/api/auth', authRoutes);
app.use('/api/import', importRoutes);
app.use('/api/plants', plantRoutes);

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('Koneksi database berhasil');
    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Gagal terhubung ke database:', err);
  });