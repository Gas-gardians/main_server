const mongoose = require('mongoose');

// 환경 측정 데이터
const workEnvDataSchema = new mongoose.Schema({ // Work_EnvData 스키마
  device_id: { type: String, required: true },
  work_id: { type: String, required: true },
  O2: { type: [Number], default: null },
    H2S: { type: [Number], default: null },
    CO: { type: [Number], default: null },
    NO2: { type: [Number], default: null },
    NH3: { type: [Number], default: null },
    record_time: { type: Date, default: null },
    temp: { type: Number, default:null },
    humid: { type: Number, default: null },
    discomfort: { type: Number, default: null }
});


// 작업기기 정보
const deviceInfoSchema = new mongoose.Schema({ // Device_Info 스키마
  device_id: { type: String, required: true },
  user_id: { type: String, required: true },
  work_id: { type: String, required: true, unique: true }
});
// 작업자 정보
const userInfoSchema = new mongoose.Schema({ // User_Info 스키마 
  user_id: { type: String, default: null },
  user_name: { type: String, default: null },
  user_birth: { type: String, default: null },
  user_health: { type: String, default: null },
  specifics: { type: String, default: null },
  work_id: { type: String, default: null }
});
// 작업 정보 
const workInfoSchema = new mongoose.Schema({ // Work_Info 스키마
  work_id: { type: String, required: true },
  admin_info: { type: [String], required: true }, // [책임자 이름, 전화번호, 현장주소, 작업정보]
  env_status: { type: String, default: null },
  env_coce: { type: [String], default: null },
  start_time: { type: Date, default: null },
  end_time: { type: Date, default: null }
});

// 작업상태
const workStatusSchema = new mongoose.Schema({ // Work_Status 스키마
  device_id: { type: String, required: true },
  work_id: { type: String, required: true },
  status: { type: Number, default: null },
  work_specifics: { type: String, default: null },
  record_time: { type: Date, default: Date.now() }
});


// 로그인 정보
const accessControlSchema = new mongoose.Schema({ // Access_Control 스키마
  login_id: { type: String, required: true, unique: true },
  login_pw: { type: String, required: true, unique: true },
  auth: { type: Boolean, required: true }
});
// 유해가스 정보
const gasInfoSchema = new mongoose.Schema({ // Gas_Info 스키마
    gas_type: { type: Number, required: true },
    gas_info: { type: String, default: null },
    gas_guide: { type: String, default: null }
});
// 초기 기기점검
const initialDeviceCheckSchema = new mongoose.Schema({ // Initial_deviceCheck 스키마
  admin_id: { type: String, required: true },
  device_id: { type: String, required: true },
  Is_check: { type: Boolean, default: false },
  Is_connect: { type: Boolean, default: false },
  Is_shock: { type: Boolean, default: false },
  Is_help: { type: Boolean, default: false },
  battery: { type: Number, default: 0 },
  Is_camera: { type: Boolean, default: false },
  Is_dark: { type: Boolean, default: false }
});


// 데이터 모델 생성
const workEnv = mongoose.model('Work_EnvData', workEnvDataSchema);
const deviceInfo = mongoose.model('Device_Info', deviceInfoSchema);
const userInfo = mongoose.model('User_Info', userInfoSchema);
const workInfo = mongoose.model('Work_Info', workInfoSchema);
const workStatus = mongoose.model('Work_Status', workStatusSchema);
const accessControl = mongoose.model('Access_Control', accessControlSchema);
const gasInfo = mongoose.model('Gas_Info', gasInfoSchema);
const initialDeviceCheck = mongoose.model('Initial_deviceCheck', initialDeviceCheckSchema);


// 모듈 내보내기
module.exports = {
    workEnv,
    deviceInfo,
    userInfo,
    workInfo,
    workStatus,
    accessControl,
    gasInfo,
    initialDeviceCheck
};
