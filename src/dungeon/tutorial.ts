/**
 * The guided first dungeon: a fixed, hand-built map in the cellar under the Keep that
 * walks a level-1 party through every basic beat once — movement, a fight,
 * treasure, the Boss Sigil and a (gentle) boss — and ends with level 2.
 *
 *            (2,0) boss
 *              │ sigil door
 *            (2,1) Sigil Shelf
 *              │
 *   (1,2) ── (2,2) first fight
 *  treasure    │
 *            (2,3) tunnel
 *              │
 *            (2,4) entrance
 */
import type { DungeonMap, Facing, Room, RoomType } from '../engine/types.ts';
import { key, OPPOSITE } from './generator.ts';
import { ref, resolveRef } from '../i18n/index.ts';

export const TUTORIAL_SEED = 'TUTORIAL';

/** Room keys the tutorial script points at. */
export const TUT = {
  entrance: key(2, 4),
  tunnel: key(2, 3),
  fight: key(2, 2),
  treasure: key(1, 2),
  kiln: key(2, 1),
  boss: key(2, 0),
} as const;

export function buildTutorialMap(): DungeonMap {
  const rooms: Record<string, Room> = {};
  // Words: game.json → tutorialRooms.<x,y>.
  const mk = (k: string, type: RoomType, scene: string, extra: Partial<Room> = {}): Room => {
    const [x, y] = k.split(',').map(Number);
    const at = (f: string) => ref('game', ['tutorialRooms', k, f]);
    const r: Room = { key: k, x, y, type, name: resolveRef(at('name')), text: resolveRef(at('text')), nameRef: at('name'), textRefs: [at('text')], exits: {}, tags: [], art: `scenes/cellar_${scene}`, ...extra };
    rooms[k] = r;
    return r;
  };
  const link = (a: string, dir: Facing, b: string, lock?: 'sigil') => {
    rooms[a].exits[dir] = { to: b, lock };
    rooms[b].exits[OPPOSITE[dir]] = { to: a, lock };
  };

  mk(TUT.entrance, 'entrance', 'stair');
  mk(TUT.tunnel, 'corridor', 'corridor');
  mk(TUT.fight, 'combat', 'floor',
    { encounter: { monsters: ['cellarRat', 'cellarRat'], kind: 'normal', cleared: false } });
  mk(TUT.treasure, 'treasure', 'store',
    { loot: { gold: 1, items: ['item'], charm: true, taken: false } });
  mk(TUT.kiln, 'key', 'sigil', { eventId: 'sigilKey' });
  mk(TUT.boss, 'boss', 'boss',
    { encounter: { monsters: ['oldCooper'], kind: 'boss', cleared: false } });

  link(TUT.entrance, 'N', TUT.tunnel);
  link(TUT.tunnel, 'N', TUT.fight);
  link(TUT.fight, 'W', TUT.treasure);
  link(TUT.fight, 'N', TUT.kiln);
  link(TUT.kiln, 'N', TUT.boss, 'sigil');

  return { width: 5, height: 5, rooms, start: TUT.entrance, bossKey: TUT.boss, criticalPath: [TUT.entrance, TUT.tunnel, TUT.fight, TUT.kiln, TUT.boss] };
}
