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
  initialDeviceCheck,
  initialEnvData
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
var DeviceList = [];
var addedDevice = [];
router.post('/post_envData', createDataHandler(workEnv)); // H/W - 센서 데이터 전송
router.post('/post_initData', createDataHandler(initialEnvData)); // H/W - 초기 기기 점검
router.post('/post_gasInfo', createDataHandler(gasInfo)); // Web - 유해가스 정보 등록
router.post('/adminAccount', createDataHandler(accessControl)); // Web - 관리자 계정 회원가입
router.post('/access_device', (req,res) => { // H/W - 기기 시작 시 서버에 기기id 등록
  const device_id = req.body.device_id;
  const index = DeviceList.indexOf(device_id); //이미 등록한 기기라면 생략하기 위함
  const findAdded = addedDevice.indexOf(device_id); // 연결 완료한건지 확인
  if(index == -1){ // 기기 등록이 처음이라면
    try {
      const data = req.body;
      const newData = new deviceInfo(data);
      newData.save();
      console.log(`${device_id} saved successfully`);
      DeviceList.push(device_id);
      res.sendStatus(226);
    } catch (error) { // 기기 등록 중 오류가 난다면
      console.error(`Error saving ${device_id}:`, error);
      res.sendStatus(500);
    }
  } else if(findAdded !== -1) { // 이미 연결 완료되었다면
    addedDevice.splice(findAdded, 1);
    console.log(`${device_id} : next work start`);
    res.sendStatus(200);
  } else {
    res.status(400).send("아직 연결되지 않았습니다");
  }
}); 
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

function initialSetting(device_id, work_id){ // 기기 - 작업자 연결시 초기 기기점검을 위한 테이블 셋팅 
  try {
    const data = { device_id: device_id, work_id: work_id };
    const newData = new Model(data);
    newData.save();
    console.log(`${Model.modelName} saved successfully`);
  } catch (error) {
    console.error(`Error saving ${Model.modelName}:`, error);
  }
}


router.post('/link_user', (req, res) => { // Web- [작업자 - 기기] 연결시 기기정보에 work_id, user_id & 작업자정보 work_id, device_id 업데이트
  let isData = true;
  const user_id = req.body.user_id;
  const work_id = req.body.work_id;
  const device_id = req.body.device_id;
  if(user_id == null){ // 사용자id 값이 없을때
    isData = false;
    console.log("/link user: No matching user_id found."); 
    res.status(404).send("/link user: No matching user_id found.");
  }
  if(work_id == null){
    isData = false;
    console.log("/link user: work_id Data found."); 
    res.status(404).send("/link user: work_id Data found.");
  }
  if(device_id == null){
    isData = false;
    console.log("/link user: work_id Data found."); 
    res.status(404).send("/link user: work_id Data found.");
  }
  if(isData){
    let status = true;
    let updatedUser, updatedDevice;
    userInfo.findOneAndUpdate(
      { user_id: user_id},  
      { $set: { work_id: work_id, device_id: device_id } }, 
      { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환) Update
    )
    .then(updatedUser => {
      console.log('Updated document:', updatedUser);
      // res.status(200).json(updatedUser);
    })
    .catch(error => {
      console.error('Error updating document:', error);
      status  = !status;
    }); 

    deviceInfo.findOneAndUpdate(
      { device_id: device_id},  
      { $set: { work_id: work_id, user_id: user_id } },  
      { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환)
    )
    .then(updatedDevice => {
      console.log('Updated document:', updatedDevice);
      // res.status(200).json(updateDeviceData);
    })
    .catch(error => {
      console.error('Error updating document:', error);
      status  = !status;
      //res.status(404).send("error");
    }); 
    
    if(status){
      initialSetting(device_id, work_id);
      addedDevice.push(device_id);
      res.status(200).json(updatedUser + updatedDevice);
    }else{
      res.status(404).send("error");
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

router.get('/get_userList', async (req,res) => { // Web - 관리자가 작업자 리스트를 조회하려할때
  try {
    const query = { work_id: null };
    const userList = await userInfo.find(query);
    if(userList.length > 0){
      console.log('/get_userList : Get Data Successfully');
      res.status(200).json(userList);
    } else {
      res.status(404).send("할당되지 않은 작업자가 아무것도 없습니다!");
    }
  } catch(err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Error fetching data");
  }
});

router.post('/waiting', (req,res)=>{ // H/W - 다음 작업이 주어질때까지 대기 상태
  const device_id = req.body.device_id;
  const device_check = initCheck_device.find(item => item === device_id);
  const env_check = '';
  if(device_check !== undefined){
    res.status(200).send("device_check");
  } else if(env_check !== undefined) {
    res.status(200).send("env_check");
  } else {
    res.status(500).send("Waiting for next action");
  }
});


router.post('/get_envData', async (req,res) => { // Web - 작업시작 후 관리자가 측정 데이터를 받아오려 할때
  const work_id = req.body.work_id;
  try {
    const query = { work_id: work_id };
    const envData = await workEnv.find(query);
    if(envData.length > 0){
      console.log('/get_envData : Get Data Successfully');
      res.status(200).json(envData);
    } else {
      res.status(404).send("해당 데이터가 없습니다!");
    }
  } catch(err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Error fetching data");
  }
});

const gasInfoData = { _id: 0, gas_type: 1, gas_info: 1, gas_guide: 1 };
router.get('/get_gasInfo', getDataHandler('gas_infos', gasInfoData));

// const auth = { _id: 0, login_id: 1, login_pw: 1, auth: 1 };
router.post('/account', (req,res) => { // 로그인하면 권한 내뱉기
  const { login_id, login_pw } = req.body;
  try {
    // MongoDB에서 해당 login_id와 login_pw에 해당하는 auth를 검색
    const user = accessControl.findOne({ login_id: login_id, login_pw: login_pw });

    if (user) {
      console.log("성공");
      res.status(200).send(true); // 사용자가 있을 경우 해당 auth 응답
    } else {
      console.log(user);
      res.status(404).send('User not found'); // 사용자가 없을 경우 404 응답
    }
  } catch (error) {
    console.error('Error finding user in MongoDB:', error);
    res.sendStatus(500); // 서버 오류 응답
  }
});

// 여기서부터 apitest

let initCheck_device = [];
let initCheck_workId = '';
router.post('/start_initCheck', (req,res) => { //Web 초기 점검 시작할때 기기리스트로 요청
  const arr = req.body.device;
  if(arr.length > 0){
    initCheck_device = arr;
    initCheck_workId = req.body.work_id;
    start_InitCheck();
    res.sendStatus(200);
  } else {
    res.status(500).send('Data is not reached');
  }
});
/**
 * 초기 기기점검 Initial_deviceCheck - Start api
 * {
 *    "device": [연결된 디바이스 리스트],
 *    "admin": 초기 점검하는 작업id
 * }
 */

// function start_InitCheck(){ // Web에서 초기점검을 시작하면 db에 정보 업데이트
//   if(initCheck_device.length > 0){
//     for(let i=0; i  < initCheck_device.length; i++){
//       initialDeviceCheck.findOneAndUpdate(
//         { device_id: device_id  },  
//         { $set: { Is_check: true, Is_connect: true } }, 
//         { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환) Update
//       )
//       .then(updatedData => {
//         console.log('[start_InitCheck] success :', updatedData.device_id);
//         // res.status(200).json(updatedUser);
//       })
//       .catch(error => {
//         console.error('[start_InitCheck] Error device not found: ', error);
//       });
//     }
//   } else {
//     console.log("[start_InitCheck] Error!!: start InitCheck() has not data");
//   }
// }

// function finish_InitCheck(){ // Web에서 초기점검을 종료하면 db에 정보 업데이트
//   if(initCheck_device.length > 0){
//     for(let i=0; i  < initCheck_device.length; i++){
//       initialDeviceCheck.findOneAndUpdate(
//         { device_id: device_id  },  
//         { $set: { Is_check: false } }, 
//         { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환) Update
//       )
//       .then(updatedData => {
//         console.log('[start_InitCheck] success :', updatedData.device_id);
//         // res.status(200).json(updatedUser);
//       })
//       .catch(error => {
//         console.error('[start_InitCheck] Error device not found: ', error);
//       });
//     }
//   } else {
//     console.log("[start_InitCheck] Error!!: start InitCheck() has not data");
//   }
// }

// function restart_InitCheck(){ // Web에서 초기점검을 다시 시작하면 db에 기존 정보 초기화
//   if(initCheck_device.length > 0){
//     for(let i=0; i  < initCheck_device.length; i++){
//       initialDeviceCheck.findOneAndUpdate(
//         { device_id: device_id  },  
//         { $set: { Is_check: true, Is_connect: true, Is_shock: false, Is_help: false, battery: false, Is_camera: false, Is_dark: false  } }, 
//         { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환) Update
//       )
//       .then(updatedData => {
//         console.log('[start_InitCheck] success :', updatedData.device_id);
//         // res.status(200).json(updatedUser);
//       })
//       .catch(error => {
//         console.error('[start_InitCheck] Error device not found: ', error);
//       });
//     }
//   } else {
//     console.log("[start_InitCheck] Error!!: start InitCheck() has not data");
//   }
// }
function updateDeviceStatus(deviceId, updateFields) { 
  initialDeviceCheck.findOneAndUpdate(
    { device_id: deviceId },
    { $set: updateFields },
    { new: true }
  )
  .then(updatedData => {
    console.log(`Device status updated successfully for device ID ${updatedData.deviceId}`);
  })
  .catch(error => {
    console.error(`Error updating device status for device ID ${updatedData.deviceId}:`, error);
  });
}

function start_InitCheck() { // Web에서 초기점검을 시작하면 db에 정보 업데이트
  if (initCheck_device.length > 0) {
    for (let i = 0; i < initCheck_device.length; i++) {
      const deviceId = initCheck_device[i];
      const updateFields = { Is_check: true, Is_connect: true };
      updateDeviceStatus(deviceId, updateFields);
    }
  } else {
    console.log("Error!!: startInitCheck() has no data");
  }
}

function finish_InitCheck() {  // 초기점검을 완료하면 db에 정보 업데이트
  if (initCheck_device.length > 0) {
    for (let i = 0; i < initCheck_device.length; i++) {
      const deviceId = initCheck_device[i];
      const updateFields = { Is_check: false };
      updateDeviceStatus(deviceId, updateFields);
    }
  } else {
    console.log("Error!!: finishInitCheck() has no data");
  }
}


// 아직 리스타트 처리 안함
function restart_InitCheck() { // Web에서 초기점검을 다시 시작하면 db에 기존 정보 초기화
  if (initCheck_device.length > 0) {
    for (let i = 0; i < initCheck_device.length; i++) {
      const deviceId = initCheck_device[i];
      const updateFields = {
        Is_check: false,
        Is_connect: true,
        Is_shock: false,
        Is_help: false,
        battery: false,
        Is_camera: false,
        Is_dark: false
      };
      updateDeviceStatus(deviceId, updateFields);
    }
  } else {
    console.log("Error!!: restartInitCheck() has no data");
  }
}



router.get('/verify_initCheck', async (req, res) => { //Web - 초기점검 시작이후 중간 상황을 체크할때
  try {
    const query = { work_id: initCheck_workId };
    const initList = await initialDeviceCheck.find(query);
    if(initList.length > 0){
      console.log('/verify_initCheck : Get Data Successfully');
      res.status(200).json(initList);
    } else {
      res.status(404).send("해당 데이터가 없습니다!");
    }
  } catch(err) {
    console.error("/verify_initCheck : Error fetching data -", err);
    res.status(500).send("Error fetching data");
  }
});

router.get('/quit_initCheck', (req, res) => { // Web - 초기점검 종료 시 시간내 점검을 못했다 판단하고 기존 점검정보 초기화 
  restart_InitCheck();
  initCheck_device = [];
  initCheck_workId = '';
  res.status(200).send("Quit Initial Device Check");
});

router.get('/finish_initCheck', (req, res) => { // Web - 초기점검 확인 완료 시 정상적으로 종료
  finish_InitCheck();
  initCheck_device = [];
  initCheck_workId = '';
  res.status(200).send("Finished Initial Device Check");
});


router.post('/post_initCheck', (req, res)=> { // H/W - 일정시간 주기로 초기점검 상태 업데이트
  const device_id = req.body.device_id;
  const work_id = req.body.work_id;
  const query = req.body.query;
  
  initialDeviceCheck.findOneAndUpdate(
    { device_id: device_id, work_id: work_id },  
    { $set: query }, 
    { new: true } 
  )
  .then(updatedData => {
    res.sendStatus(200);
  })
  .catch(error => {
    res.sendStatus(500).send(error);
  });
});

//초기점검 시작 post - work_id
//초기점검 데이터 받아오기 post - work_id
//초기점검 종료

// 작업자 - 기기 해제시 기존 연결되었던 정보 초기화
// 초기 점검, 초기 작업환경, 작업 시작시 기기정보에서 데이터 가져오기

//작업 시작 post - work_id
//작업 일시정지 post - work_id
//작업 재개 post - work_id
//작업 종료 get 
//     > 종료 시 기존 상태 정보 초기화



// const deviceInfo = { _id: 0, device_id: 1, user_id: 1, user_name: 1, user_birth: 1, user_health: 1 };
// router.get('/get_deviceInfo', getDataHandler('device_infos', deviceInfo));


module.exports = router;