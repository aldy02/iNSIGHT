const { sequelize, Plant, DataSource, SourceColumn, DailyReading } = require('../models');
const { readWorkbook, parseSourceSheet } = require('../utils/excelParser');

function parseNilaiNumeric(nilaiText) {
    const str = String(nilaiText).trim();
    if (str === '' || str === '-') return null;
    const cleaned = str.replace(/^[<>]=?/, ''); // Remove "<" / ">"
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

// Checking file name
// Format: Analisa_Lab-<Lab>-<Pabrik X>-<Pabrik X> - <area>
// ex: Analisa_Lab-Lab Lingkungan (Analisis Air dan Limbah)-Pabrik 4-Pabrik 4 - Ammonia
const norm = (str) => String(str).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const compact = (str) => norm(str).replace(/ /g, '');
const stripExt = (name) => String(name).replace(/\.[^.]+$/, '');

function parseFileName(fileName) {
    const base = stripExt(fileName);

    // Plant code: "Pabrik 1-A" => P1A, "Pabrik 2" => P2
    const m = base.match(/Pabrik\s*(\d+)(?:-([A-Za-z])(?![A-Za-z]))?/i);
    const kode = m ? `P${m[1]}${(m[2] || '').toUpperCase()}` : null;

    const parts = base.split(/\s+-\s+/);
    const unit = parts.length > 1 ? parts[parts.length - 1] : '';
    const labPart = parts.slice(0, -1).join(' - ') || base;

    return {
        kode,
        unit: compact(unit),
        lingkungan: /lingkungan/i.test(labPart),
    };
}

// Rule:
// - Source "lingkungan ..." file must be from lab lingkungan
// - Other source (ammonia, utility, boiler batubara) -> file must not contain Lab Lingkungan
function sourceMatchesFile(sourceNama, info) {
    const s = compact(sourceNama);
    if (s.startsWith('lingkungan')) {
        if (!info.lingkungan) return false;
        const rest = s.slice('lingkungan'.length);
        return rest === '' || info.unit.includes(rest);
    }
    return !info.lingkungan && info.unit.includes(s);
}

function plantMatchesFile(plant, info) {
    return info.kode !== null && compact(plant.kode) === compact(info.kode);
}

// Return err message if not match, null if match
async function checkFileName(fileName, plant, source) {
    const info = parseFileName(fileName);

    if (!info.kode) {
        return `Nama file "${fileName}" tidak mengandung nama pabrik (mis. "Pabrik 1-A"). Upload dibatalkan.`;
    }

    if (!plantMatchesFile(plant, info)) {
        const other = (await Plant.findAll()).find((p) => plantMatchesFile(p, info));
        return other
            ? `File "${fileName}" untuk ${other.nama} (${other.kode}), bukan ${plant.nama} (${plant.kode}). Upload dibatalkan.`
            : `Pabrik pada nama file "${fileName}" tidak cocok dengan ${plant.nama} (${plant.kode}). Upload dibatalkan.`;
    }

    // All resources belonging to this plant that match the file name
    const siblings = await DataSource.findAll({
        where: { plant_id: plant.id },
        attributes: ['id', 'nama'],
    });
    const matches = siblings.filter((s) => sourceMatchesFile(s.nama, info));

    if (!sourceMatchesFile(source.nama, info)) {
        const hint = matches.length
            ? ` File ini sepertinya untuk "${matches.map((s) => s.nama).join('" / "')}".`
            : '';
        return `Nama file "${fileName}" tidak cocok dengan sumber "${source.nama}".${hint} Upload dibatalkan.`;
    }

    // Sumber terpilih cocok, tapi ada sumber lain yang namanya lebih panjang (lebih spesifik) dan juga cocok
    // Ex: sumber "Utility" ikut cocok dengan file "... - Utility Boiler".
    const moreSpecific = matches.filter(
        (s) => s.id !== source.id && compact(s.nama).length > compact(source.nama).length
    );
    if (moreSpecific.length) {
        return `File "${fileName}" lebih cocok untuk sumber "${moreSpecific.map((s) => s.nama).join('" / "')}", bukan "${source.nama}". Upload dibatalkan.`;
    }

    return null;
}

// Handlers
// List source file for dropdown upload
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

        // Prevention: File name must match with plant and selected source
        const nameError = await checkFileName(req.file.originalname, plant, source);
        if (nameError) return res.status(400).json({ message: nameError });

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