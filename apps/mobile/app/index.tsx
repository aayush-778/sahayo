import { Button, Text, View } from 'react-native';
import { router } from 'expo-router';
import { UserRole } from '@sahakar/shared';

export default function RolePicker() {
  return (
    <View>
      <Text>Role Picker</Text>
      <Button title={UserRole.CUSTOMER} onPress={() => router.push('/home')} />
      <Button title={UserRole.WORKER} onPress={() => router.push('/dashboard')} />
    </View>
  );
}
