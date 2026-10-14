// Curated Chemical Catalog & Fuzzy Spell-Correction Engine for Phase-Conform AI

export const COMPOUND_CATEGORIES = [
  { id: 'all', label: 'All Compounds' },
  { id: 'textbook', label: 'Textbook Rotors' },
  { id: 'drugs', label: 'Drugs & Bioactive' },
  { id: 'rings', label: 'Rings & Chiral' }
];

export const CURATED_COMPOUNDS = [
  // --- TEXTBOOK CONFORMATIONAL ROTORS ---
  {
    name: 'Butane',
    formula: 'C4H10',
    smiles: 'CCCC',
    category: 'textbook',
    desc: 'Archetypal alkane rotor; textbook anti (180°) and gauche (60°) staggered minima.',
    tags: ['alkane', 'anti', 'gauche', 'rotor', 'c4h10']
  },
  {
    name: 'Ethane',
    formula: 'C2H6',
    smiles: 'CC',
    category: 'textbook',
    desc: 'Simplest C–C rotor; 12.0 kJ/mol torsional barrier between staggered and eclipsed.',
    tags: ['alkane', 'simplest', 'rotor', 'c2h6']
  },
  {
    name: 'Propane',
    formula: 'C3H8',
    smiles: 'CCC',
    category: 'textbook',
    desc: 'Methyl-hydrogen eclipsing strain (14.0 kJ/mol rotational barrier).',
    tags: ['alkane', 'rotor', 'c3h8']
  },
  {
    name: 'Pentane',
    formula: 'C5H12',
    smiles: 'CCCCC',
    category: 'textbook',
    desc: '5-carbon aliphatic chain exhibiting anti/gauche conformational isomerism.',
    tags: ['alkane', 'pentane', 'c5h12']
  },
  {
    name: 'Hexane',
    formula: 'C6H14',
    smiles: 'CCCCCC',
    category: 'textbook',
    desc: 'Linear 6-carbon alkane with multiple coupled rotatable single bonds.',
    tags: ['alkane', 'hexane', 'c6h14']
  },
  {
    name: 'Ethylene Glycol',
    formula: 'C2H6O2',
    smiles: 'OCCO',
    category: 'textbook',
    desc: 'Intramolecular O–H···O hydrogen bonding stabilizes the gauche conformer over anti.',
    tags: ['diol', 'hydrogen bond', 'gauche effect', 'antifreeze', 'c2h6o2']
  },
  {
    name: '1,2-Dichloroethane',
    formula: 'C2H4Cl2',
    smiles: 'ClCCCl',
    category: 'textbook',
    desc: 'Classic solvent-dependent conformational equilibrium between anti and polar gauche.',
    tags: ['halide', 'dipole', 'rotor', 'c2h4cl2']
  },
  {
    name: '2-Butanol',
    formula: 'C4H10O',
    smiles: 'CCC(C)O',
    category: 'textbook',
    desc: 'Chiral secondary alcohol featuring coupled C–C and C–O rotatable dihedrals.',
    tags: ['alcohol', 'chiral', 'c4h10o']
  },
  {
    name: '2-Chlorobutane',
    formula: 'C4H9Cl',
    smiles: 'CCC(C)Cl',
    category: 'textbook',
    desc: 'Chiral alkyl halide with steric and electrostatic repulsion between Cl and methyl.',
    tags: ['halide', 'chiral', 'c4h9cl']
  },

  // --- RINGS & CHIRAL STEREOCHEMISTRY ---
  {
    name: 'Cyclohexane',
    formula: 'C6H12',
    smiles: 'C1CCCCC1',
    category: 'rings',
    desc: 'Famous saturated ring; puckered chair eliminates angle strain (ring-flip barrier: 45 kJ/mol).',
    tags: ['chair', 'boat', 'ring-flip', 'axial', 'equatorial', 'c6h12']
  },
  {
    name: 'Methylcyclohexane',
    formula: 'C7H14',
    smiles: 'CC1CCCCC1',
    category: 'rings',
    desc: 'Equatorial preference with 7.3 kJ/mol A-value due to 1,3-diaxial steric clashes.',
    tags: ['a-value', 'chair', '1,3-diaxial', 'c7h14']
  },
  {
    name: '1,2-Dimethylcyclohexane',
    formula: 'C8H16',
    smiles: 'CC1CCCCC1C',
    category: 'rings',
    desc: 'Classic cis vs trans stereoisomerism and diequatorial chair stabilization.',
    tags: ['cis-trans', 'chair', 'stereoisomer', 'c8h16']
  },
  {
    name: 'D-Glucose',
    formula: 'C6H12O6',
    smiles: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
    category: 'rings',
    desc: 'Essential aldohexose sugar; all bulky -OH and -CH2OH groups occupy equatorial positions in beta-chair.',
    tags: ['sugar', 'aldohexose', 'pyranose', 'haworth', 'fischer', 'c6h12o6']
  },
  {
    name: 'L-Alanine',
    formula: 'C3H7NO2',
    smiles: 'N[C@@H](C)C(=O)O',
    category: 'rings',
    desc: 'Standard chiral alpha-amino acid; model for Fischer projection and (S)-chirality.',
    tags: ['amino acid', 'chiral', 'fischer', 'c3h7no2']
  },
  {
    name: 'Tartaric Acid',
    formula: 'C4H6O6',
    smiles: 'O=C(O)[C@@H](O)[C@H](O)C(=O)O',
    category: 'rings',
    desc: 'Historic compound used by Louis Pasteur; features two stereocenters and meso isomerism.',
    tags: ['chiral', 'pasteur', 'meso', 'fischer', 'c4h6o6']
  },

  // --- BIOACTIVE & DRUGS ---
  {
    name: 'Caffeine',
    formula: 'C8H10N4O2',
    smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
    category: 'drugs',
    desc: 'Central nervous system stimulant; purine methylxanthine found in coffee and tea.',
    tags: ['stimulant', 'coffee', 'tea', 'purine', 'c8h10n4o2']
  },
  {
    name: 'Aspirin',
    formula: 'C9H8O4',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    category: 'drugs',
    desc: 'Acetylsalicylic acid; non-steroidal anti-inflammatory (NSAID) and COX inhibitor.',
    tags: ['painkiller', 'nsaid', 'acetylsalicylic acid', 'fever', 'c9h8o4']
  },
  {
    name: 'Paracetamol',
    formula: 'C8H9NO2',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    category: 'drugs',
    desc: 'Acetaminophen; widely used analgesic and antipyretic with amide rotatable dihedral.',
    tags: ['acetaminophen', 'tylenol', 'fever', 'pain', 'c8h9no2']
  },
  {
    name: 'Ibuprofen',
    formula: 'C13H18O2',
    smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    category: 'drugs',
    desc: 'Popular NSAID with flexible isobutyl hydrophobic tail and chiral propionic acid.',
    tags: ['advil', 'motrin', 'nsaid', 'chiral', 'c13h18o2']
  },
  {
    name: 'Dopamine',
    formula: 'C8H11NO2',
    smiles: 'NCCc1ccc(O)c(O)c1',
    category: 'drugs',
    desc: 'Catecholamine neurotransmitter regulating reward pathways, motivation, and motor control.',
    tags: ['neurotransmitter', 'catecholamine', 'brain', 'c8h11no2']
  },
  {
    name: 'Serotonin',
    formula: 'C10H12N2O',
    smiles: 'NCCc1c[nH]c2ccc(O)cc12',
    category: 'drugs',
    desc: '5-Hydroxytryptamine (5-HT) neurotransmitter governing mood, sleep, and happiness.',
    tags: ['5-ht', 'neurotransmitter', 'mood', 'happiness', 'c10h12n2o']
  },
  {
    name: 'Adrenaline',
    formula: 'C9H13NO3',
    smiles: 'CNC[C@H](O)c1ccc(O)c(O)c1',
    category: 'drugs',
    desc: 'Epinephrine; fight-or-flight hormone and cardiovascular sympathetic neurotransmitter.',
    tags: ['epinephrine', 'hormone', 'fight or flight', 'c9h13no3']
  },
  {
    name: 'Melatonin',
    formula: 'C13H16N2O2',
    smiles: 'CC(=O)NCCc1c[nH]c2ccc(OC)cc12',
    category: 'drugs',
    desc: 'Pineal gland neurohormone synchronizing circadian rhythms and sleep cycles.',
    tags: ['sleep', 'circadian', 'hormone', 'c13h16n2o2']
  },
  {
    name: 'Penicillin',
    formula: 'C16H18N2O4S',
    smiles: 'CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O',
    category: 'drugs',
    desc: 'Historic beta-lactam antibiotic that revolutionized medicine against bacterial infections.',
    tags: ['antibiotic', 'beta-lactam', 'fleming', 'c16h18n2o4s']
  },
  {
    name: 'Cholesterol',
    formula: 'C27H46O',
    smiles: 'CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C',
    category: 'drugs',
    desc: 'Rigid tetracyclic steroid lipid crucial for membrane fluidity and steroid hormone synthesis.',
    tags: ['lipid', 'steroid', 'membrane', 'c27h46o']
  },
  {
    name: 'Testosterone',
    formula: 'C19H28O2',
    smiles: 'CC12CCC(=O)C=C1CCC3C2CCC4(C3CCC4O)C',
    category: 'drugs',
    desc: 'Primary male androgen anabolic steroid hormone regulating muscle mass and reproduction.',
    tags: ['hormone', 'androgen', 'steroid', 'c19h28o2']
  },
  {
    name: 'Vanillin',
    formula: 'C8H8O3',
    smiles: 'O=Cc1ccc(O)c(OC)c1',
    category: 'drugs',
    desc: 'Phenolic aldehyde flavor compound extracted from vanilla beans.',
    tags: ['flavor', 'vanilla', 'aroma', 'c8h8o3']
  },
  {
    name: 'Menthol',
    formula: 'C10H20O',
    smiles: 'CC1CCC(C(C1)O)C(C)C',
    category: 'drugs',
    desc: 'Monoterpene alcohol triggering TRPM8 cold-sensing sensory receptors.',
    tags: ['mint', 'cooling', 'terpene', 'c10h20o']
  },
  {
    name: 'Capsaicin',
    formula: 'C18H27NO3',
    smiles: 'CC(C)/C=C/CCCCCC(=O)NCc1ccc(c(c1)OC)O',
    category: 'drugs',
    desc: 'Spicy active compound in chili peppers binding to heat-activated TRPV1 ion channels.',
    tags: ['pepper', 'spicy', 'chili', 'trpv1', 'c18h27no3']
  },
  {
    name: 'Vitamin C',
    formula: 'C6H8O6',
    smiles: 'OC[C@H](O)C1OC(=O)C(O)=C1O',
    category: 'drugs',
    desc: 'L-Ascorbic acid; essential water-soluble antioxidant and collagen cofactor.',
    tags: ['ascorbic acid', 'vitamin', 'antioxidant', 'c6h8o6']
  },
  {
    name: 'Benzene',
    formula: 'C6H6',
    smiles: 'c1ccccc1',
    category: 'textbook',
    desc: 'Classic planar aromatic ring with 6 delocalized π electrons and 120° D6h symmetry.',
    tags: ['aromatic', 'kekule', 'ring', 'c6h6']
  },
  {
    name: 'Toluene',
    formula: 'C7H8',
    smiles: 'Cc1ccccc1',
    category: 'textbook',
    desc: 'Methylbenzene; ultra-low 0.06 kJ/mol 6-fold barrier for methyl rotation over benzene ring.',
    tags: ['aromatic', 'solvent', 'c7h8']
  },
  {
    name: 'Ethanol',
    formula: 'C2H6O',
    smiles: 'CCO',
    category: 'textbook',
    desc: 'Drinking alcohol; exhibits C–C and C–O rotatable bonds and hydrogen bonding.',
    tags: ['alcohol', 'solvent', 'c2h6o', 'c2h5oh']
  },
  {
    name: 'Acetone',
    formula: 'C3H6O',
    smiles: 'CC(=O)C',
    category: 'textbook',
    desc: 'Simplest ketone; planar carbonyl carbon flanked by two equivalent methyl rotors.',
    tags: ['ketone', 'solvent', 'c3h6o']
  },
  {
    name: 'Acetic Acid',
    formula: 'C2H4O2',
    smiles: 'CC(=O)O',
    category: 'textbook',
    desc: 'Main component of vinegar; exhibits cis/trans carboxylic acid rotamers.',
    tags: ['carboxylic acid', 'vinegar', 'c2h4o2']
  },
  {
    name: 'Nicotine',
    formula: 'C10H14N2',
    smiles: 'c1ccc(nc1)[C@@H]2CCCN2C',
    category: 'drugs',
    desc: 'Alkaloid stimulant found in tobacco that targets nicotinic acetylcholine receptors.',
    tags: ['alkaloid', 'tobacco', 'stimulant', 'c10h14n2']
  },
  {
    name: 'Morphine',
    formula: 'C17H19NO3',
    smiles: 'CN1CCC23C4C1CC5=C2C(=C(C=C5)O)OC3C(C=C4)O',
    category: 'drugs',
    desc: 'Potent opioid analgesic alkaloid isolated from the opium poppy plant.',
    tags: ['opioid', 'painkiller', 'alkaloid', 'c17h19no3']
  },
  {
    name: 'LSD',
    formula: 'C20H25N3O',
    smiles: 'CCN(CC)C(=O)C1CN(C2CC3=CNC4=CC=CC(=C34)C2=C1)C',
    category: 'drugs',
    desc: 'Lysergic acid diethylamide; potent ergoline psychedelic interacting with 5-HT2A receptors.',
    tags: ['psychedelic', 'serotonergic', 'ergoline', 'c20h25n3o']
  }
];

// --- DAMERAU-LEVENSHTEIN FUZZY MATCHING (Handles Transpositions, Typos, Deletions) ---
export function damerauLevenshtein(a, b) {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const d = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition check (e.g. 'caffiene' -> 'caffeine')
      if (
        i > 1 && j > 1 &&
        a[i - 1].toLowerCase() === b[j - 2].toLowerCase() &&
        a[i - 2].toLowerCase() === b[j - 1].toLowerCase()
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[al][bl];
}

export function calculateSimilarity(input, target) {
  const inStr = input.trim().toLowerCase();
  const tarStr = target.trim().toLowerCase();
  if (inStr === tarStr) return 1.0;
  
  // Direct prefix bonus (e.g., "caf" matches "caffeine")
  if (tarStr.startsWith(inStr)) return 0.95;
  // Substring bonus
  if (tarStr.includes(inStr)) return 0.88;

  const dist = damerauLevenshtein(inStr, tarStr);
  const maxLen = Math.max(inStr.length, tarStr.length);
  return Math.max(0, 1 - dist / maxLen);
}

// Find suggestions matching input query with optional category filtering
export function getCompoundSuggestions(query = '', category = 'all', limit = 8) {
  const q = query.trim().toLowerCase();

  // If query is empty, return popular curated items in the selected category
  if (!q) {
    let pool = CURATED_COMPOUNDS;
    if (category !== 'all') {
      pool = pool.filter(c => c.category === category);
    }
    return pool.slice(0, limit).map(c => ({
      ...c,
      isExactMatch: false,
      isFuzzyCorrection: false,
      score: 1.0
    }));
  }

  // Score each curated compound
  const scored = [];
  for (const comp of CURATED_COMPOUNDS) {
    // If category filter is active and doesn't match, skip
    if (category !== 'all' && comp.category !== category) continue;

    // Check name similarity
    const nameScore = calculateSimilarity(q, comp.name);
    // Check formula similarity
    const formulaScore = calculateSimilarity(q, comp.formula);
    // Check tags
    let tagScore = 0;
    if (comp.tags) {
      for (const tag of comp.tags) {
        const s = calculateSimilarity(q, tag);
        if (s > tagScore) tagScore = s;
      }
    }

    const maxScore = Math.max(nameScore, formulaScore, tagScore * 0.9);

    if (maxScore >= 0.55 || comp.name.toLowerCase().includes(q) || comp.formula.toLowerCase().includes(q)) {
      const isExact = comp.name.toLowerCase() === q || comp.formula.toLowerCase() === q;
      const isFuzzy = !isExact && maxScore >= 0.70 && !comp.name.toLowerCase().startsWith(q);

      scored.push({
        ...comp,
        score: maxScore,
        isExactMatch: isExact,
        isFuzzyCorrection: isFuzzy,
        matchedProperty: nameScore >= formulaScore ? 'name' : 'formula'
      });
    }
  }

  // Sort by score descending (exact matches on top, then high similarity)
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// Automatic high-confidence typo detector ("Did you mean...?")
export function findBestSpellCorrection(query) {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) return null;

  let best = null;
  let highestScore = 0;

  for (const comp of CURATED_COMPOUNDS) {
    const s = calculateSimilarity(q, comp.name);
    if (s > highestScore) {
      highestScore = s;
      best = comp;
    }
  }

  // Only return if confidence is high (>= 72%) and not an exact identical match
  if (best && highestScore >= 0.72 && best.name.toLowerCase() !== q) {
    return {
      correctedName: best.name,
      smiles: best.smiles,
      formula: best.formula,
      confidence: Math.round(highestScore * 100),
      compound: best
    };
  }

  return null;
}

// Online PubChem Autocomplete Fetcher (Debounced fallback for exotic/unlisted molecules)
export async function fetchPubChemAutocomplete(query, limit = 5) {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(q)}/json?limit=${limit}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    const terms = data.dictionary_terms?.compound || [];
    return terms.map(term => ({
      name: term.charAt(0).toUpperCase() + term.slice(1),
      isPubChemAutocomplete: true,
      source: 'PubChem'
    }));
  } catch (err) {
    return [];
  }
}
