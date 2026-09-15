import { TextInput, View } from 'react-native';
import { Text } from '@sahayo/ui-native';

/**
 * A short numeric code as one box per digit.
 *
 * One real TextInput sits invisibly over the boxes, so the phone's number pad,
 * paste, and SMS autofill all work as they would in a plain field — the boxes
 * only draw what it holds. Each box is 48×56.
 */
export function CodeInput({
  value,
  onChange,
  length,
  label,
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  length: number;
  /** Already translated; read by screen readers. */
  label: string;
  error?: boolean;
}) {
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');
  const cursor = Math.min(value.length, length - 1);

  return (
    <View>
      <View className="flex-row justify-center gap-3" importantForAccessibility="no-hide-descendants">
        {digits.map((digit, index) => (
          <View
            key={index}
            className={`h-14 w-12 items-center justify-center rounded-xl border-2 bg-worker-surface ${
              error ? 'border-worker-danger' : index === cursor ? 'border-worker-primary' : 'border-worker-outline'
            }`}
          >
            <Text weight="bold" className="text-2xl text-worker-ink">
              {digit}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        className="absolute inset-0 opacity-0"
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        accessibilityLabel={label}
      />
    </View>
  );
}
