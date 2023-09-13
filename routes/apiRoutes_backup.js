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
router.use(express.json()); // Express 서버 설정


//DB_model
const {
  WorkGasData,
  WorkTempData,
  WorkStatus,
  WorkEnvironment,
  GasInfomation,
  DeviceInfo,
  InitialDeviceCheck
} = require('./middleware/dbAccess');

const dataSchema = new mongoose.Schema({ // 스키마 정의
  temperature: Number,
  humidity: Number
});
const Data = mongoose.model('Data', dataSchema); // 모델 생성

//데이터 받아오기
// 유해가스 데이터
router.post('/post_gasData', (req, res) => {
  const gasdata = req.body;
  const newWorkGasData = new WorkGasData(gasdata);console.log("post_gasData");
  newWorkGasData.save()
    .then(() => {
      console.log('WorkGasData saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving WorkGasData:', error);
      res.sendStatus(500);
    });
});

// 온습도 데이터
router.post('/post_tempData', (req, res) => {
  const tempdata = req.body;
  const newWorkTempData = new WorkTempData(tempdata);
  newWorkTempData.save()
    .then(() => {
      console.log('WorkTempData saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving WorkTempData:', error);
      res.sendStatus(500);
    });
});
// 작업상태 데이터
router.post('/post_statData', (req, res) => {
  const statdata = req.body;
  const newWorkStatusData = new WorkStatus(statdata);
  newWorkStatusData.save()
    .then(() => {
      console.log('WorkStatusData saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving WorkStatusData:', error);
      res.sendStatus(500);
    });
});


// 작업환경 정보
router.post('/post_envData', (req, res) => {
  const envdata = req.body;
  const newWorkEnvData = new WorkEnvironment(envdata);
  newWorkEnvData.save()
    .then(() => {
      console.log('EnvironmentData saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving EnvironmentData:', error);
      res.sendStatus(500);
    });
});
// 유해가스 정보
router.post('/post_gasInfo', (req, res) => {
  const gasInfodata = req.body;
  const newGasInfoData = new GasInformation(gasInfodata);
  newGasInfoData.save()
    .then(() => {
      console.log('GasInfo saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving GasInfo:', error);
      res.sendStatus(500);
    });
});


// 작업기기 정보
router.post('/post_deviceInfo', (req, res) => {
  const deviceInfodata = req.body;
  const newDeviceInfoData = new DeviceInfo(deviceInfodata);
  newDeviceInfoData.save()
    .then(() => {
      console.log('DeviceInfo saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving DeviceInfo:', error);
      res.sendStatus(500);
    });
});


// 초기 기기점검
router.post('/post_initialCheck', (req, res) => {
  const checkdata = req.body;
  const newCheckData = new DeviceInfo(checkdata);
  newCheckData.save()
    .then(() => {
      console.log('InitialCheck_status saved successfully');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error saving InitialCheck_status:', error);
      res.sendStatus(500);
    });
});


//api 테스트
router.post('/data', (req, res) => { // 데이터 저장 라우트 핸들러
  const data = req.body; // POST 요청의 본문에서 데이터 추출
  const newData = new Data({ // 데이터를 스키마 모델을 사용하여 저장
    temperature: data.temperature,
    humidity: data.humidity
  });
  newData.save()
    .then(() => {
      console.log('Data saved successfully');
      res.sendStatus(200).send("Data saved success");
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
