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
  workEnv,
  deviceInfo,
  userInfo,
  workInfo,
  workStatus,
  accessControl,
  gasInfo,
  initialDeviceCheck
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

router.post('/post_envData', createDataHandler(workEnv));
router.post('/post_gasInfo', createDataHandler(gasInfo));
router.post('/signUp', createDataHandler(accessControl));
router.post('/post_workInfo', createDataHandler(workInfo));
// router.post('/post_'


// router.post('/update_', (req,res) => {
//   res.sendFile(path.join(__dirname, '../web', 'build', 'index.html'));
// });
// function updateData(Model, query, update) {
//   return async (req, res) => {
//     Model.findOneAndUpdate(query, update, { new: true }, (err, updatedData) => {
//       if (err) {
//         console.error("Error updating data:", err);
//         res.sendStatus(500);
//         return;
//       }
  
//       if (updatedData) {
//         console.log("Data updated successfully:", updatedData);
//         res.sendStatus(200);
//       } else {
//         console.log("No matching data found.");
//         res.sendStatus(404);
//       }
//     });
//   };
// }

// // 사용 예제
// const DeviceInfo = mongoose.model('Device_Info', deviceInfoSchema);
// const query = { device_id: "특정값1", user_id: "특정값2" };
// const update = { $set: { work_id: "새로운_작업_ID" } };
// updateData(DeviceInfo, query, update);






// 데이터 내보내기 라우트
function GetDataHandler(collectionName, dataform) {
  return async (req, res) => {
    try {
      const client = await MongoClient.connect(mongoURL, { useUnifiedTopology: true });
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const result = await collection.find({}, { projection: dataform }).toArray();
      client.close();
      res.json(result);
    } catch (err) {
      console.error(`Failed to read data from MongoDB for collection '${collectionName}':`, err);
      res.status(500).send(`Failed to read data from MongoDB for collection '${collectionName}'`);
    }
  };
}


const workEnvData = { _id:0, device_id: 1, work_id: 1, O2: 1, H2S: 1, CO: 1, NO2: 1, NH3: 1, record_time: 1, risk_score: 1, temp: 1, humid: 1, discomfort: 1 };
router.get('/get_envData', GetDataHandler('work_envData', workEnvData));

const gasInfoData = { _id: 0, gas_type: 1, gas_info: 1, gas_guide: 1 };
router.get('/get_gasInfo', GetDataHandler('gas_info', gasInfoData));

const auth = { _id: 0, login_id: 0, login_pw: 0, auth: 1 };
router.get('/account', GetDataHandler('Access_Control', auth));


// const workTemp = { _id: 0, device_id: 1, work_id: 1, record_time: 1, env_temp: 1, env_humid: 1, env_discomfort: 1 };
// router.get('/get_tempData', GetDataHandler('work_tempdatas', workTemp));

// const workStat = { _id: 0, device_id: 1, work_id: 1, status: 1, record_time: 1, work_specifics: 1 };
// router.get('/get_statData', GetDataHandler('work_statuses', workStat));

// const deviceInfo = { _id: 0, device_id: 1, user_id: 1, user_name: 1, user_birth: 1, user_health: 1 };
// router.get('/get_deviceInfo', GetDataHandler('device_infos', deviceInfo));


module.exports = router;
