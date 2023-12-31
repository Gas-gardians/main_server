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
router.post('/post_envCheck', createDataHandler(initialEnvData)); // H/W - 초기 기기 점검
router.post('/post_gasInfo', createDataHandler(gasInfo)); // Web - 유해가스 정보 등록
router.post('/adminAccount', createDataHandler(accessControl)); // Web - 관리자 계정 회원가입
router.post('/access_device', (req, res) => { // H/W - 기기 시작 시 서버에 기기id 등록
  const device_id = req.body.device_id;
  const index = DeviceList.indexOf(device_id);
  const findAdded = addedDevice.indexOf(device_id);

  if (index !== -1) {
    console.log(index);
    res.status(400).send("[access_device] 이미 연결되어 있는 device_id 입니다.");
    return;
  }

  if (findAdded !== -1) {
    addedDevice.splice(findAdded, 1);
    console.log(`[access_device] ${device_id} : next work start`);
    res.sendStatus(226);
    return;
  }

  deviceInfo.findOne({ device_id: device_id })
    .then((isData) => {
      if (isData) {
        DeviceList.push(device_id);
        res.status(400).send("[access_device] 이미 연결되어 있는 device_id 입니다.");
        return;
      } else {
        const data = req.body;
        const newData = new deviceInfo(data);
        newData.save()
          .then(() => {
            console.log(`[access_device] ${device_id} saved successfully`);
            DeviceList.push(device_id);
            res.sendStatus(200).send("[access_device] connect success");
          })
          .catch((error) => {
            console.error(`[access_device] Error saving ${device_id}:`, error);
            res.sendStatus(500).send(error);
          });
      }
    })
    .catch((error) => {
      console.error('[access_device] Error finding document:', error);
      res.status(500).send('[access_device] Error finding document');
    });
});
/**
 * {
 *    "device_id": 기기에서 지정된 device_id
 * }
 */

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
    console.log(`[post_workInfo] ${workInfo.modelName} saved successfully. Work_id: ` + data.work_id );
    res.status(200).json(data.work_id);
  } catch (error) {
    console.error(`[post_workInfo] Error saving ${workInfo.modelName}:`, error);
    res.sendStatus(500);
  }
}); 
/**
 * {
 *    "admin_info": [이름, 전화번호, 현장주소, 작업정보]
 * }
 */

router.post('/add_user', (req,res) => { // Web - 웹에서 관리자 권한으로 작업자 등록
  try {
    const data = req.body;
    const randNum = Math.floor(Math.random() * 1000);
    const formatId = randNum.toString().padStart(3, '0');
    data.user_id = 'U' + formatId;

    const newData = new userInfo(data);
    newData.save();  
    console.log(`[add_user] ${userInfo.modelName} saved successfully. user_id: ` + data.user_id );
    res.sendStatus(200);
  } catch (error) {
    console.error(`[add_user] Error saving ${userInfo.modelName}:`, error);
    res.sendStatus(500);
  }
}); 
/**
 * {
 *    "user_name": 이름,
 *    "user_birth": 생년월일,
 *    "user_health": 건강 특이사항,
 *    "specifics": 특이사항
 * }
 */

function initialSetting(device_id, work_id, ){ // 기기 - 작업자 연결시 초기 기기점검을 위한 테이블 셋팅 
  try {
    const init_data = { device_id: device_id, work_id: work_id }; // 초기 기기점검 테이블 세팅
    const newData = new initialDeviceCheck(init_data);
    newData.save();

    const stat_data = { work_id: work_id, device_id: device_id, status: 0 }; // 작업 상태 테이블 세팅
    const otherData = new workStatus(stat_data);
    otherData.save();

    console.log(`[initialSetting] initial Setting saved successfully`);
  } catch (error) {
    console.error(`[initialSetting] Error saving Settings:`, error);
  }
}


router.post('/link_userDevice', (req, res) => { // Web- [작업자 - 기기] 연결시 기기정보에 work_id, user_id & 작업자정보 work_id, device_id 업데이트
  let isData = true;
  const user_id = req.body.user_id;
  const work_id = req.body.work_id;
  const device_id = req.body.device_id;
  if(user_id == null){ // 사용자id 값이 없을때
    isData = false;
    console.log("[link_userDevice] No matching user_id found."); 
    res.status(404).send("[link_userDevice] No matching user_id found.");
    return;
  }
  if(work_id == null){
    isData = false;
    console.log("[link_userDevice] work_id Data found."); 
    res.status(404).send("[link_userDevice] work_id Data found.");
    return;
  }
  if(device_id == null){
    isData = false;
    console.log("[link_userDevice] work_id Data found."); 
    res.status(404).send("[link_userDevice] work_id Data found.");
    return;
  }
  if(isData){
    let status = true;
    userInfo.findOneAndUpdate(
      { user_id: user_id},  
      { $set: { work_id: work_id, device_id: device_id } }, 
      { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환) Update
    )
    .then(updatedUser => {
      console.log('[link_userDevice] Updated document:', updatedUser.device_id, updatedUser.work_id);
      // res.status(200).json(updatedUser);
    })
    .catch(error => {
      console.error('[link_userDevice] Error updating document:', error);
      status  = false;
    }); 

    deviceInfo.findOneAndUpdate(
      { device_id: device_id},  
      { $set: { work_id: work_id, user_id: user_id } },  
      { new: true }  // 업데이트 후의 문서를 반환 (기본값은 업데이트 전 문서를 반환)
    )
    .then(updatedDevice => {
      console.log('[link_userDevice] Updated document:', updatedDevice.user_id, updatedDevice.work_id);
      // res.status(200).json(updateDeviceData);
    })
    .catch(error => {
      console.error('[link_userDevice] Error updating document:', error);
      status  = false;
      //res.status(404).send("error");
    }); 
    
    if(status){
      initialSetting(device_id, work_id);
      addedDevice.push(device_id);
      res.status(200).send("[link_userDevice] Success Updated");
    }else{
      res.status(404).send("[link_userDevice] error");
    }
  }
});
/**
 * 
 * { 
 *    "user_id": 선택된 사용자id,\
 *    "work_id": 연결된 작업id,
 *    "device_id": 연결된 기기id
 * }
 */

router.get('/get_userList', async (req,res) => { // Web - 관리자가 작업자 리스트를 조회하려할때
  try {
    const query = { work_id: null };
    const userList = await userInfo.find(query);
    if(userList.length > 0){
      console.log('[get_userList] Get Data Successfully');
      res.status(200).json(userList);
    } else {
      res.status(404).send("할당되지 않은 작업자가 아무것도 없습니다!");
    }
  } catch(err) {
    console.error("[get_userList] Error fetching data:", err);
    res.status(500).send("[get_userList] Error fetching data");
  }
});

router.get('/get_deviceList', async (req,res) => { // Web - 관리자가 기기 리스트를 조회하려할때
  try {
    const query = { work_id: null };
    const deviceList = await deviceInfo.find(query);
    if(deviceList.length > 0){
      console.log('[get_deviceList] Get Data Successfully');
      res.status(200).json(deviceList);
    } else {
      res.status(404).send("할당되지 않은 기기가 아무것도 없습니다!");
    }
  } catch(err) {
    console.error("[get_deviceList] Error fetching data:", err);
    res.status(500).send("[get_deviceList] Error fetching data");
  }
});

router.post('/wait_connection', async (req, res)=> { // H/W - 기기 작업 연결 확인
  const device_id = req.body.device_id;
  try {
    const data = await deviceInfo.findOne({ device_id: device_id });

    if (data != undefined) {
      res.status(200).send(data); // 작업에 할당된 기기일경우 작업기기 정보 전송
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('[wait_connection] Error finding device in MongoDB:', error);
    res.sendStatus(500); // 서버 오류 응답
  }
});
/**
 * {
 *     "device_id": 해당 기기id
 * }
 */

router.post('/wait_acction', async (req,res)=>{ // H/W - 다음 작업이 주어질때까지 대기 상태
  const device_id = req.body.device_id;
  // status: 0-다음 작업 대기, 1: 작업시작, -1: 작업종료, 2: 기기점검, 3: 작업환경측정
  try {
    const data = await workStatus.findOne({ device_id: device_id });

    if (data != undefined) {
      res.status(200).send(data.status); // 작업에 할당된 기기일경우 다음 작업 지시
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('[wait_acction] Error finding device in MongoDB:', error);
    res.sendStatus(500); // 서버 오류 응답
  }

  // const device_check = initCheck_device.find(item => item === device_id);
  // const env_check = initCheck_env.find(item => item == device_id);
  // if(device_check != undefined){
  //   res.status(200).send("[waiting] device_check");
  // } else if(env_check != undefined) {
  //   res.status(200).send("[waiting] env_check");
  // } else {
  //   res.status(500).send("[waiting] Waiting for next action");
  // }
});
/**
 * {
 *    "device_id": 해당 기기id
 * }
 */


router.post('/initCheck_specific', async(req, res) => {
  const work_id = req.body.work_id;
  const specific = req.body.specific;
  
  const data = await workInfo.findOne({ work_id: work_id });
  const newData = data.env_status.push(specific);

  workInfo.findOneAndUpdate(
    { work_id: work_id},  
    { $set: { env_status: newData } }
  )
  .then(updatedDevice => {
    console.log("[initCheck_specific] success update data");
    res.sendStatus(200);
  })
  .catch(error => {
    console.error('[initCheck_specific] Error updating document:', error);
    res.sendStatus(404);
  }); 

});
/**
 * {
 *    "work_id": 해당 작업id
 *    "specific": 발생한 특이사항 내용
 * }
 * 
 */


router.post('/get_envData', async (req,res) => { // Web - 작업시작 후 관리자가 측정 데이터를 받아오려 할때
  const work_id = req.body.work_id;
  try {
    const query = { work_id: work_id };
    const envData = await workEnv.find(query);
    if(envData.length > 0){
      console.log('[get_envData] Get Data Successfully');
      res.status(200).json(envData);
    } else {
      res.status(404).send("[get_envData] 해당 데이터가 없습니다!");
    }
  } catch(err) {
    console.error("[get_envData] Error fetching data:", err);
    res.status(500).send("[get_envData] Error fetching data");
  }
});
/**
 * {
 *    "work_id": 해당 작업id
 * }
 */

const gasInfoData = { _id: 0, gas_type: 1, gas_info: 1, gas_guide: 1 };
router.get('/get_gasInfo', getDataHandler('gas_infos', gasInfoData));

// const auth = { _id: 0, login_id: 1, login_pw: 1, auth: 1 };
router.post('/account', async (req,res) => { // 로그인하면 권한 내뱉기
  const { login_id, login_pw } = req.body;
  try {
    // MongoDB에서 해당 login_id와 login_pw에 해당하는 auth를 검색
    const user = await accessControl.findOne({ login_id: login_id, login_pw: login_pw });

    if (user) {
      console.log("성공");
      res.status(200).send(true); // 사용자가 있을 경우 해당 auth 응답
    } else {
      console.log(user);
      res.status(404).send('User not found'); // 사용자가 없을 경우 404 응답
    }
  } catch (error) {
    console.error('[account] Error finding user in MongoDB:', error);
    res.sendStatus(500); // 서버 오류 응답
  }
});

// let initCheck_device = [];
// let initCheck_env = [];
// let initCheck_work = '';
router.post('/start_initCheck', (req,res) => { //Web 초기 점검 시작할때 기기리스트로 요청
  const arr = req.body.device;
  const work_id = req.body.work_id;

  if(arr.length > 0){
    // initCheck_device = arr;
    // initCheck_work = work_id;
    start_InitCheck(arr, work_id);
    res.sendStatus(200);
  } else {
    res.status(500).send('Data is not reached');
  }
});
/**
 * 초기 기기점검 Initial_deviceCheck - Start api
 * {
 *    "device": [연결된 디바이스 리스트],
 *    "work_id": 초기 점검하는 작업id
 * }
 */


function updateDeviceStatus(deviceId, updateFields, workId, status) { 
  initialDeviceCheck.findOneAndUpdate(
    { device_id: deviceId, work_id: workId },
    { $set: updateFields },
    { new: true }
  ).catch(error => {
    console.error(`Error updating device status for device ID ${updatedData.deviceId}:`, error);
  });

  workStatus.findOneAndUpdate(
    { work_id: workId, user_id: user_id},  
    { $set: { status: status } }, 
  ).catch(error => {
    console.error('[updateDeviceStatus] workStatus update error: ', error);
    res.status(500).send("updateDeviceStatus: workStatus update error");
  }); 

  return;
}

// 작업 아이디를 가지고 어떤 테이블에서 디바이스id 목록을 가져올것인가? deviceInfo 


function start_InitCheck(arr, workId) { // Web에서 초기점검을 시작하면 db에 정보 업데이트
  if (arr.length <= 0) {
    console.log("[start_InitCheck] Error!!: startInitCheck() has no data");
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const deviceId = arr[i];
    const updateFields = { Is_check: true, Is_connect: true };
    updateDeviceStatus(deviceId, updateFields, workId, 2);
  }
}




router.post('/verify_initCheck', async (req, res) => { //Web - 초기점검 시작이후 중간 상황을 체크할때
  const work_id = req.body.work_id;
  try {
    const query = { work_id: work_id };
    const initList = await initialDeviceCheck.find(query);
    if(initList.length > 0){
      console.log('[verify_initCheck] Get Data Successfully');
      res.status(200).json(initList);
    } else {
      res.status(404).send("해당 데이터가 없습니다!");
    }
  } catch(err) {
    console.error("[verify_initCheck] Error fetching data -", err);
    res.status(500).send("Error fetching data");
  }
});
/**
 * {
 *    "work_id": 초기 기기점검 시작한 작업id
 * }
 */

router.post('/quit_initCheck', (req, res) => { // Web - 초기점검 종료 시 시간내 점검을 못했다 판단하고 기존 점검정보 초기화 
  const work_id = req.body.work_id;
  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 0 } } 
  ).catch(error => {
    console.error('[updateDeviceStatus] workStatus update error: ', error);
    res.status(500).send("updateDeviceStatus: workStatus update error");
    return;
  }); 

  initialDeviceCheck.updateMany(
    { work_id: work_id },  
    { $set: {
      Is_check: false,
      Is_connect: true,
      Is_shock: false,
      Is_help: false,
      battery: false,
      Is_camera: false,
      Is_dark: false
    }}
  ).catch(error => {
    res.sendStatus(500).send(error);
    return;
  });

  console.log("[quit_initCheck] success");
  res.sendStatus(200);
  return;
  //res.status(200).send("Quit Initial Device Check");
});
/**
 * {
 *    "work_id": 초기 기기점검 종료할 작업id
 * }
 */

router.post('/finish_initCheck', (req, res) => { // Web - 초기점검 확인 완료 시 정상적으로 종료
  const work_id = req.body.work_id;

  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 0 } }, 
  ).catch(error => {
    console.error('[finish_initCheck] workStatus update error: ', error);
    res.status(500).send("finish_initCheck: workStatus update error");
  }); 
  // initCheck_device = [];
  res.status(200).send("Finished Initial Device Check");
});
/**
 * {
 *    "work_id": 해당 작업id
 * } 
 */


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
/**
 * {
 *    "device_id": 해당 기기id,
 *    "work_id": 해당 작업id,
 *    "query": { "Is_shock" : false, "Is_help" : false, "battery" : 0, "Is_camera" : false, "Is_dark" : falenvCheckse }
 * }
 */


//초기점검 시작 post - work_id
router.post('/start_envCheck', (req, res) => {
  const work_id = req.body.work_id;
  //const deviceList = await deviceInfo.find({ work_id: work_id }); // 무조건 비동기!!!!
  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 3 } }, 
  ).catch(error => {
    console.error('[start_envCheck] workStatus update error: ', error);
    res.status(500).send("start_envCheck: workStatus update error");
    return;
  }); 

  res.sendStatus(200);
});
/**
 * {
 *    "work_id": 점검할 작업id
 * }
 */

//초기점검 데이터 받아오기 post - work_id
router.post('/get_envCheck', async (req, res) => {
  const work_id = req.body.work_id;
  const envData = await initialEnvData.find({ work_id:work_id });
  if(envData.length > 0){
    res.status(200).json(envData);
  } else {
    console.log('[get_envCheck] Error!');
    res.sendStatus(404);
  }
});
/**
 * {
 *    "work_id": 해당 작업id
 * }
 */


//초기점검 종료
router.post('/finish_envCheck', (req, res) => {
  //console.log(initCheck_env);
  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 0 } }, 
  ).catch(error => {
    console.error('[finish_envCheck] workStatus update error: ', error);
    res.status(500).send("finish_envCheck: workStatus update error");
    return;
  }); 
  res.sendStatus(200);
});
/**
 * {
 *    "work_id": 해당 작업id
 * }
 */

// 작업자 - 기기 해제시 기존 연결되었던 정보 초기화 work_id, device_id, user_id
router.post('/unlink_userDevice', (req, res) => {
  const work_id = req.body.work_id;
  const user_id = req.body.user_id;
  const device_id = req.body.device_id;

  userInfo.findOneAndUpdate(
    { work_id: work_id, user_id: user_id},  
    { $set: { work_id: null } }, 
  ).catch(error => {
    console.error('[unlink_userDevice] UserInfo update error: ', error);
    res.status(500).send("Unlinked: UserInfo update error");
    return;
  }); 

  deviceInfo.deleteOne({ work_id: work_id, user_id: user_id })
  .catch(error => {
    console.error('[unlink_userDevice] deviceInfo delete error: ', error);
    res.status(500).send("Unlinked: deviceInfo delete error");
    return;
  });

  workStatus.deleteOne({ work_id: work_id, device_id: device_id })
  .catch(error => {
    console.error('[unlink_userDevice] workStatus delete error: ', error);
    res.status(500).send("Unlinked: workStatus delete error");
    return;
  });
  res.sendStatus(200);
});
/**
 * {
 *    "device_id": 연결 해제 할 기기id,
 *    "user_id": 연결 해제 할 작업자id,
 *    "work_id": 해당 작업id
 * }
 */

// 초기 점검, 초기 작업환경, 작업 시작시 기기정보에서 데이터 가져오기 v

//작업 시작 post - work_id
router.post('/start_work', (req, res) => {
  const work_id = req.body.work_id;
  const time = new Date();

  workInfo.findOneAndUpdate(
    { work_id: work_id },  
    { $set: { start_time: time } }, 
  ).catch(error => {
    console.error('[start_work] workInfo update error: ', error);
    res.status(500).send("[start_work]: workInfo update error");
    return;
  }); 

  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 1 } } 
  ).catch(error => {
    console.error('[start_work] workStatus update error: ', error);
    res.status(500).send("start_work: workStatus update error");
    return;
  });
  
  res.sendStatus(200);
});
/**
 * {
 *    "work_id": 작업id
 * }
 */


//작업 일시정지 post - work_id
router.post('/pause_work', (req, res) =>{
  const work_id = req.body.work_id;
  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 0 } } 
  )
  .then(() => {
    console.log('[pause_work] success pause work', work_id);
    res.sendStatus(200);
  })
  .catch(error => {
    console.error('[pause_work] workStatus update error: ', error);
    res.status(500).send("pause_work: workStatus update error");
  });
});
/**
 * {
 *    "work_id": 작업id
 * }
 */

//작업 재개 post - work_id
router.post('/resume_work', (req, res) =>{
  const work_id = req.body.work_id;
  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: 1 } } 
  )
  .then(() => {
    console.log('[resume_work] success resume work', work_id);
    res.sendStatus(200);
  })
  .catch(error => {
    console.error('[resume_work] workStatus update error: ', error);
    res.status(500).send("resume_work: workStatus update error");
  });
});
/**
 * {
 *    "work_id": 작업id
 * }
 */

//작업 종료 post 
//     > 종료 시 기존 상태 정보 초기화
router.post('/finish_work', async (req, res)=> {
  const work_id = req.body.work_id;
  const time = new Date();

  workInfo.findOneAndUpdate(
    { work_id: work_id },  
    { $set: { end_time: time } }, 
  ).catch(error => {
    console.error('[finish_work] workInfo update error: ', error);
    res.status(500).send("[finish_work]: workInfo update error");
    return;
  }); 

  workStatus.updateMany(
    { work_id: work_id },  
    { $set: { status: -1 } } 
  ).catch(error => {
    console.error('[finish_work] workStatus update error: ', error);
    res.status(500).send("finish_work: workStatus update error");
    return;
  });

  userInfo.updateMany(
    { work_id: work_id },  
    { $set: { work_id: null } } 
  ).catch(error => {
    console.error('[finish_work] userInfo update error: ', error);
    res.status(500).send("finish_work: userInfo update error");
    return;
  });

  deviceInfo.deleteMany(
    { work_id: work_id }
  ).catch(error => {
    console.error('[finish_work] userInfo update error: ', error);
    res.status(500).send("finish_work: userInfo update error");
    return;
  });
  res.sendStatus(200);
});

// 이상상태 발생 시 처리 기준 필요

// const deviceInfo = { _id: 0, device_id: 1, user_id: 1, user_name: 1, user_birth: 1, user_health: 1 };
// router.get('/get_deviceInfo', getDataHandler('device_infos', deviceInfo));


module.exports = router;