// config.js — regions, platform colours, and app-wide constants

const REGIONS = [
  { abbr: 'ON', name: 'Ontario' },
  { abbr: 'QC', name: 'Quebec' },
  { abbr: 'BC', name: 'British Columbia' },
  { abbr: 'AB', name: 'Alberta' },
  { abbr: 'MB', name: 'Manitoba' },
  { abbr: 'SK', name: 'Saskatchewan' },
  { abbr: 'NS', name: 'Nova Scotia' },
  { abbr: 'NB', name: 'New Brunswick' },
  { abbr: 'NL', name: 'Newfoundland' },
  { abbr: 'PE', name: 'PEI' },
  { abbr: 'YT', name: 'Yukon' },
  { abbr: 'NT', name: 'NW Territories' },
  { abbr: 'NU', name: 'Nunavut' },
];

const PLATFORM_COLOURS = {
  reddit:   '#FF4500',
  twitter:  '#111111',
  facebook: '#1877F2',
  google:   '#34A853',
  news:     '#185FA5',
};

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS_DEFAULT = 1200;
const MAX_TOKENS_SCOUT   = 1500;
const MAX_TOKENS_ANALYST = 1400;
const AGENT_PAUSE_MS     = 1500;
const ANALYST_PAUSE_MS   = 2000;
