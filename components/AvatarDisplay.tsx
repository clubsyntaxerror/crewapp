import { colors } from '@/constants/colors';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AvatarDisplayProps {
  avatarUrl: string | null;
  username: string | null;
  size?: number;
}

export function AvatarDisplay({ avatarUrl, username, size = 32 }: AvatarDisplayProps) {
  const dynamicStyles = {
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    placeholder: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.discord,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    placeholderText: {
      color: colors.textPrimary,
      fontSize: size / 2.3,
      fontWeight: '600' as const,
    },
  };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={dynamicStyles.avatar} />;
  }

  return (
    <View style={dynamicStyles.placeholder}>
      <Text style={dynamicStyles.placeholderText}>
        {username?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}
