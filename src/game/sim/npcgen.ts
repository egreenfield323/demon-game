import { Rng } from '../../engine/rng';
import { ARCHETYPES, SKIN_TONES } from '../data/archetypes';
import type { DistrictDef } from '../data/districts';
import { KEYWORDS } from '../data/keywords';
import { TRAITS, type TraitId } from '../data/traits';
import { DAY_COUNT, type NpcDef, type RunState } from './state';

/** Deterministic daily population for a district. Stats scale with run
 * difficulty (day across loops) and the world's softness. */
export function genNpcs(run: RunState, district: DistrictDef, count = district.npcCount): NpcDef[] {
  const rng = new Rng(`${run.seed}:${run.loop}:${run.day}:${district.id}`);
  const out: NpcDef[] = [];
  const usedNames = new Set<string>();

  const difficulty = (run.loop - 1) * DAY_COUNT + run.day;
  const willScale = district.softness * (1 + (difficulty - 1) * 0.12);
  const susScale = district.softness * (1 + (difficulty - 1) * 0.06);

  for (let i = 0; i < count; i++) {
    const arch = ARCHETYPES[rng.pick(district.archetypes)];

    let name = rng.pick(arch.names);
    if (usedNames.has(name)) name = rng.pick(arch.names);
    if (usedNames.has(name)) name = `${name} Jr.`;
    usedNames.add(name);

    const traits = rng.shuffle(arch.traitPool).slice(0, 2) as [TraitId, TraitId];
    const quirk = rng.chance(arch.quirkChance) ? rng.pick(arch.quirkPool) : undefined;

    const desire = rng.pick(arch.desirePool);
    // Ick can never be something they actually crave or resonate with.
    const affinities = new Set(traits.flatMap((t) => TRAITS[t].keywords));
    const ickChoices = arch.ickPool.filter((k) => k !== desire && !affinities.has(k));
    const ick = ickChoices.length
      ? rng.pick(ickChoices)
      : rng.pick(KEYWORDS.filter((k) => k !== desire && !affinities.has(k)));

    let willpower = rng.int(arch.willpower[0], arch.willpower[1]);
    if (traits.some((t) => TRAITS[t].rider === 'willpower-10%')) willpower = Math.round(willpower * 0.9);
    if (quirk === 'DRUNK') willpower = Math.round(willpower * 0.85);
    willpower = Math.min(150, Math.max(12, Math.round(willpower * willScale)));

    let patience = rng.int(arch.patience[0], arch.patience[1]);
    if (traits.some((t) => TRAITS[t].rider === 'patience+2')) patience += 2;

    out.push({
      id: i,
      name,
      archetype: arch.id,
      traits,
      quirk,
      desire,
      ick,
      maxWillpower: willpower,
      susRate: rng.range(arch.susRate[0], arch.susRate[1]) * susScale,
      basePatience: patience,
      // Coins are decoupled from difficulty now — a flat random payout, so no
      // world is "the money world". Scanning still reveals which souls pay more.
      soulValue: rng.int(1, 3),
      skin: rng.pick(SKIN_TONES),
    });
  }

  // One disguised angel may be hiding in the crowd; Demon Vision shows the
  // halo. Pitch one blind and it blows your cover. Likelier in rougher districts.
  const angelChance = 0.18 + district.danger * 0.08;
  if (out.length && rng.chance(angelChance)) {
    out[rng.int(0, out.length - 1)].isAngel = true;
  }

  return out;
}
