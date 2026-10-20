const {
    sequelize,
    Plant,
    Area,
    MainCategory,
    SubCategory,
    Unit,
    Parameter,
    KopParameter,
    Report,
    ReportItem,
} = require('../models');

const MAX_SUMMARY_LENGTH = 5000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(str) {
    if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Report respond 
function serializeReport(report) {
    return {
        id: String(report.id),
        plantId: String(report.plant_id),
        period: { start: report.start_date, end: report.end_date },
        status: report.status,
        items: (report.items || []).map((it) => ({
            unitId: String(it.unit_id),
            parameterId: String(it.parameter_id),
            summary: it.summary || '',
        })),
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
}


// GET /api/reports/structure?plantId=
// Get structure report
exports.getStructure = async (req, res) => {
    try {
        const { plantId } = req.query;
        if (!plantId) {
            return res.status(400).json({ message: 'plantId wajib diisi' });
        }

        const plant = await Plant.findByPk(plantId);
        if (!plant) {
            return res.status(404).json({ message: `Pabrik dengan id ${plantId} tidak ditemukan` });
        }

        const mainCategories = await MainCategory.findAll({
            include: [
                { model: Area, attributes: [], required: true, where: { plant_id: plantId } },
                {
                    model: SubCategory,
                    include: [{
                        model: Unit,
                        include: [{
                            model: KopParameter,
                            where: { is_active: true },
                            required: false,
                            include: [{ model: Parameter }],
                        }],
                    }],
                },
            ],
            order: [
                ['id', 'ASC'],
                [SubCategory, 'id', 'ASC'],
                [SubCategory, Unit, 'id', 'ASC'],
            ],
        });

        const num = (v) => (v != null ? parseFloat(v) : null);

        const categories = mainCategories
            .map((mc) => ({
                id: String(mc.id),
                nama: mc.nama,
                subs: mc.SubCategories
                    .map((sub) => ({
                        id: String(sub.id),
                        nama: sub.nama,
                        units: sub.Units
                            .map((u) => ({
                                id: String(u.id),
                                nama: u.nama,
                                parameters: [...u.KopParameters]
                                    .sort((a, b) => a.parameter_id - b.parameter_id)
                                    .map((kp) => ({
                                        id: String(kp.Parameter.id),
                                        nama: kp.Parameter.nama,
                                        satuan: kp.satuan || '',
                                        kop: {
                                            min: num(kp.min_value),
                                            max: num(kp.max_value),
                                            minInclusive: !!kp.min_inclusive,
                                            maxInclusive: !!kp.max_inclusive,
                                        },
                                    })),
                            }))
                            .filter((u) => u.parameters.length > 0),
                    }))
                    .filter((sub) => sub.units.length > 0),
            }))
            .filter((c) => c.subs.length > 0);

        res.json({ data: categories });
    } catch (err) {
        res.status(500).json({ message: 'Gagal mengambil struktur master', error: err.message });
    }
};

// GET /api/reports?plantId=&start=&end=
// Get report with plant and periode, if node return null
exports.getReport = async (req, res) => {
    try {
        const { plantId, start, end } = req.query;
        if (!plantId || !start || !end) {
            return res.status(400).json({ message: 'plantId, start, dan end wajib diisi' });
        }
        if (!isValidYmd(start) || !isValidYmd(end)) {
            return res.status(400).json({ message: 'Format tanggal harus YYYY-MM-DD' });
        }

        const report = await Report.findOne({
            where: { plant_id: plantId, start_date: start, end_date: end },
            include: [{ model: ReportItem, as: 'items' }],
            order: [[{ model: ReportItem, as: 'items' }, 'id', 'ASC']],
        });

        res.json({ data: report ? serializeReport(report) : null });
    } catch (err) {
        res.status(500).json({ message: 'Gagal mengambil laporan', error: err.message });
    }
};

// PUT /api/reports
// Body: { plantId, period: { start, end }, status?, items: [{ unitId, parameterId, summary }] }
exports.saveReport = async (req, res) => {
    const { plantId, period, items, status } = req.body || {};

    // Validation
    if (!plantId || !period?.start || !period?.end || !Array.isArray(items)) {
        return res.status(400).json({ message: 'plantId, period.start, period.end, dan items wajib diisi' });
    }
    if (!isValidYmd(period.start) || !isValidYmd(period.end)) {
        return res.status(400).json({ message: 'Format tanggal harus YYYY-MM-DD' });
    }
    if (period.start > period.end) {
        return res.status(400).json({ message: 'Start date tidak boleh setelah end date' });
    }
    if (status !== undefined && !['draft', 'final'].includes(status)) {
        return res.status(400).json({ message: 'status harus draft atau final' });
    }

    //   Normalize, remove duplicate
    const cleaned = new Map();
    for (const it of items) {
        const unitId = Number(it?.unitId);
        const parameterId = Number(it?.parameterId);
        if (!Number.isInteger(unitId) || !Number.isInteger(parameterId) || unitId <= 0 || parameterId <= 0) {
            return res.status(400).json({ message: 'Setiap item butuh unitId dan parameterId yang valid' });
        }
        const summary = typeof it.summary === 'string' ? it.summary.trim() : '';
        if (summary.length > MAX_SUMMARY_LENGTH) {
            return res.status(400).json({ message: `Ringkasan maksimal ${MAX_SUMMARY_LENGTH} karakter` });
        }
        cleaned.set(`${unitId}:${parameterId}`, { unitId, parameterId, summary: summary || null });
    }
    const rows = [...cleaned.values()];

    const userId = req.user?.id ?? null;
    const t = await sequelize.transaction();

    try {
        const plant = await Plant.findByPk(plantId, { transaction: t });
        if (!plant) {
            await t.rollback();
            return res.status(404).json({ message: `Pabrik dengan id ${plantId} tidak ditemukan` });
        }

        // unit => sub kategori => kategori utama => area => pabrik
        const unitIds = [...new Set(rows.map((r) => r.unitId))];
        if (unitIds.length > 0) {
            const validUnits = await Unit.findAll({
                where: { id: unitIds },
                attributes: ['id'],
                include: [{
                    model: SubCategory,
                    attributes: [],
                    required: true,
                    include: [{
                        model: MainCategory,
                        attributes: [],
                        required: true,
                        include: [{ model: Area, attributes: [], required: true, where: { plant_id: plantId } }],
                    }],
                }],
                raw: true,
                transaction: t,
            });
            if (validUnits.length !== unitIds.length) {
                await t.rollback();
                return res.status(400).json({ message: 'Ada unit yang bukan milik pabrik ini' });
            }
        }

        // Report header
        const [report, created] = await Report.findOrCreate({
            where: { plant_id: plantId, start_date: period.start, end_date: period.end },
            defaults: { status: status || 'draft', created_by: userId, updated_by: userId },
            transaction: t,
        });

        if (!created) {
            // Lock final report
            if (report.status === 'final' && status !== 'draft') {
                await t.rollback();
                return res.status(409).json({ message: 'Laporan sudah final. Kirim status "draft" untuk membukanya kembali.' });
            }
            report.set('updated_by', userId);
            report.changed('updated_by', true)
            if (status) report.status = status;
            await report.save({ transaction: t });
        }

        await ReportItem.destroy({ where: { report_id: report.id }, transaction: t });
        if (rows.length > 0) {
            await ReportItem.bulkCreate(
                rows.map((r) => ({
                    report_id: report.id,
                    unit_id: r.unitId,
                    parameter_id: r.parameterId,
                    summary: r.summary,
                })),
                { transaction: t }
            );
        }

        await t.commit();

        const saved = await Report.findByPk(report.id, {
            include: [{ model: ReportItem, as: 'items' }],
            order: [[{ model: ReportItem, as: 'items' }, 'id', 'ASC']],
        });

        res.status(created ? 201 : 200).json({
            message: created ? 'Laporan berhasil dibuat' : 'Laporan berhasil diperbarui',
            data: serializeReport(saved),
        });
    } catch (err) {
        if (!t.finished) await t.rollback();
        res.status(500).json({ message: 'Gagal menyimpan laporan', error: err.message });
    }
};

// GET /api/reports/history?plantId=
// Get History
exports.getHistory = async (req, res) => {
    try {
        const { plantId } = req.query;
        const where = plantId ? { plant_id: plantId } : {};

        const reports = await Report.findAll({
            where,
            attributes: {
                include: [[
                    sequelize.literal('(SELECT COUNT(*) FROM report_items AS ri WHERE ri.report_id = Report.id)'),
                    'itemCount',
                ]],
            },
            order: [['updated_at', 'DESC']],
            limit: 100,
        });

        res.json({
            data: reports.map((r) => ({
                id: String(r.id),
                plantId: String(r.plant_id),
                period: { start: r.start_date, end: r.end_date },
                status: r.status,
                itemCount: Number(r.get('itemCount')),
                updatedAt: r.updatedAt,
            })),
        });
    } catch (err) {
        res.status(500).json({ message: 'Gagal mengambil riwayat laporan', error: err.message });
    }
};

// DELETE /api/reports/:id
exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findByPk(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Laporan tidak ditemukan' });
        }
        if (report.status === 'final') {
            return res.status(409).json({ message: 'Laporan final tidak bisa dihapus. Buka kembali sebagai draft dulu.' });
        }
        await report.destroy(); // item ikut terhapus (ON DELETE CASCADE)
        res.json({ message: 'Laporan berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ message: 'Gagal menghapus laporan', error: err.message });
    }
};