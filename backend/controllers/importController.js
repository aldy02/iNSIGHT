const { sequelize, Plant, DataSource, SourceColumn, DailyReading } = require('../models');
const { readWorkbook, parseSourceSheet } = require('../utils/excelParser');

function parseNilaiNumeric(nilaiText) {
    const str = String(nilaiText).trim();
    if (str === '' || str === '-') return null;
    const cleaned = str.replace(/^[<>]=?/, ''); // Hapus tanda "<" / ">"
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? null : num;
}

async function saveReading({ tanggal, unitId, parameterId, nilaiText, userId }, transaction) {
    const nilaiNumeric = parseNilaiNumeric(nilaiText);

    const existing = await DailyReading.findOne({
        where: { tanggal, unit_id: unitId, parameter_id: parameterId },
        transaction,
    });

    if (existing) {
        existing.nilai_text = nilaiText;
        existing.nilai_numeric = nilaiNumeric;
        existing.source = 'import';
        existing.input_by = userId;
        await existing.save({ transaction });
        return 'updated';
    }

    await DailyReading.create(
        {
            tanggal,
            unit_id: unitId,
            parameter_id: parameterId,
            nilai_text: nilaiText,
            nilai_numeric: nilaiNumeric,
            source: 'import',
            input_by: userId,
        },
        { transaction }
    );
    return 'created';
}

// Prevention: nama file harus mengandung nama sumber (ex: "Utility" untuk P2-Utility.xlsx).
// Untuk nama dalam kurung, ex: "Lingkungan (Ammonia)", semua kata harus ada di nama file.
function fileNameMatchesSource(fileName, sourceNama) {
    const norm = (str) => String(str).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const name = norm(String(fileName).replace(/\.[^.]+$/, ''));
    const tokens = norm(sourceNama).split(' ').filter(Boolean);
    return tokens.every((t) => name.includes(t));
}

// List sumber file untuk dropdown upload
exports.listSources = async (req, res) => {
    try {
        const { plantId } = req.query;
        if (!plantId) return res.status(400).json({ message: 'plantId wajib dikirim' });

        const sources = await DataSource.findAll({
            where: { plant_id: plantId },
            attributes: ['id', 'plant_id', 'nama', 'sheet_name', 'date_column', 'data_start_row'],
            order: [['nama', 'ASC']],
        });
        return res.status(200).json(sources);
    } catch (err) {
        console.error('List sources error:', err);
        return res.status(500).json({ message: 'Gagal mengambil daftar sumber', error: err.message });
    }
};

exports.uploadSourceExcel = async (req, res) => {
    try {
        const { plantId, dataSourceId } = req.body;

        if (!plantId) return res.status(400).json({ message: 'plantId wajib dikirim (pilih pabrik dulu)' });
        if (!dataSourceId) return res.status(400).json({ message: 'dataSourceId wajib dikirim (pilih sumber file dulu)' });
        if (!req.file) return res.status(400).json({ message: 'File Excel wajib diupload' });

        const plant = await Plant.findByPk(plantId);
        if (!plant) return res.status(404).json({ message: `Pabrik dengan id ${plantId} tidak ditemukan` });

        const source = await DataSource.findOne({
            where: { id: dataSourceId, plant_id: plant.id },
            include: [{ model: SourceColumn, as: 'columns' }],
        });
        if (!source) {
            return res.status(404).json({ message: `Sumber id ${dataSourceId} tidak ditemukan untuk pabrik "${plant.nama}"` });
        }
        if (source.columns.length === 0) {
            return res.status(400).json({ message: `Sumber "${source.nama}" belum punya kolom terpetakan` });
        }

        if (!fileNameMatchesSource(req.file.originalname, source.nama)) {
            return res.status(400).json({
                message: `Nama file "${req.file.originalname}" tidak mengandung "${source.nama}". Upload dibatalkan karena kemungkinan salah file atau salah area.`,
            });
        }

        let workbook;
        try {
            workbook = readWorkbook(req.file.buffer);
        } catch (err) {
            return res.status(400).json({ message: `Gagal membaca file: ${err.message}` });
        }

        let parsed;
        try {
            parsed = parseSourceSheet(workbook, source, source.columns);
        } catch (err) {
            return res.status(400).json({ message: err.message, sheetTersedia: err.sheetTersedia });
        }

        const userId = req.user?.id ?? null;
        let createdCount = 0;
        let updatedCount = 0;

        const t = await sequelize.transaction();
        try {
            for (const row of parsed.rows) {
                const result = await saveReading(
                    { tanggal: row.tanggal, unitId: row.unitId, parameterId: row.parameterId, nilaiText: row.nilai, userId },
                    t
                );
                if (result === 'created') createdCount++; else updatedCount++;
            }
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        return res.status(200).json({
            message: 'Import selesai',
            plant: plant.nama,
            source: source.nama,
            sheet: parsed.sheetName,
            totalRowsValid: parsed.rows.length,
            created: createdCount,
            updated: updatedCount,
            failed: parsed.parseErrors.length,
            parseErrors: parsed.parseErrors,
            skippedColumns: parsed.skippedColumns,   // header_hint tidak match => tidak diimpor
            unmappedColumns: parsed.unmappedColumns, // ada data tapi belum didaftarkan
            errorCells: parsed.errorCells,           // #N/A, #REF!, dll.
        });
    } catch (err) {
        console.error('Import error:', err);
        return res.status(500).json({ message: 'Gagal memproses import', error: err.message });
    }
};
