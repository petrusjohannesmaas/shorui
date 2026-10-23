import { mockIPC } from '@tauri-apps/api/mocks';

// An in-memory stand-in for tauri-plugin-store, answering the IPC commands
// that LazyStore sends. `others` answers every other command, since a test
// has only one IPC handler. The first `failSaves` saves throw, as a disk the
// store cannot write to does, and record nothing.
export function fakeStore(
  initial: Record<string, unknown> = {},
  others: (cmd: string, args?: unknown) => unknown = () => undefined,
  { failSaves = 0 }: { failSaves?: number } = {},
) {
  const data = new Map<string, unknown>(Object.entries(initial));
  const saves: Record<string, unknown>[] = [];
  const paths: string[] = [];
  let failedSaves = 0;

  mockIPC((cmd, args) => {
    const a = (args ?? {}) as Record<string, unknown>;
    switch (cmd) {
      case 'plugin:store|load':
        paths.push(a.path as string);
        return 1;
      case 'plugin:store|get':
        return [data.get(a.key as string) ?? null, data.has(a.key as string)];
      case 'plugin:store|set':
        data.set(a.key as string, a.value);
        return null;
      case 'plugin:store|save':
        if (failedSaves < failSaves) {
          failedSaves += 1;
          throw new Error('plugin:store|save failed');
        }
        saves.push(Object.fromEntries(data));
        return null;
      default:
        return others(cmd, args);
    }
  });

  return { data, saves, paths };
}
