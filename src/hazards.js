// All-hazards view: the problems the system of systems monitors, and how each one connects to data
// sources, zones and the nine-stage loop. Wording reuses the team's zone blurbs and requirements
// wherever possible.
//
// Every link carries a basis so the page can show how solid it is:
//   'content'  = already stated in our content (a zone's issue + its deployed assets, or an asset's own description)
//   'proposed' = inferred for this view; shown with a dashed marker and listed as TODO: verify
//
// Every hazard runs through all nine stages; that shared loop is the point of the overview.

export const SENSING_ASSETS = ['satellite', 'uav', 'ground', 'water', 'community'];

export const HAZARDS = [
  {
    k: 'flood', name: 'Flooding', short: 'Flooding',
    basis: 'R-2 names flooding; Ubangi issue: flood exposure',
    text: 'Flooding disrupts both communities and river traffic; the Ubangi corridor is the clearest exposure.',
    zones: { ubangi: 'content' },
    sources: { satellite: 'content', ground: 'content', water: 'content', community: 'content' },
    forecast: 'River-level and flood outlook',
    example: true,
  },
  {
    k: 'drought', name: 'Drought', short: 'Drought',
    basis: 'R-2 names drought',
    text: 'Named in R-2’s monitoring scope alongside flooding, vegetation and water. TODO: verify which zones and seasons to highlight.',
    zones: {},
    sources: { satellite: 'content', ground: 'content', water: 'proposed', community: 'proposed' },
    forecast: 'Drought and vegetation-stress trend',
  },
  {
    k: 'forest', name: 'Deforestation & forest-cover loss', short: 'Forest loss',
    basis: 'Sangha issue: deforestation pressure',
    text: 'Dense rainforest under sustained pressure from logging concessions and cross-border conservation challenges.',
    zones: { sangha: 'content' },
    sources: { uav: 'content', ground: 'content', satellite: 'proposed', community: 'proposed' },
    forecast: 'Forest-loss alerts',
  },
  {
    k: 'peat', name: 'Peatland carbon stress', short: 'Peatland carbon',
    basis: 'Cuvette Centrale blurb: tropical peat carbon store',
    text: 'The Cuvette Centrale holds one of the world’s largest tropical peat carbon stores and is among the hardest places in the basin to reach. TODO: verify which stressors to name.',
    zones: { cuvette: 'content' },
    sources: { satellite: 'content', ground: 'content', water: 'content' },
    forecast: 'TODO: verify. Peat-condition trend for the Cuvette Centrale (e.g. water-table or carbon-flux change).',
    forecastTodo: true,
  },
  {
    k: 'mining', name: 'Mining & resource-extraction impacts on water quality', short: 'Mining & water quality',
    basis: 'Lualaba issue: upstream water quality; Kasai issue: resource extraction',
    text: 'Mining activity shapes water quality for everything downstream, and resource extraction adds pressure across agricultural and mining regions.',
    zones: { lualaba: 'content', kasai: 'content' },
    sources: { satellite: 'content', uav: 'content', ground: 'content', water: 'proposed' },
    forecast: 'Water-quality change downstream of mining',
  },
  {
    k: 'urban', name: 'Urbanization pressure', short: 'Urbanization',
    basis: 'River Mouth issue: urbanization pressure',
    text: 'The twin-capital urban core has the highest population density and the fastest-growing demand on basin resources.',
    zones: { mouth: 'content' },
    sources: { community: 'content', water: 'content', satellite: 'proposed' },
    forecast: 'TODO: verify. Growth in exposure where expanding settlements meet flood risk and resource demand.',
    forecastTodo: true,
  },
  {
    k: 'wildlife', name: 'Wildlife & habitat pressure', short: 'Wildlife & habitat',
    basis: 'R-2 names wildlife; R-4 names wildlife habitats',
    text: 'Wildlife and wildlife habitats are in scope for monitoring (R-2) and for risk identification (R-4). TODO: verify which zones to link.',
    zones: { sangha: 'proposed' },
    sources: { ground: 'proposed', uav: 'proposed', community: 'proposed', satellite: 'proposed' },
    forecast: 'TODO: verify. Habitat-pressure trend from forest loss, acoustic monitoring and ranger reports.',
    forecastTodo: true,
  },
];

export const hazardBy = Object.fromEntries(HAZARDS.map(h => [h.k, h]));
export const hazardsForZone = z => HAZARDS.filter(h => h.zones[z]);
export const hazardsForAsset = a => HAZARDS.filter(h => h.sources[a]);

// How the nine stages group into the overview's columns (stage keys from content.js).
export const OVERVIEW_COLUMNS = [
  { k: 'collect', title: 'Data collection', stages: ['observe', 'collect'] },
  { k: 'forecast', title: 'Integrate & forecast', stages: ['integrate', 'assess', 'forecast'] },
  { k: 'act', title: 'Prioritize, act & feed back', stages: ['prioritize', 'deploy', 'support', 'feedback'] },
];
