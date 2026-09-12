const express = require('express');
const exportRouter = require('./routes/export');

const app = express();
app.use(exportRouter);
app.listen(process.env.PORT || 3000);
