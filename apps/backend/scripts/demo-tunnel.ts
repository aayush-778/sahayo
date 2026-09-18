/**
 * Puts the backend on each phone's own localhost, over USB.
 *
 *   pnpm demo:tunnel
 *
 * `adb reverse tcp:4000 tcp:4000` makes port 4000 on the phone mean port 4000 on this
 * laptop, with no network in between. That is why the apps default to
 * http://localhost:4000: venue wifi usually has AP isolation, which blocks a phone from
 * reaching the laptop at all, and this route cannot be blocked because it is the cable.
 *
 * The tunnel does not survive unplugging the phone, the cable being knocked, or the phone
 * rebooting — so run this again after any of those. It is the first line of the checklist.
 */
import { execFileSync } from 'node:child_process';

const PORT = process.env.PORT ?? '4000';

function adb(args: string[]): string {
  return execFileSync('adb', args, { encoding: 'utf8' }).trim();
}

function devices(): Array<{ serial: string; state: string }> {
  return adb(['devices'])
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial: serial ?? '', state: state ?? '' };
    })
    .filter((device) => device.serial);
}

function main(): void {
  let attached;
  try {
    attached = devices();
  } catch {
    throw new Error('adb is not on the PATH. Install Android platform-tools, or add them to PATH, then try again.');
  }

  if (attached.length === 0) {
    throw new Error('No phone is attached. Plug both phones in, turn on USB debugging, and accept the prompt on each screen.');
  }

  console.log('');
  let ready = 0;
  for (const device of attached) {
    if (device.state !== 'device') {
      console.log(`  ${device.serial.padEnd(24)} ${device.state === 'unauthorized' ? 'not authorised — accept the USB debugging prompt on the phone' : device.state}`);
      continue;
    }
    try {
      adb(['-s', device.serial, 'reverse', `tcp:${PORT}`, `tcp:${PORT}`]);
      console.log(`  ${device.serial.padEnd(24)} localhost:${PORT} on this phone is now this laptop`);
      ready += 1;
    } catch (error) {
      console.log(`  ${device.serial.padEnd(24)} failed: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    }
  }

  console.log(`\n  ${ready} of ${attached.length} phone${attached.length === 1 ? '' : 's'} tunnelled.`);
  if (ready < 2) console.log('  The demo needs two: the customer and the worker.');
  console.log('  Re-run this after any unplug, and check the apps show no offline banner.\n');
  if (ready === 0) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
