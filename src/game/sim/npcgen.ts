import { Rng } from '../../engine/rng';
import { ARCHETYPES, SKIN_TONES } from '../data/archetypes';
import type { DistrictDef } from '../data/districts';
import { KEYWORDS } from '../data/keywords';
import { TRAITS, type TraitId } from '../data/traits';
import type { NpcDef, RunState } from './state';

/** Deterministic daily population for a district. */
export function genNpcs(run: RunState, district: DistrictDef): NpcDef[] {
  const rng = new Rng(`${run.seed}:${run.day}:${district.id}`);
  const out: NpcDef[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < district.npcCount; i++) {
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
      susRate: rng.range(arch.susRate[0], arch.susRate[1]),
      basePatience: patience,
      soulValue: rng.int(arch.soulValue[0], arch.soulValue[1]),
      skin: rng.pick(SKIN_TONES),
    });
  }
  return out;
}
