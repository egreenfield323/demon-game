import type { Keyword } from './keywords';
import type { QuirkId, TraitId } from './traits';

/** Human archetypes. Stats are [min, max] ranges rolled at generation. */

export type ArchetypeId =
  | 'widow'
  | 'retiree'
  | 'nurse'
  | 'artist'
  | 'barfly'
  | 'analyst'
  | 'founder'
  | 'cryptobro';

export interface ArchetypeBarks {
  idle: string[];
  neutral: string[];
  receptive: string[];
  wary: string[];
  offended: string[];
  sign: string;
  flee: string;
  bored: string;
}

export interface ArchetypeDef {
  id: ArchetypeId;
  label: string;
  names: string[];
  traitPool: TraitId[];
  desirePool: Keyword[];
  ickPool: Keyword[];
  quirkPool: QuirkId[];
  quirkChance: number;
  willpower: [number, number];
  susRate: [number, number];
  patience: [number, number];
  soulValue: [number, number];
  /** hair / clothes / pants / accent. Skin tone rolled per-NPC. */
  palette: { h: string; c: string; p: string; t: string };
  barks: ArchetypeBarks;
}

export const SKIN_TONES = ['#e8b890', '#c89068', '#a06848', '#f0c8a0', '#8a5638'];

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  widow: {
    id: 'widow',
    label: 'Widowed Pensioner',
    names: ['Edith', 'Harold', 'Margaret', 'Walter', 'Doris', 'Stanley'],
    traitPool: ['LONELY', 'GRIEVING', 'NOSTALGIC', 'INSECURE'],
    desirePool: ['LOVE', 'LEGACY', 'COMFORT'],
    ickPool: ['WEALTH', 'POWER'],
    quirkPool: ['DEVOUT'],
    quirkChance: 0.35,
    willpower: [35, 50],
    susRate: [0.75, 0.9],
    patience: [7, 9],
    soulValue: [1, 2],
    palette: { h: '#cfd2d6', c: '#7a5d8a', p: '#4a4a5a', t: '#e0d6b0' },
    barks: {
      idle: ['*feeds pigeons that are not there*', '"Lovely morning. He loved mornings."'],
      neutral: ['"You remind me of someone."', '"Nobody stops to chat anymore."', '"Go on, dear."'],
      receptive: ['"Oh my. Do you really think so?"', '"You have such kind eyes."'],
      wary: ['"My pastor warned me about salesmen."', '"Why are you being so nice to me?"'],
      offended: ['"That is NOT how we speak to people!"', '"Young man. Honestly."'],
      sign: '"If it means seeing them again... where do I sign?"',
      flee: '"FATHER MICHAEL! FATHER MICHAEL!!"',
      bored: '"Well. My stories are on. Goodbye, dear."',
    },
  },
  retiree: {
    id: 'retiree',
    label: 'Retired Hustler',
    names: ['Gus', 'Mabel', 'Frank', 'Pearl', 'Bernie', 'Lou'],
    traitPool: ['NOSTALGIC', 'PROUD', 'LONELY', 'GRIEVING'],
    desirePool: ['LEGACY', 'COMFORT', 'POWER'],
    ickPool: ['FAME', 'ESCAPE'],
    quirkPool: ['SKEPTIC'],
    quirkChance: 0.35,
    willpower: [45, 60],
    susRate: [0.95, 1.1],
    patience: [7, 9],
    soulValue: [1, 2],
    palette: { h: '#e8e8e8', c: '#6a7a52', p: '#5a4a3a', t: '#c0a060' },
    barks: {
      idle: ['*sets up a chessboard nobody will play*', '"Back in MY day this park had standards."'],
      neutral: ['"I\'ve hustled hustlers, kid."', '"Speak up. And make it interesting."', '"Hm. Continue."'],
      receptive: ['"Ha! Now you\'re talking my language."', '"Sharp. I like sharp."'],
      wary: ['"I know a grift when I smell one."', '"Watch yourself, kid."'],
      offended: ['"I\'ve thrown better men than you in fountains."', '"WRONG answer."'],
      sign: '"Eh. I\'ve made worse trades. Pen."',
      flee: '"GRIFTER! We got a GRIFTER here!"',
      bored: '"You bore me. Checkmate. Go home."',
    },
  },
  nurse: {
    id: 'nurse',
    label: 'Night-Shift Nurse',
    names: ['Dana', 'Marcus', 'Priya', 'Colleen', 'Theo', 'Rosa'],
    traitPool: ['EXHAUSTED', 'LONELY', 'INSECURE', 'DESPERATE'],
    desirePool: ['COMFORT', 'ESCAPE', 'LOVE'],
    ickPool: ['FAME', 'POWER'],
    quirkPool: ['DEVOUT', 'SKEPTIC'],
    quirkChance: 0.25,
    willpower: [50, 65],
    susRate: [1.0, 1.15],
    patience: [5, 7],
    soulValue: [1, 2],
    palette: { h: '#3a2a20', c: '#7ab8c8', p: '#5a8a98', t: '#e8e8e8' },
    barks: {
      idle: ['*falls asleep standing up, briefly*', '"Triple shift. I can taste colors."'],
      neutral: ['"I\'ve got about five minutes."', '"Sorry, you were saying?"', '"Mhm. I hear that a lot."'],
      receptive: ['"God, it\'s nice to be listened to for once."', '"...yeah. Yeah, exactly."'],
      wary: ['"I\'ve seen every scam that walks into an ER."', '"This feels like a pitch."'],
      offended: ['"Wow. Read the room."', '"I deal with enough vampires at work."'],
      sign: '"If it means one full night of sleep... fine. FINE."',
      flee: '"Security! SECURITY!"',
      bored: '"Break\'s over. This was... something."',
    },
  },
  artist: {
    id: 'artist',
    label: 'Struggling Artist',
    names: ['Juno', 'Felix', 'Mara', 'Silas', 'Poppy', 'Dev'],
    traitPool: ['INSECURE', 'AMBITIOUS', 'DESPERATE', 'VAIN'],
    desirePool: ['FAME', 'LEGACY', 'LOVE'],
    ickPool: ['WEALTH', 'POWER'],
    quirkPool: ['DRUNK'],
    quirkChance: 0.2,
    willpower: [40, 55],
    susRate: [0.85, 1.0],
    patience: [6, 8],
    soulValue: [1, 2],
    palette: { h: '#b05a98', c: '#c8b44a', p: '#3a3a4a', t: '#d04a4a' },
    barks: {
      idle: ['*sketches the void. The void poses*', '"It\'s a STUDY, it\'s not finished."'],
      neutral: ['"Are you, like, a collector?"', '"My work isn\'t for everyone."', '"Interesting energy."'],
      receptive: ['"You GET it. Nobody gets it."', '"Finally, an audience with taste."'],
      wary: ['"This is giving... predatory gallerist."', '"Hm. Sus."'],
      offended: ['"Money?! Is that all anyone sees?!"', '"You sound like my landlord."'],
      sign: '"For the ART. History will understand."',
      flee: '"This is a PERFORMANCE about being hunted, right? RIGHT?!"',
      bored: '"My muse is leaving. So am I."',
    },
  },
  barfly: {
    id: 'barfly',
    label: 'Barfly',
    names: ['Mickey', 'Roz', 'Earl', 'Tammy', 'Sid', 'Charlene'],
    traitPool: ['GRIEVING', 'DESPERATE', 'LONELY', 'NOSTALGIC'],
    desirePool: ['LOVE', 'ESCAPE', 'COMFORT'],
    ickPool: ['FAME', 'LEGACY'],
    quirkPool: ['DRUNK'],
    quirkChance: 0.6,
    willpower: [30, 45],
    susRate: [0.65, 0.85],
    patience: [6, 8],
    soulValue: [1, 1],
    palette: { h: '#6a4a30', c: '#8a4a3a', p: '#3a3548', t: '#c87a3a' },
    barks: {
      idle: ['*argues with a parking meter*', '"The Stoop pours honest. That\'s rare."'],
      neutral: ['"Buy me a round and keep talkin\'."', '"You\'re blurry but I like you."', '"Heh. Sure, pal."'],
      receptive: ['"You\'re my best friend. I mean it."', '"Nobody talks to me like this no more."'],
      wary: ['"Wait. Waaaait. I know your type."', '"You a cop? You gotta tell me."'],
      offended: ['"You take that BACK."', '"Even I got standards, buddy."'],
      sign: '"Hell, I\'d sign worse for less. Gimme."',
      flee: '"DEMON! There\'s a DEMON at the— okay nobody cares."',
      bored: '"Last call somewhere. Scram."',
    },
  },
  analyst: {
    id: 'analyst',
    label: 'Burnt-Out Analyst',
    names: ['Spencer', 'Audrey', 'Raj', 'Whitney', 'Cole', 'Ingrid'],
    traitPool: ['EXHAUSTED', 'AMBITIOUS', 'INSECURE', 'GREEDY'],
    desirePool: ['ESCAPE', 'POWER', 'COMFORT'],
    ickPool: ['LOVE', 'FAME'],
    quirkPool: ['SKEPTIC'],
    quirkChance: 0.3,
    willpower: [60, 80],
    susRate: [1.1, 1.25],
    patience: [4, 6],
    soulValue: [2, 2],
    palette: { h: '#4a3a28', c: '#b8bcc8', p: '#3a4258', t: '#884a58' },
    barks: {
      idle: ['*stares into middle distance, vibrating*', '"I bill this conversation at $340 an hour."'],
      neutral: ['"You have ninety seconds."', '"Net it out for me."', '"Uh-huh. And the catch?"'],
      receptive: ['"...okay. I\'m listening. Off the record."', '"You sound like my exit strategy."'],
      wary: ['"This pitch has no deck. Suspicious."', '"I model risk for a living, friend."'],
      offended: ['"Did you just get PERSONAL with me?"', '"Hard pass. HARD pass."'],
      sign: '"Whatever. It beats Q3 projections. Done."',
      flee: '"I\'m calling my lawyer AND my therapist!"',
      bored: '"I have a 2 o\'clock. This is over."',
    },
  },
  founder: {
    id: 'founder',
    label: 'Failing Founder',
    names: ['Bram', 'Kayla', 'Dmitri', 'Sloane', 'Hunter', 'Vera'],
    traitPool: ['AMBITIOUS', 'DESPERATE', 'PROUD', 'EXHAUSTED'],
    desirePool: ['POWER', 'WEALTH', 'FAME'],
    ickPool: ['COMFORT', 'ESCAPE'],
    quirkPool: ['SKEPTIC', 'DRUNK'],
    quirkChance: 0.25,
    willpower: [55, 75],
    susRate: [0.95, 1.1],
    patience: [5, 7],
    soulValue: [2, 3],
    palette: { h: '#2a2a30', c: '#5a5e68', p: '#2e3440', t: '#48b8a0' },
    barks: {
      idle: ['"We\'re not dying, we\'re PIVOTING."', '*rehearses a TED talk to a trash can*'],
      neutral: ['"Talk fast, I have a runway problem."', '"Is this a soft circle or a term sheet?"', '"Keep going."'],
      receptive: ['"YES. This is the energy I need on my cap table."', '"You believe in the vision."'],
      wary: ['"What\'s your carry on this, exactly?"', '"I\'ve been burned by angels before."'],
      offended: ['"Rest is for POST-EXIT. Never say that again."', '"You sound like my co-founder. He QUIT."'],
      sign: '"Series Hell. Fine. FINE. Where\'s the pen."',
      flee: '"This is a hostile takeover! HOSTILE!"',
      bored: '"I have a standup. We\'ll circle back never."',
    },
  },
  cryptobro: {
    id: 'cryptobro',
    label: 'Crypto Evangelist',
    names: ['Chad', 'Tyler', 'Brock', 'Maddox', 'Kyle', 'Jaxon'],
    traitPool: ['GREEDY', 'VAIN', 'AMBITIOUS', 'INSECURE'],
    desirePool: ['WEALTH', 'FAME', 'POWER'],
    ickPool: ['LEGACY', 'COMFORT'],
    quirkPool: ['SKEPTIC'],
    quirkChance: 0.25,
    willpower: [65, 85],
    susRate: [1.2, 1.35],
    patience: [4, 6],
    soulValue: [2, 3],
    palette: { h: '#c8a050', c: '#40d0a8', p: '#303848', t: '#e8c84a' },
    barks: {
      idle: ['"It\'s not a dip, it\'s a discount."', '*checks phone. winces. checks again*'],
      neutral: ['"Bro. Bro. Make it quick, market\'s moving."', '"Is this an opportunity? It smells like one."', '"Go on, anon."'],
      receptive: ['"BRO. This is alpha. This is pure alpha."', '"You\'re so based it\'s scary."'],
      wary: ['"This is giving rug pull, not gonna lie."', '"Show me the whitepaper, friend."'],
      offended: ['"LEGACY? What is this, a BANK?"', '"Cope. Seethe. Goodbye."'],
      sign: '"Souls are just pre-money equity. LFG. Signed."',
      flee: '"GUYS. The fed is HERE. The FED!"',
      bored: '"NGMI. I\'m out."',
    },
  },
};
