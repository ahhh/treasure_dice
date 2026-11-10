/**
 * Skill tricks: every skill a hero is proficient in unlocks one small tray
 * trick in combat. A hero may use one trick per fight (two with any
 * Expertise, more from gear), and each trick at most once per fight.
 *
 * They all reuse the tray primitives the class talents use (nudge, flip,
 * swap with the bag, ghost dice), so the rules stay in one vocabulary.
 */
import type { Skill } from '../engine/types.ts';
import { textTable } from '../i18n/index.ts';

export interface SkillTrick {
  name: string;
  text: string;
  needs: 'none' | 'die';
}

export const SKILL_TRICKS = textTable<Record<Skill, SkillTrick>, 'name' | 'text'>('game', ['skillTricks'], {
  athletics: { needs: 'die' },
  acrobatics: { needs: 'die' },
  sleightOfHand: { needs: 'die' },
  stealth: { needs: 'die' },
  arcana: { needs: 'die' },
  history: { needs: 'die' },
  investigation: { needs: 'die' },
  nature: { needs: 'none' },
  animalHandling: { needs: 'none' },
  insight: { needs: 'none' },
  medicine: { needs: 'none' },
  perception: { needs: 'die' },
  religion: { needs: 'none' },
  survival: { needs: 'die' },
  deception: { needs: 'die' },
  intimidation: { needs: 'none' },
  performance: { needs: 'none' },
  persuasion: { needs: 'die' },
});
