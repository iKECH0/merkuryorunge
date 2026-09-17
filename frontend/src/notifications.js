import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const DAILY_REMINDER_ID = 2200;
const DAILY_REMINDER_CHANNEL_ID = 'daily-study-reminders';

let setupPromise = null;

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

const requestExactAlarmAccess = async () => {
  if (Capacitor.getPlatform() !== 'android') return;

  const exactAlarmStatus = await LocalNotifications.checkExactNotificationSetting();
  if (exactAlarmStatus.exact_alarm !== 'granted') {
    await LocalNotifications.changeExactNotificationSetting();
  }
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
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    try {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }

      if (permission.display !== 'granted') return { status: 'notification-permission-denied' };

      await createAndroidChannel();
      if (askForExactAlarm) await requestExactAlarmAccess();
      await scheduleReminder();

      return { status: 'scheduled' };
    } catch (error) {
      console.error('Günlük bildirim kurulamadı:', error);
      return { status: 'error' };
    } finally {
      setupPromise = null;
    }
  })();

  return setupPromise;
};
