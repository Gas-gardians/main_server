const express = require('express');
const app = express();
const port = 3000;

const apiRoutes = require('./routes/apiRoutes');
const webRoutes = require('./routes/webRoutes');

// 미들웨어 설정
app.use(express.json()); // JSON 데이터 파싱을 위한 미들웨어
app.use(express.urlencoded({ extended: false })); // URL-encoded 데이터 파싱을 위한 미들웨어

app.use('/api', apiRoutes);
app.use('/', webRoutes);

app.use((req, res, next) => {
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
