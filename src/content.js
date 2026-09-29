// Con Ops content — carried over verbatim from the team-validated prototype.
// Zone blurbs are general-knowledge geography: verify before final submission.

export const STAGES = [
  {k:'observe',   n:1, title:'Observe Environment',            ooda:'Sense',      req:'R-1',
    reqText:'The SoS shall integrate space-based, airborne, ground-based, and community observations across the Congo River Basin.',
    gapLabel:'Data Integration gap', gapText:'Separate observation systems lack a common basin-wide data architecture.',
    stake:['scientists','gov']},
  {k:'collect',   n:2, title:'Collect Multi-Source Data',       ooda:'Sense',      req:'R-2',
    reqText:'The SoS shall provide near-real-time monitoring of flooding, drought, vegetation, water, wildlife, and infrastructure conditions.',
    gapLabel:'Observation Coverage gap', gapText:'Remote regions have limited ground sensing and inconsistent monitoring coverage.',
    stake:['scientists','gov']},
  {k:'integrate', n:3, title:'Integrate & Validate Data',       ooda:'Understand', req:'R-1',
    reqText:'The SoS shall integrate space-based, airborne, ground-based, and community observations across the Congo River Basin.',
    gapLabel:'Data Integration gap', gapText:'Separate observation systems lack a common basin-wide data architecture.',
    stake:['scientists','gov']},
  {k:'assess',    n:4, title:'Assess Current Conditions',       ooda:'Understand', req:'R-2',
    reqText:'The SoS shall provide near-real-time monitoring of flooding, drought, vegetation, water, wildlife, and infrastructure conditions.',
    gapLabel:'Observation Coverage gap', gapText:'Remote regions have limited ground sensing and inconsistent monitoring coverage.',
    stake:['scientists','conservation','gov']},
  {k:'forecast',  n:5, title:'Forecast Hazards & Risk',         ooda:'Predict',    req:'R-3',
    reqText:'The SoS shall use historical and current data to forecast future environmental and community risk.',
    gapLabel:'Forecasting & Analytics gap', gapText:'Available datasets are not fully combined into multi-hazard predictive models.',
    stake:['scientists','gov','humanitarian']},
  {k:'prioritize',n:6, title:'Prioritize Threats & Action Items',ooda:'Decide',    req:'R-4',
    reqText:'The SoS shall identify populations, wildlife habitats, infrastructure, and economic activities at risk, and provide localized alerts, risk maps, and response priorities.',
    gapLabel:'Risk ID & Communication gap', gapText:'Forecasts are not consistently converted into localized risk maps and actionable alerts.',
    stake:['local','conservation','gov','humanitarian']},
  {k:'deploy',    n:7, title:'Deploy Counter Measures',         ooda:'Respond',    req:'R-4 / R-5',
    reqText:'Localized alerts and risk maps trigger emergency resource allocation and response planning across agencies.',
    gapLabel:'Response Coordination gap', gapText:'Prediction and warning systems are not fully connected to resource allocation and coordinated response.',
    stake:['local','conservation','gov','humanitarian']},
  {k:'support',   n:8, title:'Support Response',                ooda:'Recover',    req:'R-5',
    reqText:'The SoS shall support emergency resource allocation and response planning across agencies.',
    gapLabel:'Response Coordination gap', gapText:'Prediction and warning systems are not fully connected to resource allocation and coordinated response.',
    stake:['gov','humanitarian','local']},
  {k:'feedback',  n:9, title:'Feedback / Update Models',        ooda:'Learn',      req:'Closes the loop',
    reqText:'New data and lessons learned from the response are fed back into the observation and forecasting models.',
    gapLabel:'Compounding gap', gapText:'Every gap above widens if this step is skipped — without feedback, forecasts never improve.',
    stake:['scientists','gov','humanitarian','local','conservation']}
];

export const ZONES = [
  {k:'cuvette', name:'Cuvette Centrale',
    blurb:'The basin’s vast central peatland and swamp forest — one of the world’s largest tropical peat carbon stores, and among the hardest places in the basin to physically reach.',
    issue:'Coverage gap', stages:['observe','collect'], assets:['satellite','ground','water']},
  {k:'sangha', name:'Sangha Sub-Basin',
    blurb:'Dense rainforest along the northwest tributaries, under sustained pressure from logging concessions and cross-border conservation challenges.',
    issue:'Deforestation pressure', stages:['deploy'], assets:['uav','ground']},
  {k:'ubangi', name:'Ubangi Sub-Basin',
    blurb:'A major left-bank tributary and river-transport corridor forming much of the northern border — flooding here disrupts both communities and river traffic.',
    issue:'Flood exposure', stages:['collect','support'], assets:['ground','community','water']},
  {k:'kasai', name:'Kasai Sub-Basin',
    blurb:'A major southern tributary running through agricultural and mining regions, where resource extraction and population growth both add pressure on the basin.',
    issue:'Resource extraction', stages:['forecast','prioritize'], assets:['uav','ground']},
  {k:'lualaba', name:'Lualaba Sub-Basin',
    blurb:'The Congo River’s upper reaches and headwaters in the southeastern highlands, where mining activity shapes water quality for everything downstream.',
    issue:'Upstream water quality', stages:['forecast'], assets:['ground','satellite']},
  {k:'mouth', name:'River Mouth · Kinshasa–Brazzaville',
    blurb:'The basin’s outlet and its twin-capital urban core — the point of highest population density and the fastest-growing demand on basin resources.',
    issue:'Urbanization pressure', stages:['prioritize','deploy','support'], assets:['government','community','water']}
];

export const ASSET_INFO = {
  satellite:{name:'Satellites', items:['SAR satellites — ESA Sentinel-1','High-resolution imaging — Landsat','Precipitation & hydrological satellites']},
  uav:{name:'Aircraft & UAVs', items:['Research flights — experimental airborne LiDAR','Enforcement UAVs']},
  ground:{name:'Ground Stations', items:['Eddy covariance flux towers','Acoustic monitoring systems','Hydrological & meteorological stations']},
  water:{name:'Water & River Assets', items:['River gauges & hydrological buoys','Patrol & monitoring vessels']},
  community:{name:'Community Reporting', items:['Local reports from residents, rangers, and local organizations']},
  government:{name:'Governance & Institutions', items:['CICOS — International Commission of the Congo-Ubangi-Sangha Basin','National ministries & park authorities','UN, World Bank, FAO, and international NGOs']}
};

export const STAKE = {
  local:{name:'Local Communities'},
  gov:{name:'Government & Leadership Orgs'},
  conservation:{name:'Conservation & Wildlife Management'},
  humanitarian:{name:'Humanitarian & International Orgs'},
  scientists:{name:'Scientists & Technology/Data Orgs'}
};

// ---------- Geography (added for the globe) ----------

// Marker anchor [lon, lat] and how the polygon was derived (see scripts/build-data.mjs).
export const ZONE_GEO = {
  cuvette: { anchor: [18.6, 0.4],   kind: 'Central depression' },
  sangha:  { anchor: [16.1, 2.4],   kind: 'HydroSHEDS sub-basin', side: 'l' },
  ubangi:  { anchor: [21.8, 4.9],   kind: 'HydroSHEDS sub-basin' },
  kasai:   { anchor: [20.9, -6.2],  kind: 'HydroSHEDS sub-basin' },
  lualaba: { anchor: [26.6, -7.6],  kind: 'HydroSHEDS sub-basin' },
  mouth:   { anchor: [14.1, -5.3],  kind: 'Lower Congo reach', side: 'l' },
};

export const OODA = ['Sense', 'Understand', 'Predict', 'Decide', 'Respond', 'Recover', 'Learn'];

// Named places [lon, lat], shared by map labels, the data hub and the flooding example.
export const PLACES = {
  kinshasa:    [15.322, -4.325],
  brazzaville: [15.242, -4.263],
  bangui:      [18.558, 4.394],
  kisangani:   [25.191, 0.515],
  mbandaka:    [18.260, 0.048],
  ouesso:      [16.050, 1.610],
  kananga:     [22.417, -5.896],
  lubumbashi:  [27.479, -11.664],
  matadi:      [13.450, -5.820],
  mobaye:      [21.180, 4.320],
  mongoumba:   [18.600, 3.640],
  impfondo:    [18.060, 1.620],
};

// City labels on the map ('side' puts the label left or right of the dot).
export const CITIES = [
  { name: 'Kinshasa',    at: PLACES.kinshasa, side: 'r' },
  { name: 'Brazzaville', at: PLACES.brazzaville, side: 'l' },
  { name: 'Bangui',      at: PLACES.bangui },
  { name: 'Kisangani',   at: PLACES.kisangani },
  { name: 'Mbandaka',    at: PLACES.mbandaka },
  { name: 'Ouesso',      at: PLACES.ouesso },
  { name: 'Kananga',     at: PLACES.kananga },
  { name: 'Lubumbashi',  at: PLACES.lubumbashi },
  { name: 'Matadi',      at: PLACES.matadi },
];

// Concept node: where observations are fused and alerts are issued. Not a real facility.
export const HUB = { name: 'Basin Data Hub', host: 'CICOS · Kinshasa', at: PLACES.kinshasa };

// Data-flow role of each asset type: does it send observations to the hub, receive alerts/tasking, or both?
export const ASSET_ROLE = {
  satellite:  { sends: true,  receives: false },
  uav:        { sends: true,  receives: true },
  ground:     { sends: true,  receives: false },
  water:      { sends: true,  receives: true },
  community:  { sends: true,  receives: true },
  government: { sends: false, receives: true },
};

// Which way data moves at each stage (drives the Data flow overlay and its legend text).
export const STAGE_FLOW = {
  observe: 'in', collect: 'in', integrate: 'in', assess: 'in',
  forecast: 'hub', prioritize: 'hub',
  deploy: 'out', support: 'out',
  feedback: 'loop',
};
export const FLOW_MODE_LABEL = {
  in: 'data flows in to the hub',
  hub: 'the hub fuses, forecasts and ranks',
  out: 'alerts and tasking flow out',
  loop: 'everything loops back',
};

export const RIVER_LABELS = [
  { name: 'Congo',   lon: 21.2, lat: 1.95 },
  { name: 'Ubangi',  lon: 20.6, lat: 4.55 },
  { name: 'Sangha',  lon: 16.45, lat: 0.3 },
  { name: 'Kasai',   lon: 19.4, lat: -3.55 },
  { name: 'Lualaba', lon: 25.95, lat: -3.6 },
];
