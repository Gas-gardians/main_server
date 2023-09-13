const express = require('express');
const router = express.Router();

//DB
const mongoose = require('mongoose');
const mongoURL = 'mongodb://localhost:27017';
const MongoClient = require('mongodb').MongoClient;
const dbName = 'mydatabase';
mongoose.connect(`${mongoURL}/${dbName}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
router.use(express.json()); // Express 서버 설정


//DB_model
const {
  WorkGasData,
  WorkTempData,
  WorkStatus,
  WorkEnvironment,
  GasInformation,
  DeviceInfo,
  InitialDeviceCheck
} = require('./middleware/dbAccess');


// 모델 및 스키마 정의
const dataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number
});
const Data = mongoose.model('Data', dataSchema);

// 라우트 핸들러 함수 정의
function createDataHandler(Model) {
  return async (req, res) => {
    try {
      const data = req.body;
      const newData = new Model(data);
      await newData.save();
      console.log(`${Model.modelName} saved successfully`);
      res.sendStatus(200);
    } catch (error) {
      console.error(`Error saving ${Model.modelName}:`, error);
      res.sendStatus(500);
    }
  };
}

// 데이터 받아오기 라우트
router.post('/post_gasData', createDataHandler(WorkGasData));
router.post('/post_tempData', createDataHandler(WorkTempData));
router.post('/post_statData', createDataHandler(WorkStatus));
router.post('/post_envData', createDataHandler(WorkEnvironment));
router.post('/post_gasInfo', createDataHandler(GasInformation));
router.post('/post_deviceInfo', createDataHandler(DeviceInfo));
router.post('/post_initialCheck', createDataHandler(InitialDeviceCheck));

// API 테스트
router.post('/data', createDataHandler(Data));

// 데이터 내보내기 라우트
router.get('/getdata', async (req, res) => {
  try {
    const client = await MongoClient.connect(mongoURL, { useUnifiedTopology: true });
    const db = client.db(dbName);
    const collection = db.collection('datas');
    const result = await collection.find({}, { projection: { _id: 0, temperature: 1, humidity: 1 } }).toArray();
    client.close();
    res.json(result);
  } catch (err) {
    console.error('Failed to read data from MongoDB:', err);
    res.status(500).send('Failed to read data from MongoDB');
  }
});

module.exports = router;
