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



// Post 요청으로 들어온 데이터 DB에 저장
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


// 데이터 내보내기 라우트
function getDataHandler(collectionName, dataform) {
  return async (req, res) => {
    try {
      const client = await MongoClient.connect(mongoURL, { useUnifiedTopology: true });
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const result = await collection.find({}, { projection: dataform }).toArray(); // dataform 형식 : { _id: 0, temperature: 1, humidity: 1 }
      client.close();
      res.json(result);
    } catch (err) {
      console.error(`Failed to read data from MongoDB for collection '${collectionName}':`, err);
      res.status(500).send(`Failed to read data from MongoDB for collection '${collectionName}'`);
    }
  };
}


// 데이터 받아오기 라우트

router.post('/post_envData', createDataHandler(workEnv)); // H/W - 센서 데이터 전송
router.post('/post_gasInfo', createDataHandler(gasInfo)); // Web - 유해가스 정보 등록
router.post('/signUp', createDataHandler(accessControl)); // Web - 관리자 계정 회원가입
router.post('/access_device', createDataHandler(deviceInfo)); // H/W - 기기 시작 시 서버에 기기id 등록
/* 
 {
    "device_id": 기기에서 지정된 아이디, 
    "user_id": 지정되지 않음,
    "work_id": 지정되지 않음
 }
*/
router.post('/post_workInfo',(req, res) => { // Web - 웹에서 새로운 작업 생성 시 
  try {
    const data = req.body;
    const expCompare = /^W/.test(data.work_id);
    if(!expCompare){//기존 
      const randNum = Math.floor(Math.random() * 1000);
      const formatId = randNum.toString().padStart(3, '0');
      data.work_id = 'W' + formatId;
    }; 
    const newData = new workInfo(data);
    newData.save();
    console.log(`${workInfo.modelName} saved successfully. Work_id: ` + data.work_id );
    res.status(200).json(data.work_id);
  } catch (error) {
    console.error(`Error saving ${workInfo.modelName}:`, error);
    res.sendStatus(500);
  }
}); 

/* 
 {
    "work_id": 서버에서 랜덤으로 배정(key),
    "admin_info": [이름, 전화번호, 현장주소, 작업정보],
    "env_status": 웹에서 진행,
    "env_code": 작업 시작 후 이상 생길 시 메세지 저장,
    "start_time": 웹에서 작업 시작 시 기록,
    "end_time": 웹에서 작업 종료 시 기록
 }
*/
router.post('/add_user', (req,res) => { // Web - 웹에서 관리자 권한으로 작업자 등록
  try {
    const data = req.body;
    const randNum = Math.floor(Math.random() * 1000);
    const formatId = randNum.toString().padStart(3, '0');
    data.user_id = 'U' + formatId;

    const newData = new userInfo(data);
    newData.save();
    console.log(`${userInfo.modelName} saved successfully. user_id: ` + data.user_id );
    res.sendStatus(200);
  } catch (error) {
    console.error(`Error saving ${userInfo.modelName}:`, error);
    res.sendStatus(500);
  }
}); 
/**
 * {
 *    "user_id": 서버에서 랜덤으로 배정(key),
 *    "user_name": 이름,
 *    "user_birth": 생년월일,
 *    "user_health": 건강 특이사항,
 *    "specifics": 특이사항
 * }
 */
// 여기서 부터 해야함 지금 오류남
router.post('/link_user', (req, res) => {// Web- [작업자 - 기기] 연결시 기기정보에 work_id, user_id & 작업자정보 work_id, device_id 업데이트
  const updateUserData = '', updateDeviceData = '';
  let status = true;
  const user_id = req.body.user_id;
  const work_id = req.body.work_id;
  const device_id = req.body.device_id;
  if(user_id == null){ // 사용자id 값이 없을때
    console.log("/link user: No matching user_id found."); 
    res.status(404).send("/link user: No matching user_id found.");
    status = false;
  }
  if(work_id == null){
    console.log("/link user: work_id Data found."); 
    res.status(404).send("/link user: work_id Data found.");
    status = false;
  }
  if(device_id == null){
    console.log("/link user: work_id Data found."); 
    res.status(404).send("/link user: work_id Data found.");
    status = false;
  }
  if(status){
    const queryUser = { user_id: user_id};
    const queryDevice = { device_id: device_id };
    const updateUser = { $set: { work_id: work_id, user_id: user_id } };
    const updateDevice = { $set: { work_id: work_id, device_id: device_id } };

    try {
      updateUserData = userInfo.findOneAndUpdate(queryUser, updateUser,{ new: true });
    } catch (error) {
      throw error;
    }

    try {
      updateDeviceData = deviceInfo.findOneAndUpdate(queryDevice, updateDevice,{ new: true });
    } catch (error) {
      throw error;
    }

    if(updateUserData.length > 0 && updateDeviceData.length > 0){
      console.log("Data updated successfully:", updateUserData, updateDeviceData);
      res.status(200).send("성공적으로 업데이트 되었습니다.");
    }
  }
});
/**
 * UserInfo
 * { 
 *    "user_id": 선택된 사용자id,
 *    "work_id": 연결된 작업id,
 *    "device_id": 연결된 기기id
 * }
 * 
 * DeviceInfo
 * {
 *    "device_id": 해당 기기id,
 *    "user_id": 연결된 작업자id,
 *    "work_id": 연결된 작업id
 * }
 * 
 */


router.post('/get_userList', async (req,res) => { // Web - 관리자가 작업자 리스트를 조회하려할때
  try {
    const query = { work_id: null };
    const userList = await userInfo.find(query);
    if(userList.length > 0){
      res.status(200).json(userList);
      console.log('/get_userList : Get Data Successfully');
    } else {
      res.json([]);
    }
  } catch(err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Error fetching data");
  }
  getDataHandler(userInfo);
}); 



// function updateDataHandler(Model, query, update) {
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










const workEnvData = { _id:0, device_id: 1, work_id: 1, O2: 1, H2S: 1, CO: 1, NO2: 1, NH3: 1, record_time: 1, risk_score: 1, temp: 1, humid: 1, discomfort: 1 };
router.get('/get_envData', getDataHandler('work_envData', workEnvData));

const gasInfoData = { _id: 0, gas_type: 1, gas_info: 1, gas_guide: 1 };
router.get('/get_gasInfo', getDataHandler('gas_info', gasInfoData));

const auth = { _id: 0, login_id: 0, login_pw: 0, auth: 1 };
router.get('/account', getDataHandler('Access_Control', auth));


// const workTemp = { _id: 0, device_id: 1, work_id: 1, record_time: 1, env_temp: 1, env_humid: 1, env_discomfort: 1 };
// router.get('/get_tempData', getDataHandler('work_tempdatas', workTemp));

// const workStat = { _id: 0, device_id: 1, work_id: 1, status: 1, record_time: 1, work_specifics: 1 };
// router.get('/get_statData', getDataHandler('work_statuses', workStat));

// const deviceInfo = { _id: 0, device_id: 1, user_id: 1, user_name: 1, user_birth: 1, user_health: 1 };
// router.get('/get_deviceInfo', getDataHandler('device_infos', deviceInfo));


module.exports = router;
