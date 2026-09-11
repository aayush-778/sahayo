import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GeoPoint } from '@sahayo/shared';
import { brandColors, formatDuration, Text } from '@sahayo/ui-native';

import mapImage from '../../../assets/images/map-patna.png';
import type { MockWorker } from '../../mocks';
import { useAuthStore } from '../../store/auth';
import { metresToFraction, projectToMap } from './mapProjection';

const WORKER_PIN = 28;
const CUSTOMER_PIN = 38;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** One tap of the + or − button. */
const ZOOM_STEP = 1.6;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export interface WorkerMapProps {
  workers: MockWorker[];
  centre: GeoPoint;
  radiusM: number;
  /** Minutes until the nearest worker could arrive. Omitted while unknown. */
  etaMinutes?: number;
  /**
   * Draw the broadcast radius ring. On the booking screen it says "these are
   * the people who can be offered this job"; once one of them has accepted it
   * says nothing, so tracking turns it off.
   */
  showRadius?: boolean;
}

/**
 * The broadcast map: where the customer is, and who is close enough to take
 * the job.
 *
 * A bundled OpenStreetMap raster with pins positioned over it — see
 * `mapProjection.ts` for why there is no map library here and how the swap in
 * Phase 5 stays to one file.
 *
 * ZOOM USES `PanResponder` AND `Animated` FROM REACT NATIVE CORE, not the
 * `react-native-gesture-handler` and `react-native-reanimated` already in the
 * dependency list. Both would give a smoother pinch, but gesture-handler
 * needs a `GestureHandlerRootView` wrapped around the whole app — a change to
 * the root layout affecting every screen — and Reanimated needs its Babel
 * plugin to have been injected, which nothing in this app has yet relied on.
 * That is two unverified pieces of native wiring introduced on the one screen
 * that has to work in front of judges. Core `PanResponder` needs no wiring at
 * all, and this is a single image.
 *
 * The gesture deliberately does NOT claim single-finger drags while the map
 * is at rest, so the page keeps scrolling normally under the customer's
 * thumb. It claims them only once zoomed in, when panning is the only thing a
 * drag on the map could sensibly mean. Two fingers always pinch.
 *
 * EVERY POSITIONED ELEMENT USES AN INLINE STYLE, and this is the exception
 * the house rule allows for. Pin coordinates are computed per worker from
 * latitude and longitude against a measured container width; there is no
 * finite set of Tailwind classes that can express "17.4% from the left, minus
 * half a pin". Colour, radius, border and shadow all stay in `className`.
 *
 * Pins are drawn furthest-first so the nearest worker wins any overlap, and
 * the customer marker is drawn last so nothing covers it.
 */
export function WorkerMap({
  workers,
  centre,
  radiusM,
  etaMinutes,
  showRadius = true,
}: WorkerMapProps) {
  const { t } = useTranslation();
  const locale = useAuthStore((state) => state.language);
  const [size, setSize] = useState(0);

  // Mirrors the animated zoom, but is only updated when a gesture ends or a
  // button is tapped. Driving it every frame would re-render the whole pin
  // field mid-pinch for the sake of two button states.
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const scale = useRef(new Animated.Value(MIN_ZOOM)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const current = useRef({ scale: MIN_ZOOM, x: 0, y: 0 });
  const gesture = useRef({ startDistance: 0, startScale: MIN_ZOOM, startX: 0, startY: 0 });
  const sizeRef = useRef(0);

  /**
   * How far the image may slide before its own edge would come inside the
   * frame. Transforms compose as translate(scale(p)), so this is in screen
   * pixels rather than image pixels.
   */
  function maxOffset(atScale: number): number {
    return ((atScale - 1) * sizeRef.current) / 2;
  }

  function apply(nextScale: number, nextX: number, nextY: number) {
    const bound = maxOffset(nextScale);
    const x = clamp(nextX, -bound, bound);
    const y = clamp(nextY, -bound, bound);

    current.current = { scale: nextScale, x, y };
    scale.setValue(nextScale);
    translateX.setValue(x);
    translateY.setValue(y);
  }

  function zoomBy(factor: number) {
    const nextScale = clamp(current.current.scale * factor, MIN_ZOOM, MAX_ZOOM);
    const bound = maxOffset(nextScale);
    const x = clamp(current.current.x, -bound, bound);
    const y = clamp(current.current.y, -bound, bound);

    current.current = { scale: nextScale, x, y };
    setZoom(nextScale);

    Animated.parallel([
      Animated.timing(scale, { toValue: nextScale, duration: 160, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: x, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: y, duration: 160, useNativeDriver: true }),
    ]).start();
  }

  const responder = useRef(
    PanResponder.create({
      // Let taps through; only movement is ours to interpret.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (event) =>
        event.nativeEvent.touches.length >= 2 || current.current.scale > MIN_ZOOM,

      onPanResponderGrant: () => {
        gesture.current = {
          startDistance: 0,
          startScale: current.current.scale,
          startX: current.current.x,
          startY: current.current.y,
        };
      },

      onPanResponderMove: (event, state) => {
        const touches = event.nativeEvent.touches;

        if (touches.length >= 2) {
          const distance = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );

          // The first two-finger frame only establishes the baseline. Acting
          // on it would snap the map to whatever ratio the second finger
          // happened to land at.
          if (gesture.current.startDistance === 0) {
            gesture.current.startDistance = distance;
            gesture.current.startScale = current.current.scale;
            return;
          }

          apply(
            clamp(
              gesture.current.startScale * (distance / gesture.current.startDistance),
              MIN_ZOOM,
              MAX_ZOOM,
            ),
            current.current.x,
            current.current.y,
          );
          return;
        }

        apply(
          current.current.scale,
          gesture.current.startX + state.dx,
          gesture.current.startY + state.dy,
        );
      },

      onPanResponderRelease: () => {
        gesture.current.startDistance = 0;
        setZoom(current.current.scale);
        // Fully zoomed out, any leftover offset would show a gap at an edge.
        if (current.current.scale <= MIN_ZOOM) apply(MIN_ZOOM, 0, 0);
      },
      onPanResponderTerminate: () => {
        gesture.current.startDistance = 0;
        setZoom(current.current.scale);
      },
    }),
  ).current;

  function onLayout(event: LayoutChangeEvent) {
    sizeRef.current = event.nativeEvent.layout.width;
    setSize(event.nativeEvent.layout.width);
  }

  const centreAt = projectToMap(centre);
  const radiusPx = metresToFraction(radiusM) * size;

  const ordered = [...workers].sort((a, b) => b.distanceM - a.distanceM);

  const canZoomIn = zoom < MAX_ZOOM - 0.001;
  const canZoomOut = zoom > MIN_ZOOM + 0.001;

  return (
    <View
      className="aspect-square w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-surface"
      onLayout={onLayout}
    >
      <Animated.View
        className="h-full w-full"
        accessibilityRole="image"
        accessibilityLabel={t('booking.now.mapLabel', { workers: workers.length })}
        style={{ transform: [{ translateX }, { translateY }, { scale }] }}
        {...responder.panHandlers}
      >
        <Image source={mapImage} className="absolute h-full w-full" resizeMode="cover" />

        {size > 0 ? (
          <>
            {/* The broadcast radius. A ring rather than a filled disc — a tint
                over the map would wash out exactly the streets that make it
                read as a real place. */}
            {showRadius ? (
            <View
              pointerEvents="none"
              className="absolute rounded-full border-2 border-brand-primary/50 bg-brand-primary/5"
              style={{
                left: centreAt.x * size - radiusPx,
                top: centreAt.y * size - radiusPx,
                width: radiusPx * 2,
                height: radiusPx * 2,
              }}
            />
            ) : null}

            {ordered.map((worker) => {
              const point = worker.profile.lastLocation;
              if (!point) return null;
              const at = projectToMap(point);

              return (
                <View
                  key={worker.profile.id}
                  className="absolute items-center justify-center rounded-full border-2 border-white bg-brand-primary shadow"
                  style={{
                    left: at.x * size - WORKER_PIN / 2,
                    top: at.y * size - WORKER_PIN / 2,
                    width: WORKER_PIN,
                    height: WORKER_PIN,
                  }}
                >
                  <Ionicons name="briefcase" size={13} color={brandColors.surface} />
                </View>
              );
            })}

            <View
              className="absolute items-center justify-center rounded-full border-4 border-white bg-brand-danger shadow-lg"
              style={{
                left: centreAt.x * size - CUSTOMER_PIN / 2,
                top: centreAt.y * size - CUSTOMER_PIN / 2,
                width: CUSTOMER_PIN,
                height: CUSTOMER_PIN,
              }}
            >
              <Ionicons name="person" size={18} color={brandColors.surface} />
            </View>

            {/* Centred on the container rather than measured and offset,
                because the image was cropped around the customer's own pin —
                `projectToMap(centre).x` is exactly 0.5. */}
            {etaMinutes === undefined ? null : (
              <View
                pointerEvents="none"
                className="absolute w-full items-center"
                style={{ top: centreAt.y * size + CUSTOMER_PIN / 2 + 6 }}
              >
                <View className="rounded-lg bg-brand-navy px-3 py-1.5">
                  <Text weight="bold" className="text-center text-xs text-white">
                    {t('booking.now.eta', { duration: formatDuration(etaMinutes, locale) })}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : null}
      </Animated.View>

      {/* The controls sit OUTSIDE the transformed view so they keep their own
          size and position while the map moves under them. */}
      <View className="absolute right-2 top-2 overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
        <Pressable
          className="h-9 w-9 items-center justify-center"
          onPress={() => zoomBy(ZOOM_STEP)}
          disabled={!canZoomIn}
          accessibilityRole="button"
          accessibilityLabel={t('booking.now.zoomIn')}
          accessibilityState={{ disabled: !canZoomIn }}
        >
          <Ionicons
            name="add"
            size={20}
            color={canZoomIn ? brandColors.navy : brandColors.border}
          />
        </Pressable>
        <View className="h-px bg-brand-border" />
        <Pressable
          className="h-9 w-9 items-center justify-center"
          onPress={() => zoomBy(1 / ZOOM_STEP)}
          disabled={!canZoomOut}
          accessibilityRole="button"
          accessibilityLabel={t('booking.now.zoomOut')}
          accessibilityState={{ disabled: !canZoomOut }}
        >
          <Ionicons
            name="remove"
            size={20}
            color={canZoomOut ? brandColors.navy : brandColors.border}
          />
        </Pressable>
      </View>

      {/* Required by the licence on the tiles. Not translated: it is a legal
          credit and a proper noun, not a display string.

          `text-xs`, not an arbitrary `text-[9px]`: our `Text` decides whether
          to apply a default size by matching against a set of named size
          classes, and an arbitrary one is not in it — it would be read as a
          colour, and `text-base` would be applied on top. */}
      <View className="absolute bottom-0 right-0 rounded-tl-lg bg-white/80 px-1.5 py-0.5">
        <Text className="text-xs text-brand-muted">© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}
