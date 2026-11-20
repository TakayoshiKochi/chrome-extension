// Loads redirect rules from config.json and installs them as
// declarativeNetRequest dynamic rules. Edit config.json, then reload the
// extension from chrome://extensions to apply changes.

const RESOURCE_TYPES = ['main_frame', 'sub_frame'];

function buildRules(config) {
  if (!config || !Array.isArray(config.rules)) {
    throw new Error('config.json must contain a "rules" array');
  }

  return config.rules.map((entry, index) => {
    if (!entry || typeof entry.from !== 'string' || !entry.from) {
      throw new Error(`rules[${index}]: "from" must be a non-empty regex string`);
    }
    if (typeof entry.to !== 'string' || !entry.to) {
      throw new Error(`rules[${index}]: "to" must be a non-empty URL string`);
    }

    return {
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { regexSubstitution: entry.to }
      },
      condition: {
        regexFilter: entry.from,
        resourceTypes: RESOURCE_TYPES
      }
    };
  });
}

async function checkRegexes(rules) {
  for (const rule of rules) {
    const result = await chrome.declarativeNetRequest.isRegexSupported({
      regex: rule.condition.regexFilter
    });
    if (!result.isSupported) {
      throw new Error(`rule ${rule.id}: unsupported regex (${result.reason}): ${rule.condition.regexFilter}`);
    }
  }
}

async function loadConfig() {
  const response = await fetch(chrome.runtime.getURL('config.json'));
  return response.json();
}

async function applyConfig() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(rule => rule.id);

  let rules = [];
  try {
    rules = buildRules(await loadConfig());
    await checkRegexes(rules);
  } catch (error) {
    console.error('redirector: invalid config.json; all redirects disabled.', error);
    rules = [];
  }

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: rules });
  console.info(`redirector: installed ${rules.length} rule(s).`);
}

chrome.runtime.onInstalled.addListener(() => { void applyConfig(); });
chrome.runtime.onStartup.addListener(() => { void applyConfig(); });
