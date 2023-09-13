const mongoose = require('mongoose');


// 유해가스 데이터
const workGasDataSchema = new mongoose.Schema({ // Work_GasDATA 테이블 스키마
    device_id: { type: String, required: true },
    work_id: { type: String, required: true },
    O2: { type: Number, default: null },
    H2S: { type: Number, default: null },
    CO: { type: Number, default: null },
    NO2: { type: Number, default: null },
    NH3: { type: Number, default: null },
    record_time: { type: Date, default: null },
    elapsed_time: { type: Number, default: null },
});
// 온습도 데이터
const workTempDataSchema = new mongoose.Schema({ // Work_tempDATA 테이블 스키마
    device_id: { type: String, required: true },
    work_id: { type: String, required: true },
    record_time: { type: Date, default: null },
    env_temp: { type: Number, default: null },
    env_humid: { type: Number, default: null },
    env_discomfort: { type: Number, default: null },
});
// 작업상태 데이터
const workStatusSchema = new mongoose.Schema({ // Work_Status 테이블 스키마
    device_id: { type: String, required: true },
    work_id: { type: String, required: true },
    status: { type: Number, default: null },
    record_time: { type: Date, default: null },
    work_specifics: { type: String, default: null },
});


// 작업환경 정보
const workEnvironmentSchema = new mongoose.Schema({ // Work_Environment 테이블 스키마
    work_id: { type: String, required: true },
    admin_id: { type: String, default: null },
    user_list: { type: [String], default: null },
    env_status: { type: [String], default: null },
    env_code: { type: [String], default: null },
    env_specifics: { type: String, default: null },
    start_time: { type: Date, default: null },
    end_time: { type: Date, default: null },
    gas_type: { type: Number, required: true },
    device_id: { type: String, required: true },
});
// 유해가스 정보
const gasInformationSchema = new mongoose.Schema({ // gas_infomation 테이블 스키마
    gas_type: { type: Number, required: true },
    gas_info: { type: String, default: null },
    gas_guide: { type: String, default: null },
});


// 작업기기 정보
const deviceInfoSchema = new mongoose.Schema({ // Device_Info 테이블 스키마
  device_id: { type: String, required: true, unique: true },
  user_id: { type: String, default: null },
  user_name: { type: String, default: null },
  user_birth: { type: String, default: null },
  user_health: { type: String, default: null },
});


// 초기 기기점검
const initialDeviceCheckSchema = new mongoose.Schema({ // Initial_deviceCheck 테이블 스키마
  admin_id: { type: String, required: true },
  device_id: { type: String, required: true },
  Is_check: { type: Boolean, default: null },
  Is_connect: { type: Boolean, default: null },
  Is_shock: { type: Boolean, default: null },
  Is_help: { type: Boolean, default: null },
  battery: { type: Number, default: null },
  Is_camera: { type: Boolean, default: null },
  Is_dark: { type: Boolean, default: null },
});


// 데이터 모델 생성
const WorkGasData = mongoose.model('Work_GasDATA', workGasDataSchema);
const WorkTempData = mongoose.model('Work_tempDATA', workTempDataSchema);
const WorkStatus = mongoose.model('Work_Status', workStatusSchema);

const WorkEnvironment = mongoose.model('Work_Environment', workEnvironmentSchema);
const GasInformation = mongoose.model('gas_infomation', gasInformationSchema);

const DeviceInfo = mongoose.model('Device_Info', deviceInfoSchema);

const InitialDeviceCheck = mongoose.model('Initial_deviceCheck', initialDeviceCheckSchema);


// 모듈 내보내기
module.exports = {
    WorkGasData,
    WorkTempData,
    WorkStatus,
    WorkEnvironment,
    GasInformation,
    DeviceInfo,
    InitialDeviceCheck
};
