import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SecurityService } from '../services/security';
import { Lock, Unlock, ShieldAlert, KeyRound, Check, Delete } from 'lucide-react-native';

interface PinLockScreenProps {
  mode?: 'unlock' | 'setup';
  onSuccess: () => void;
  onCancel?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  mode = 'unlock',
  onSuccess,
  onCancel,
}) => {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isShake, setIsShake] = useState(false);

  // Check initial lockout timer
  useEffect(() => {
    let timer: any = null;
    const checkLockout = async () => {
      const remaining = await SecurityService.getLockoutRemainingSeconds();
      setLockoutSeconds(remaining);
      if (remaining > 0) {
        setErrorMsg(`Слишком много неверных попыток. Подождите ${remaining} сек.`);
      }
    };
    checkLockout();

    timer = setInterval(async () => {
      const remaining = await SecurityService.getLockoutRemainingSeconds();
      setLockoutSeconds(remaining);
      if (remaining <= 0 && lockoutSeconds > 0) {
        setErrorMsg(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Handle number click
  const handleDigitPress = (digit: string) => {
    if (lockoutSeconds > 0) return;
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);

      // Auto-submit on 4 or 6 digits
      if (nextPin.length === 4 && mode === 'unlock') {
        attemptUnlock(nextPin);
      }
    }
  };

  const handleDeletePress = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const handleClearPress = () => {
    setPin('');
    setErrorMsg(null);
  };

  const triggerShake = () => {
    setIsShake(true);
    if (Platform.OS !== 'web') {
      try { Vibration.vibrate(200); } catch {}
    }
    setTimeout(() => setIsShake(false), 500);
  };

  const attemptUnlock = async (pinToTest: string) => {
    const res = await SecurityService.verifyPin(pinToTest);
    if (res.success) {
      onSuccess();
    } else {
      triggerShake();
      setPin('');
      setErrorMsg(res.errorMessage || 'Неверный PIN-код');
      if (res.lockoutSeconds && res.lockoutSeconds > 0) {
        setLockoutSeconds(res.lockoutSeconds);
      }
    }
  };

  const handleSetupSubmit = async () => {
    if (pin.length < 4) {
      setErrorMsg('PIN-код должен быть не менее 4 цифр');
      triggerShake();
      return;
    }

    if (setupStep === 'create') {
      setConfirmPin(pin);
      setPin('');
      setSetupStep('confirm');
      setErrorMsg(null);
    } else {
      // Confirm step
      if (pin !== confirmPin) {
        setErrorMsg('PIN-коды не совпадают! Попробуйте снова.');
        triggerShake();
        setPin('');
        setConfirmPin('');
        setSetupStep('create');
        return;
      }

      try {
        await SecurityService.setPin(pin);
        onSuccess();
      } catch (err: any) {
        setErrorMsg(err.message || 'Ошибка установки PIN');
      }
    }
  };

  const isLockedOut = lockoutSeconds > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header / Lock Icon */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isLockedOut ? '#EF444420' : colors.card,
              borderColor: isLockedOut ? '#EF4444' : colors.cardBorder,
            },
          ]}
        >
          {isLockedOut ? (
            <ShieldAlert size={36} color="#EF4444" />
          ) : mode === 'setup' ? (
            <KeyRound size={36} color={colors.accent} />
          ) : (
            <Lock size={36} color={colors.accent} />
          )}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {mode === 'setup'
            ? setupStep === 'create'
              ? 'Установите PIN-код'
              : 'Повторите PIN-код'
            : 'Мои Кэшбеки'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isLockedOut
            ? `Блокировка ввода: ${lockoutSeconds} сек.`
            : mode === 'setup'
            ? setupStep === 'create'
              ? 'Защита от несанкционированного доступа к вашим картам'
              : 'Введите этот же PIN-код для подтверждения'
            : 'Введите PIN-код для доступа к приложению'}
        </Text>
      </View>

      {/* PIN Dots Indicator */}
      <View
        style={[
          styles.dotsContainer,
          isShake && { transform: [{ translateX: 8 }] },
        ]}
      >
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: isLockedOut
                    ? '#EF4444'
                    : filled
                    ? colors.accent
                    : colors.inputBorder,
                  backgroundColor: filled
                    ? isLockedOut
                      ? '#EF4444'
                      : colors.accent
                    : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      {/* Error Message */}
      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Keypad */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['clear', '0', 'del'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((item) => {
              if (item === 'clear') {
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.keyButtonSpecial}
                    onPress={handleClearPress}
                    disabled={isLockedOut || pin.length === 0}
                  >
                    <Text style={[styles.keySpecialText, { color: colors.textSecondary }]}>
                      Сброс
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (item === 'del') {
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.keyButtonSpecial}
                    onPress={handleDeletePress}
                    disabled={isLockedOut || pin.length === 0}
                  >
                    <Delete size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.keyButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      opacity: isLockedOut ? 0.4 : 1,
                    },
                  ]}
                  onPress={() => handleDigitPress(item)}
                  disabled={isLockedOut}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.keyDigitText, { color: colors.textPrimary }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Setup action buttons or Unlock submit */}
      <View style={styles.footerActions}>
        {mode === 'setup' && (
          <View style={{ flexDirection: 'row', gap: 10, width: '100%', maxWidth: 300 }}>
            {onCancel && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
                onPress={onCancel}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Отмена</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: pin.length >= 4 ? colors.accent : colors.cardBorder,
                  flex: 1,
                },
              ]}
              disabled={pin.length < 4}
              onPress={handleSetupSubmit}
            >
              <Check size={18} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={{ color: '#0F172A', fontWeight: '800' }}>
                {setupStep === 'create' ? 'Далее' : 'Сохранить'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'unlock' && pin.length >= 4 && !isLockedOut && (
          <TouchableOpacity
            style={[styles.manualSubmitBtn, { backgroundColor: colors.accent }]}
            onPress={() => attemptUnlock(pin)}
          >
            <Unlock size={18} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={{ color: '#0F172A', fontWeight: '800' }}>Войти</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
    height: 30,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorContainer: {
    backgroundColor: '#EF444415',
    borderColor: '#EF444440',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: 320,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  keyDigitText: {
    fontSize: 26,
    fontWeight: '700',
  },
  keyButtonSpecial: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySpecialText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerActions: {
    marginTop: 24,
    alignItems: 'center',
    minHeight: 44,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitBtn: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
