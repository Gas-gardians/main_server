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

const work_gasdata = new mongoose.Schema({ //유해가스 데이터 
  device_id: String,
  work_id: String,
  O2: Int,
  H2S: Int,
  CO: Int,
  NO2: Int,
  NH3: Int,
  record_time: String,
  work_time: Int
}); 

const work_tempdata = new mongoose.Schema({ //온습도 데이
  device_id: String,
  work_id: String,
  record_time: Int,
  env_temp: Int,
  env_humid: Int,
  env_discomfort: Int
});

const work_status = new mongoose.Schema({ //작업 상태
  device_id: String,
  work_id: String,
  status: Int,
  record_time: Int,
  work_specifics: Int
});

const work_environment = new mongoose.Schema({ //작업 환경 정보
  work_id: String,
  admin_id: String,
  user_list: Array,
  env_status: Array,
  env_code: String,
  env_specifics: String,
  start_time: Int,
  end_time: Int,
  gas_type: Int,
  device_id: String
});

const gas_infomation = new mongoose.Schema({ // 유해가스 정보
  gas_type: Int,
  gas_info: String,
  gas_guide: String
});

const device_info = new mongoose.Schema({ // 작업기기 정보
  device_id: String,
  user_id: String,
  user_name: String,
  user_birth: String,
  user_health: String
});

const initial_deviceCheck = new mongoose.Schema({ // 초기 기기점검
  admin_id: String,
  device_id: String,
  is_check: Bool,
  is_connect: Bool,
  is_shock: Bool,
  is_help: Bool,
  battery: Int,
  is_camera: Bool,
  is_dark: Bool
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
