export const SAHA_BACKGROUND_LOCATION_TASK = 'SAHA_BACKGROUND_LOCATION_TASK';

export const SHIFT_ACTIVE_KEY = '@saha_shift_active_v1';
export const SHIFT_START_TIME_KEY = '@saha_shift_start_time_v1';
export const SHIFT_DISCLAIMER_CONSENT_KEY = '@saha_shift_disclaimer_consented_v1';
export const LOCATION_BUFFER_KEY = '@saha_location_buffer_v1';
export const LAST_ACCEPTED_LOCATION_KEY = '@saha_last_accepted_location_v1';

// Activity & Thinning Thresholds
export const SPEED_KMH_WALKING_MIN = 1.0;
export const SPEED_KMH_DRIVING_MIN = 15.0;

export const THROTTLE_STILL_MIN_DIST_M = 20;
export const THROTTLE_STILL_MIN_TIME_SEC = 60;

export const THROTTLE_WALKING_MIN_DIST_M = 50;

export const THROTTLE_DRIVING_MIN_DIST_M = 200;
export const THROTTLE_DRIVING_MIN_TIME_SEC = 30;

export const FLUSH_BUFFER_SIZE_THRESHOLD = 20;
export const FLUSH_INTERVAL_MS = 90 * 1000; // 90 seconds — canlı harita tazeliği
export const MAX_BUFFER_SIZE = 500;

export const SHIFT_NOTIFICATION_TITLE = 'Vardiya aktif';
export const SHIFT_NOTIFICATION_BODY = 'Konumunuz rota takibi için kaydediliyor';

export const SHIFT_KVKK_DISCLAIMER_TITLE = 'Vardiya Konum Takibi Bilgilendirmesi';
export const SHIFT_KVKK_DISCLAIMER_MESSAGE =
  'Vardiyayı başlattığınızda saha rota takibi ve ziyaret organizasyonu için arka planda konumunuz kaydedilir.\n\n' +
  '• Konum takibi YALNIZCA vardiya süresince aktiftir.\n' +
  '• Vardiyayı bitirdiğinizde konum kaydı tamamen durur.\n' +
  '• Cihazınız yeniden başlatılsa bile vardiyayı tekrar sizin başlatmanız gerekir.\n\n' +
  'Vardiya takibini başlatmayı onaylıyor musunuz?';
