/**
 * The guided first dungeon: a fixed, hand-built map in the Cinder Vaults that
 * walks a level-1 party through every basic beat once — movement, a fight,
 * treasure, the Boss Sigil and a (gentle) boss — and ends with level 2.
 *
 *            (2,0) boss
 *              │ sigil door
 *            (2,1) Sigil Kiln
 *              │
 *   (1,2) ── (2,2) first fight
 *  treasure    │
 *            (2,3) tunnel
 *              │
 *            (2,4) entrance
 */
import type { DungeonMap, Facing, Room, RoomType } from '../engine/types.ts';
import { key, OPPOSITE } from './generator.ts';

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
  const mk = (k: string, type: RoomType, name: string, text: string, scene: string, extra: Partial<Room> = {}): Room => {
    const [x, y] = k.split(',').map(Number);
    const r: Room = { key: k, x, y, type, name, text, exits: {}, tags: [], art: `scenes/cinder_${scene}`, ...extra };
    rooms[k] = r;
    return r;
  };
  const link = (a: string, dir: Facing, b: string, lock?: 'sigil') => {
    rooms[a].exits[dir] = { to: b, lock };
    rooms[b].exits[OPPOSITE[dir]] = { to: a, lock };
  };

  mk(TUT.entrance, 'entrance', 'Cellar Stair', 'Steps lead down from the Lantern Keep into the training cellar. The Keep keeps it stocked with soot goblins for practice. Mostly.', 'corridor');
  mk(TUT.tunnel, 'corridor', 'Ash Tunnel', 'Ash drifts like grey snow. Somewhere ahead, a goblin is counting stolen dice out loud, badly.', 'corridor');
  mk(TUT.fight, 'combat', 'Smelting Floor', 'Two soot goblins look up from a pile of dice. They do not look pleased to see you.', 'forge',
    { encounter: { monsters: ['sootGoblin', 'sootGoblin'], kind: 'normal', cleared: false } });
  mk(TUT.treasure, 'treasure', "Smith's Hoard", 'A dented strongbox sits under a workbench. Somebody forgot to lock it.', 'vault',
    { loot: { gold: 1, items: ['item'], charm: true, taken: false } });
  mk(TUT.kiln, 'key', 'Sigil Kiln', 'A sigil-key glows on a plinth. The door beyond it is sealed with the same mark.', 'vault', { eventId: 'sigilKey' });
  mk(TUT.boss, 'boss', 'The Practice Forge', 'An old forge-engine, kept running as a sparring partner, lifts its hammer. Today it is set to "gentle".', 'boss',
    { encounter: { monsters: ['forgemaster'], kind: 'boss', cleared: false } });

  link(TUT.entrance, 'N', TUT.tunnel);
  link(TUT.tunnel, 'N', TUT.fight);
  link(TUT.fight, 'W', TUT.treasure);
  link(TUT.fight, 'N', TUT.kiln);
  link(TUT.kiln, 'N', TUT.boss, 'sigil');

  return { width: 5, height: 5, rooms, start: TUT.entrance, bossKey: TUT.boss, criticalPath: [TUT.entrance, TUT.tunnel, TUT.fight, TUT.kiln, TUT.boss] };
}
