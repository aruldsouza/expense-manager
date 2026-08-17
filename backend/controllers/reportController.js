const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const User = require('../models/User');

// ─── Helper: verify membership ───────────────────────────────────────────────
const verifyMembership = async (groupId, userId) => {
    const group = await Group.findById(groupId).populate('members.user', 'name email');
    if (!group) { const e = new Error('Group not found'); e.statusCode = 404; throw e; }

    // support both flat-member and object-member arrays
    const isMember = group.members.some(m =>
        m.user
            ? m.user._id.toString() === userId.toString()
            : m.toString() === userId.toString()
    );
    if (!isMember) { const e = new Error('Not authorized'); e.statusCode = 403; throw e; }
    return group;
};

// ─── Build report data shared by PDF and Email ──────────────────────────────
const buildReportData = async (groupId, startDate, endDate) => {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    const query = { group: groupId, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) };

    const [expenses, settlements] = await Promise.all([
        Expense.find(query).populate('payer', 'name email').populate('splits.user', 'name').sort({ date: -1 }).limit(200),
        Settlement.find({ group: groupId }).populate('payer', 'name').populate('payee', 'name').sort({ date: -1 }).limit(100)
    ]);

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const settledAmount = settlements.reduce((s, st) => s + st.amount, 0);

    // Category totals
    const categoryTotals = {};
    expenses.forEach(e => { categoryTotals[e.category || 'Other'] = (categoryTotals[e.category || 'Other'] || 0) + e.amount; });
    const categoryRows = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, total]) => ({ category: cat, total }));

    // Member balances
    const balances = {};
    expenses.forEach(e => {
        const pid = e.payer?._id?.toString() || e.payer.toString();
        balances[pid] = balances[pid] || { name: e.payer?.name || 'Unknown', paid: 0, share: 0 };
        balances[pid].paid += e.amount;
        e.splits.forEach(s => {
            const sid = s.user?._id?.toString() || s.user.toString();
            balances[sid] = balances[sid] || { name: s.user?.name || 'Unknown', paid: 0, share: 0 };
            balances[sid].share += s.amount;
        });
    });
    settlements.forEach(st => {
        const pid = st.payer?._id?.toString() || st.payer.toString();
        const qid = st.payee?._id?.toString() || st.payee.toString();
        if (balances[pid]) balances[pid].paid += st.amount;
        if (balances[qid]) balances[qid] && (balances[qid].share += st.amount);
    });
    const memberRows = Object.values(balances).map(m => ({
        name: m.name,
        paid: parseFloat(m.paid.toFixed(2)),
        share: parseFloat(m.share.toFixed(2)),
        net: parseFloat((m.paid - m.share).toFixed(2))
    }));

    return { expenses, settlements, totalAmount, settledAmount, categoryRows, memberRows };
};

// ─── Draw bar chart helper (text-based sparkline for PDF) ────────────────────
const drawBarChart = (doc, categoryRows, x, y, currency) => {
    const maxVal = Math.max(...categoryRows.map(r => r.total), 1);
    const barMaxWidth = 160;
    const rowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f')
        .text('Spending by Category', x, y);
    y += 14;

    categoryRows.slice(0, 8).forEach((row, i) => {
        const barW = Math.round((row.total / maxVal) * barMaxWidth);
        const color = ['#4f86c6', '#6abf69', '#ff9800', '#e57373', '#ab47bc', '#26c6da', '#78909c', '#d4e157'][i % 8];

        doc.fillColor(color).rect(x, y, barW, 12).fill();
        doc.fillColor('#333').font('Helvetica').fontSize(8)
            .text(`${row.category}: ${currency}${row.total.toFixed(2)}`, x + barW + 5, y + 2, { width: 120 });
        y += rowHeight;
    });

    return y;
};

// ─── PDF Report ──────────────────────────────────────────────────────────────
// @route GET /api/groups/:groupId/reports/pdf
// @access Private (Viewer)
const generatePdfReport = async (req, res, next) => {
    try {
        const group = await verifyMembership(req.params.groupId, req.user._id);
        const { startDate, endDate } = req.query;
        const { expenses, settlements, totalAmount, settledAmount, categoryRows, memberRows } =
            await buildReportData(req.params.groupId, startDate, endDate);

        const currency = group.currency || 'INR';
        const period = startDate && endDate
            ? `${startDate} to ${endDate}`
            : 'All time';

        const doc = new PDFDocument({ size: 'A4', margin: 48 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${group.name.replace(/\s+/g, '_')}_report.pdf"`
        );
        doc.pipe(res);

        // ── Header ──────────────────────────────────────────────────────────────
        doc.rect(0, 0, doc.page.width, 70).fill('#1e3a5f');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(22)
            .text(group.name, 48, 18, { width: doc.page.width - 96 });
        doc.font('Helvetica').fontSize(11)
            .text(`Financial Report  ·  ${period}`, 48, 44);

        // ── Summary boxes ────────────────────────────────────────────────────────
        let y = 90;
        const boxes = [
            { label: 'Total Expenses', value: `${currency}${totalAmount.toFixed(2)}` },
            { label: 'Settled Amount', value: `${currency}${settledAmount.toFixed(2)}` },
            { label: 'Outstanding', value: `${currency}${Math.max(0, totalAmount - settledAmount).toFixed(2)}` },
            { label: 'Transactions', value: String(expenses.length) }
        ];
        const boxW = (doc.page.width - 96 - 18) / 4;
        boxes.forEach((b, i) => {
            const bx = 48 + i * (boxW + 6);
            doc.roundedRect(bx, y, boxW, 48, 5).fill(i % 2 === 0 ? '#eef4ff' : '#e8fdf0');
            doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(14)
                .text(b.value, bx + 8, y + 8, { width: boxW - 16 });
            doc.fillColor('#555').font('Helvetica').fontSize(9)
                .text(b.label, bx + 8, y + 30, { width: boxW - 16 });
        });

        // ── Bar chart ────────────────────────────────────────────────────────────
        y += 65;
        if (categoryRows.length > 0) {
            y = drawBarChart(doc, categoryRows, 48, y, currency);
            y += 10;
        }

        // ── Member Balances table ────────────────────────────────────────────────
        doc.moveTo(48, y).lineTo(doc.page.width - 48, y).strokeColor('#ccc').stroke();
        y += 10;
        doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(11).text('Member Balances', 48, y);
        y += 16;

        const colWidths = [160, 90, 90, 90];
        const headers = ['Member', `Paid (${currency})`, `Share (${currency})`, `Net (${currency})`];
        headers.forEach((h, i) => {
            const cx = 48 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.fillColor('#555').font('Helvetica-Bold').fontSize(9).text(h, cx, y, { width: colWidths[i] });
        });
        y += 14;

        memberRows.forEach((row, ri) => {
            const rowBg = ri % 2 === 0 ? '#f9f9f9' : 'white';
            doc.rect(48, y - 2, doc.page.width - 96, 16).fill(rowBg);
            const cells = [row.name, row.paid.toFixed(2), row.share.toFixed(2),
            `${row.net >= 0 ? '+' : ''}${row.net.toFixed(2)}`];
            cells.forEach((cell, i) => {
                const cx = 48 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                const color = i === 3 ? (row.net >= 0 ? '#2e7d32' : '#c62828') : '#333';
                doc.fillColor(color).font('Helvetica').fontSize(9).text(cell, cx, y, { width: colWidths[i] });
            });
            y += 16;
            if (y > doc.page.height - 80) { doc.addPage(); y = 48; }
        });

        // ── Recent Expenses table ────────────────────────────────────────────────
        if (expenses.length > 0) {
            y += 10;
            doc.moveTo(48, y).lineTo(doc.page.width - 48, y).strokeColor('#ccc').stroke();
            y += 8;
            doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(11).text('Recent Expenses (up to 30)', 48, y);
            y += 16;

            const exColW = [70, 180, 80, 70, 85];
            const exHdr = ['Date', 'Description', 'Category', `Amount`, 'Paid By'];
            exHdr.forEach((h, i) => {
                const cx = 48 + exColW.slice(0, i).reduce((a, b) => a + b, 0);
                doc.fillColor('#555').font('Helvetica-Bold').fontSize(8).text(h, cx, y, { width: exColW[i] });
            });
            y += 14;

            expenses.slice(0, 30).forEach((e, ri) => {
                if (y > doc.page.height - 60) { doc.addPage(); y = 48; }
                const rowBg = ri % 2 === 0 ? '#f9f9f9' : 'white';
                doc.rect(48, y - 2, doc.page.width - 96, 14).fill(rowBg);
                const cells = [
                    new Date(e.date).toLocaleDateString('en-GB'),
                    e.description.substring(0, 35),
                    e.category || 'Other',
                    `${currency}${e.amount.toFixed(2)}`,
                    e.payer?.name || 'Unknown'
                ];
                cells.forEach((cell, i) => {
                    const cx = 48 + exColW.slice(0, i).reduce((a, b) => a + b, 0);
                    doc.fillColor('#333').font('Helvetica').fontSize(8).text(cell, cx, y, { width: exColW[i] });
                });
                y += 14;
            });
        }

        // ── Footer ───────────────────────────────────────────────────────────────
        const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
        doc.fillColor('#aaa').font('Helvetica').fontSize(8)
            .text(
                `Generated by Expense Manager · ${new Date().toLocaleString()}`,
                48, doc.page.height - 40,
                { align: 'center', width: doc.page.width - 96 }
            );

        doc.end();
    } catch (error) { next(error); }
};

// ─── Monthly Email Report ─────────────────────────────────────────────────────
// @route POST /api/groups/:groupId/reports/email
// @access Private (Admin)
const sendMonthlyEmailReport = async (req, res, next) => {
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            res.status(503);
            throw new Error('Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.');
        }

        const group = await verifyMembership(req.params.groupId, req.user._id);

        // Last 30 days by default
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

        const { expenses, totalAmount, settledAmount, categoryRows, memberRows } =
            await buildReportData(req.params.groupId, startDate, endDate);

        const currency = group.currency || 'INR';

        // Build HTML email
        const categoryHtml = categoryRows.slice(0, 8).map(r =>
            `<tr><td>${r.category}</td><td><strong>${currency}${r.total.toFixed(2)}</strong></td></tr>`
        ).join('');

        const memberHtml = memberRows.map(m =>
            `<tr>
                <td>${m.name}</td>
                <td>${currency}${m.paid.toFixed(2)}</td>
                <td>${currency}${m.share.toFixed(2)}</td>
                <td style="color:${m.net >= 0 ? '#2e7d32' : '#c62828'};font-weight:bold;">${m.net >= 0 ? '+' : ''}${currency}${m.net.toFixed(2)}</td>
            </tr>`
        ).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5">
          <div style="background:#1e3a5f;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:22px">${group.name}</h1>
            <p style="color:#ccc;margin:6px 0 0">Monthly Report · ${startDate} to ${endDate}</p>
          </div>
          <div style="background:white;padding:24px">
            <div style="display:flex;gap:12px;margin-bottom:24px">
              <div style="flex:1;background:#eef4ff;padding:16px;border-radius:8px;text-align:center">
                <div style="font-size:22px;font-weight:bold;color:#1e3a5f">${currency}${totalAmount.toFixed(2)}</div>
                <div style="color:#666;font-size:13px">Total Expenses</div>
              </div>
              <div style="flex:1;background:#e8fdf0;padding:16px;border-radius:8px;text-align:center">
                <div style="font-size:22px;font-weight:bold;color:#2e7d32">${currency}${settledAmount.toFixed(2)}</div>
                <div style="color:#666;font-size:13px">Settled</div>
              </div>
              <div style="flex:1;background:#fff3e0;padding:16px;border-radius:8px;text-align:center">
                <div style="font-size:22px;font-weight:bold;color:#e65100">${currency}${Math.max(0, totalAmount - settledAmount).toFixed(2)}</div>
                <div style="color:#666;font-size:13px">Outstanding</div>
              </div>
            </div>

            <h3 style="color:#1e3a5f;border-bottom:2px solid #eee;padding-bottom:8px">Spending by Category</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">Category</th><th style="text-align:right;padding:8px">Amount</th></tr>
              ${categoryHtml || '<tr><td colspan="2" style="padding:8px;color:#999">No expenses in this period</td></tr>'}
            </table>

            <h3 style="color:#1e3a5f;border-bottom:2px solid #eee;padding-bottom:8px">Member Balances</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr style="background:#f5f5f5">
                <th style="text-align:left;padding:8px">Member</th>
                <th style="padding:8px">Paid</th>
                <th style="padding:8px">Share</th>
                <th style="padding:8px">Net</th>
              </tr>
              ${memberHtml || '<tr><td colspan="4" style="padding:8px;color:#999">No activity</td></tr>'}
            </table>

            <p style="color:#999;font-size:12px;text-align:center">Generated by Expense Manager · ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>`;

        // Collect member emails
        const memberEmails = group.members
            .map(m => m.user?.email)
            .filter(Boolean);

        const transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        await transport.sendMail({
            from: `"Expense Manager" <${process.env.SMTP_USER}>`,
            to: memberEmails.join(', '),
            subject: `📊 ${group.name} — Monthly Report (${startDate} to ${endDate})`,
            html
        });

        res.json({
            success: true,
            message: `Monthly report sent to ${memberEmails.length} member(s)`,
            data: { recipients: memberEmails, period: { startDate, endDate } }
        });
    } catch (error) { next(error); }
};

module.exports = { generatePdfReport, sendMonthlyEmailReport };
