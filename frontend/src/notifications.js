import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const DAILY_REMINDER_ID = 2200;
const DAILY_REMINDER_CHANNEL_ID = 'daily-study-reminders';

let setupQueue = Promise.resolve();

const createAndroidChannel = async () => {
  if (Capacitor.getPlatform() !== 'android') return;

  await LocalNotifications.createChannel({
    id: DAILY_REMINDER_CHANNEL_ID,
    name: 'Günlük Çalışma Hatırlatmaları',
    description: 'Her akşam çalışma raporunu hatırlatır.',
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#06B6D4'
  });
};

const ensureExactAlarmAccess = async ({ askForExactAlarm }) => {
  if (Capacitor.getPlatform() !== 'android') return true;

  let exactAlarmStatus = await LocalNotifications.checkExactNotificationSetting();
  if (exactAlarmStatus.exact_alarm !== 'granted' && askForExactAlarm) {
    await LocalNotifications.changeExactNotificationSetting();
    exactAlarmStatus = await LocalNotifications.checkExactNotificationSetting();
  }

  return exactAlarmStatus.exact_alarm === 'granted';
};

const scheduleReminder = async () => {
  const pending = await LocalNotifications.getPending();
  const existingReminder = pending.notifications.find(({ id }) => id === DAILY_REMINDER_ID);

  if (existingReminder) {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_ID,
        title: 'Merkür Yörünge Hatırlatması',
        body: 'Saat 22:00! Günün raporunu girdin mi? Hadi hemen kaydet! 🚀',
        channelId: DAILY_REMINDER_CHANNEL_ID,
        sound: 'default',
        isExactNotification: true,
        isExactMandatory: true,
        schedule: {
          on: { hour: 22, minute: 0, second: 0 },
          repeats: true,
          allowWhileIdle: true
        },
        extra: { destination: 'daily-report' }
      }
    ]
  });
};

export const setupDailyReminder = async ({ askForExactAlarm = true } = {}) => {
  if (!Capacitor.isNativePlatform()) return { status: 'web' };

  const setup = async () => {
    try {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }

      if (permission.display !== 'granted') return { status: 'notification-permission-denied' };

      await createAndroidChannel();
      const hasExactAlarmAccess = await ensureExactAlarmAccess({ askForExactAlarm });
      if (!hasExactAlarmAccess) {
        return { status: 'exact-alarm-permission-denied' };
      }

      await scheduleReminder();

      return { status: 'scheduled' };
    } catch (error) {
      console.error('Günlük bildirim kurulamadı:', error);
      return { status: 'error' };
    }
  };

  // Permission settings temporarily background the app. Queue the resume call so
  // the exact alarm is checked and scheduled again after the user returns.
  setupQueue = setupQueue.then(setup, setup);
  return setupQueue;
};
