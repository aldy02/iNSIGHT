const { sequelize, Plant, Area, MainCategory, SubCategory, Unit, Parameter, DailyReading } = require('../models');
const { readWorkbook, parseSheet, normalize } = require('../utils/excelParser');

function parseNilaiNumeric(nilaiText) {
  const str = String(nilaiText).trim();
  if (str === '' || str === '-') return null;
  const cleaned = str.replace(/^[<>]=?/, ''); // Hapus tanda "<" / ">"
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

async function buildUnitMap(plantId) {
    const units = await Unit.findAll({
        include: [{
            model: SubCategory,
            required: true,
            include: [{
                model: MainCategory,
                required: true,
                include: [{ model: Area, required: true, where: { plant_id: plantId } }],
            }],
        }],
    });

    const map = new Map();
    units.forEach((u) => {
        const sub = u.SubCategory;
        const main = sub.MainCategory;
        const area = main.Area;
        const key = [
            normalize(area.nama).toLowerCase(),
            normalize(main.nama).toLowerCase(),
            normalize(sub.nama).toLowerCase(),
            normalize(u.nama).toLowerCase(),
        ].join('|');
        map.set(key, u.id);
    });
    return map;
}

async function buildParameterMap() {
    const parameters = await Parameter.findAll();
    const map = new Map();
    parameters.forEach((p) => map.set(normalize(p.nama).toLowerCase(), p.id));
    return map;
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

// Proses sheet
async function processPlantSheet({ workbook, sheetName, plant, userId, transaction }) {
    const { rows, parseErrors } = parseSheet(workbook, sheetName);

    if (rows.length === 0) {
        return { plant: plant.nama, sheet: sheetName, totalRowsValid: 0, created: 0, updated: 0, failed: parseErrors.length, parseErrors, lookupErrors: [] };
    }

    const unitMap = await buildUnitMap(plant.id);
    const parameterMap = await buildParameterMap();

    const lookupErrors = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
        const unitKey = [row.area, row.kategoriUtama, row.subKategori, row.unit].map((s) => s.toLowerCase()).join('|');
        const unitId = unitMap.get(unitKey);
        const parameterId = parameterMap.get(row.parameter.toLowerCase());

        if (!unitId) {
            lookupErrors.push({ excelRow: row.excelRow, reason: `Kombinasi Area/Kategori/Sub/Unit tidak ditemukan di master Pabrik "${plant.nama}"`, data: row });
            continue;
        }
        if (!parameterId) {
            lookupErrors.push({ excelRow: row.excelRow, reason: `Parameter "${row.parameter}" tidak ditemukan`, data: row });
            continue;
        }

        const result = await saveReading({ tanggal: row.tanggal, unitId, parameterId, nilaiText: row.nilai, userId }, transaction);
        if (result === 'created') createdCount++; else updatedCount++;
    }

    return {
        plant: plant.nama, sheet: sheetName,
        totalRowsValid: rows.length, created: createdCount, updated: updatedCount,
        failed: parseErrors.length + lookupErrors.length,
        parseErrors, lookupErrors,
    };
}

exports.uploadMasterExcel = async (req, res) => {
    try {
        const { plantId } = req.body;

        if (!plantId) return res.status(400).json({ message: 'plantId wajib dikirim (pilih pabrik dulu, atau "all")' });
        if (!req.file) return res.status(400).json({ message: 'File Excel wajib diupload' });

        let workbook;
        try {
            workbook = readWorkbook(req.file.buffer);
        } catch (err) {
            return res.status(400).json({ message: `Gagal membaca file: ${err.message}` });
        }

        const userId = req.user?.id ?? null;

        // Mode "All": proses semua sheet
        if (String(plantId).toLowerCase() === 'all') {
            const allPlants = await Plant.findAll();
            const plantByKode = new Map(allPlants.map((p) => [normalize(p.kode).toLowerCase(), p]));

            const results = [];
            const skippedSheets = [];

            for (const sheetName of workbook.SheetNames) {
                const plant = plantByKode.get(normalize(sheetName).toLowerCase());
                if (!plant) {
                    skippedSheets.push(sheetName); // Kalau nama sheet tidak cocok dengan kode pabrik manapun
                    continue;
                }

                const t = await sequelize.transaction();
                try {
                    const summary = await processPlantSheet({ workbook, sheetName, plant, userId, transaction: t });
                    await t.commit();
                    results.push({ status: 'success', ...summary });
                } catch (err) {
                    await t.rollback();
                    results.push({ status: 'error', plant: plant.nama, sheet: sheetName, error: err.message });
                }
            }

            return res.status(200).json({
                message: 'Import semua pabrik selesai',
                totalSheetDiproses: results.length,
                skippedSheets, // sheet diabaikan karena gak cocok sama kode pabrik
                results,
            });
        }

        // Mode Single Plant: cari 1 sheet yang cocok dengan kode plant terpilih
        const plant = await Plant.findByPk(plantId);
        if (!plant) return res.status(404).json({ message: `Pabrik dengan id ${plantId} tidak ditemukan` });

        const matchedSheetName = workbook.SheetNames.find(
            (name) => normalize(name).toLowerCase() === normalize(plant.kode).toLowerCase()
        );

        if (!matchedSheetName) {
            return res.status(400).json({
                message: `Sheet untuk pabrik "${plant.nama}" (kode: ${plant.kode}) tidak ditemukan di file`,
                sheetTersedia: workbook.SheetNames,
            });
        }

        const t = await sequelize.transaction();
        try {
            const summary = await processPlantSheet({ workbook, sheetName: matchedSheetName, plant, userId, transaction: t });
            await t.commit();
            return res.status(200).json({ message: 'Import selesai', ...summary });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Import error:', err);
        return res.status(500).json({ message: 'Gagal memproses import', error: err.message });
    }
};