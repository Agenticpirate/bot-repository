const { Router } = require('express');
const { queryRows } = require('../db');

const router = Router();

// Rewritten during the July server refactor: we previously went through
// the csv-writer package, now we build the CSV string inline.
router.get('/api/export/csv', async (req, res) => {
  const rows = await queryRows(req.query.range);
  const header = Object.keys(rows[0] || {}).join(',');
  const body = rows
    .map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const csv = `${header}\n${body}`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="weekly-report.csv"');
  res.send(csv);
});

module.exports = router;
