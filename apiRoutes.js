const express = require('express');
const router = express.Router();

//DB
const mongoose = require('mongoose');
const mongoURL = 'mongodb://localhost:27017';
const MongoClient = require('mongodb').MongoClient;
const dbName = 'mydatabase';
mongoose.connect('mongodb://localhost:27017/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const dataSchema = new mongoose.Schema({ // 스키마 정의
  temperature: Number,
  humidity: Number
});

const Data = mongoose.model('Data', dataSchema); // 모델 생성

//외부 Data 받아오는 API
router.use(express.json()); // Express 서버 설정
router.post('/data', (req, res) => { // 데이터 저장 라우트 핸들러
  const data = req.body; // POST 요청의 본문에서 데이터 추출
  const newData = new Data({ // 데이터를 스키마 모델을 사용하여 저장
    temperature: data.temperature,
    humidity: data.humidity
  });
  newData.save()
    .then(() => {
      console.log('Data saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving data:', error);
      res.sendStatus(500);
    });
});

//데이터 내보내기
router.get('/getdata', async (req, res) => {
  try {
    const client = await MongoClient.connect(mongoURL, { useUnifiedTopology: true });
    const db = client.db(dbName);
    const collection = db.collection('datas');
    const result = await collection.find({}, { projection: { _id: 0, temperature: 1, humidity: 1 } }).toArray();

    client.close();

    res.json(result); // 조회 결과를 JSON 형태로 응답
  } catch (err) {
    console.error('Failed to read data from MongoDB:', err);
    res.status(500).send('Failed to read data from MongoDB');
  }
});

module.exports = router;
