import React from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeViewProps {
  value: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 180,
  backgroundColor = '#FFFFFF',
  color = '#000000',
}) => {
  if (!value) return null;

  try {
    return (
      <View style={[styles.container, { width: size + 16, height: size + 16, backgroundColor }]}>
        <QRCode
          value={value}
          size={size}
          backgroundColor={backgroundColor}
          color={color}
        />
      </View>
    );
  } catch {
    // Fallback if SVG fails
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      value
    )}`;
    return (
      <View style={[styles.container, { width: size + 16, height: size + 16, backgroundColor }]}>
        <Image source={{ uri: qrUrl }} style={{ width: size, height: size }} />
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
