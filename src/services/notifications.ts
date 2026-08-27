import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Safe dynamic notifications handler
let Notifications: any = null;

try {
  // Only import and initialize notifications if not in standard Expo Go Android environment that disallows it
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  // Gracefully ignored in Expo Go
}

export class NotificationService {
  static isExpoGo(): boolean {
    return (
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo'
    );
  }

  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web' || !Notifications) return false;

    try {
      if (this.isExpoGo() && Platform.OS === 'android') {
        // In Expo Go on Android (SDK 53+), remote push notifications are disabled by Expo
        return true;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Notifications permission error', e);
      return false;
    }
  }

  static async scheduleMonthlyReminder(): Promise<void> {
    if (Platform.OS === 'web' || !Notifications) return;

    try {
      if (this.isExpoGo() && Platform.OS === 'android') {
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 Новый месяц — новый кэшбэк!',
          body: 'Зайдите в банковские приложения, выберите категории и загрузите скриншоты в Cashback Hub, чтобы получать максимальную выгоду.',
          sound: true,
        },
        trigger: {
          repeats: true,
          day: 1,
          hour: 10,
          minute: 0,
        } as any,
      });
    } catch (e) {
      console.warn('Failed to schedule monthly reminder in current environment', e);
    }
  }

  static async cancelMonthlyReminder(): Promise<void> {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Failed to cancel notifications', e);
    }
  }

  static async sendTestNotification(): Promise<void> {
    if (Platform.OS === 'web' || !Notifications || (this.isExpoGo() && Platform.OS === 'android')) {
      alert('Уведомление: «💳 Новый месяц — новый кэшбэк! Не забудьте проверить категории в банках»');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 Проверка уведомления',
          body: 'Напоминания активны! Каждое 1-е число месяца вы получите пуш для обновления категорий кэшбэка.',
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      alert('Уведомление: «💳 Новый месяц — новый кэшбэк! Не забудьте проверить категории в банках»');
    }
  }
}
