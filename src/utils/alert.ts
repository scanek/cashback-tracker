import { Alert, Platform } from 'react-native';

export const confirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Удалить',
  cancelText = 'Отмена'
) => {
  if (Platform.OS === 'web') {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`${title}\n\n${message}`)
      : true;
    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
};

export const showNotification = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  } else {
    Alert.alert(title, message);
  }
};
