/**
 * Skill tricks: every skill a hero is proficient in unlocks one small tray
 * trick in combat. A hero may use one trick per fight (two with any
 * Expertise, more from gear), and each trick at most once per fight.
 *
 * They all reuse the tray primitives the class talents use (nudge, flip,
 * swap with the bag, ghost dice), so the rules stay in one vocabulary.
 */
import type { Skill } from '../engine/types.ts';

export interface SkillTrick {
  name: string;
  text: string;
  needs: 'none' | 'die';
}

export const SKILL_TRICKS: Record<Skill, SkillTrick> = {
  athletics: { name: 'Heave', text: 'Raise a die by 1.', needs: 'die' },
  acrobatics: { name: 'Tumble', text: 'Flip a die (7 − value).', needs: 'die' },
  sleightOfHand: { name: 'Palm', text: 'Swap a die for the next one in the bag.', needs: 'die' },
  stealth: { name: 'Lurk', text: 'Reroll one die for free.', needs: 'die' },
  arcana: { name: 'Attune', text: 'A die becomes your colour (same value).', needs: 'die' },
  history: { name: 'Precedent', text: 'Set a die to the most common value on the tray.', needs: 'die' },
  investigation: { name: 'Deduce', text: 'Swap a die for the best of the next 3 in the bag.', needs: 'die' },
  nature: { name: 'Weathersense', text: 'Reroll every 1 and 2 on the tray for free.', needs: 'none' },
  animalHandling: { name: 'Fetch', text: 'Draw one extra die onto the tray.', needs: 'none' },
  insight: { name: 'Read the Room', text: '+1 reroll this turn.', needs: 'none' },
  medicine: { name: 'Mend', text: 'Clear every jinx on the tray and lift cursed faces.', needs: 'none' },
  perception: { name: 'Spot', text: "A die's face turns Keen (+6 chips).", needs: 'die' },
  religion: { name: 'Prayer', text: 'Your next hand this turn gains +2 Mult.', needs: 'none' },
  survival: { name: 'Make Do', text: 'A die showing 1 or 2 becomes a 5.', needs: 'die' },
  deception: { name: 'Bluff', text: 'A die turns Wild.', needs: 'die' },
  intimidation: { name: 'Menace', text: 'Your next hand this turn gains +1 Mult per living foe.', needs: 'none' },
  performance: { name: 'Showstopper', text: 'Your next hand this turn: ×1.5 Mult if it is a Straight or better.', needs: 'none' },
  persuasion: { name: 'Rally', text: 'Copy a die onto the tray.', needs: 'die' },
};
