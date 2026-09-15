import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GeoPoint } from '@sahayo/shared';
import { Text, useThemeColors } from '@sahayo/ui-native';

import mapImage from '../../assets/images/map-patna.png';
import { projectToMap } from './mapProjection';

const PIN = 30;
/** Keeps a pin fully on screen when its point lies beyond the image's edge. */
const EDGE = PIN / 2 + 6;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Where the worker is, and where the job is, on the bundled Patna basemap.
 *
 * A 16:9 window onto the square image: the image is laid out at the window's
 * width and centred, and pins are projected with the same offset, so they sit
 * on the streets they belong to. A job beyond the image's edge keeps its pin
 * on the edge, in the right direction, rather than vanishing.
 *
 * No zoom or pan: this card shows two points, not a field of workers.
 *
 * Positions are inline styles — the one thing a className cannot express.
 */
export function JobMap({
  worker,
  customer,
  label,
}: {
  worker?: GeoPoint;
  customer: GeoPoint;
  /** A caption over the map, e.g. distance and ETA. */
  label?: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [box, setBox] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) =>
    setBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });

  const side = Math.max(box.width, box.height);
  const offsetX = (side - box.width) / 2;
  const offsetY = (side - box.height) / 2;

  const place = (point: GeoPoint) => {
    const at = projectToMap(point);
    return {
      left: clamp(at.x * side - offsetX, EDGE, box.width - EDGE) - PIN / 2,
      top: clamp(at.y * side - offsetY, EDGE, box.height - EDGE) - PIN / 2,
    };
  };

  return (
    <View
      className="aspect-video w-full overflow-hidden rounded-2xl border border-worker-border bg-worker-primary-tint"
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={t('worker.active.mapLabel')}
    >
      {side > 0 ? (
        <>
          <Image
            source={mapImage}
            resizeMode="cover"
            style={{ position: 'absolute', width: side, height: side, left: -offsetX, top: -offsetY }}
          />
          {worker ? (
            <View
              className="absolute items-center justify-center rounded-full border-2 border-white bg-worker-primary"
              style={{ ...place(worker), width: PIN, height: PIN }}
            >
              <Ionicons name="bicycle" size={16} color={colors.onPrimary} />
            </View>
          ) : null}
          <View
            className="absolute items-center justify-center rounded-full border-2 border-white bg-worker-danger"
            style={{ ...place(customer), width: PIN, height: PIN }}
          >
            <Ionicons name="home" size={15} color={colors.onPrimary} />
          </View>
          {label ? (
            <View className="absolute left-2 top-2 rounded-lg bg-worker-ink px-2.5 py-1">
              <Text weight="bold" className="text-xs text-white">
                {label}
              </Text>
            </View>
          ) : null}
          {/* Required by the tile licence. A legal credit and a proper noun — not translated. */}
          <View className="absolute bottom-0 right-0 rounded-tl-lg bg-white/80 px-1.5 py-0.5">
            <Text className="text-xs text-worker-muted">© OpenStreetMap contributors</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
