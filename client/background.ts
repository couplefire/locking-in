// @ts-ignore
import type { PlasmoMessaging } from "@plasmohq/messaging"

// Constants
const API_BASE = "http://3.128.88.225:5005"
const CONFIG_ENDPOINT = `${API_BASE}/config`

// Store current config in memory to detect changes
let currentMode: "chill" | "grind" = "chill"
let currentWhitelist: string[] = []

// Helper to build DNR rules
type DNRule = chrome.declarativeNetRequest.Rule

const BLOCK_RULE_ID = 1
const ALLOW_RULE_BASE = 1000 // ids for allow rules start here

async function updateRules(mode: "chill" | "grind", whitelist: string[]) {
  console.log(`Updating rules for mode: ${mode}, whitelist:`, whitelist)
  
  // First get existing rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
  const existingIds = new Set(existingRules.map(rule => rule.id))
  
  // Remove block rule if it exists
  const idsToRemove = existingIds.has(BLOCK_RULE_ID) ? [BLOCK_RULE_ID] : []
  
  // Remove ALL existing allow rules (any rule with ID >= ALLOW_RULE_BASE)
  existingRules.forEach(rule => {
    if (rule.id >= ALLOW_RULE_BASE) {
      idsToRemove.push(rule.id)
    }
  })

  if (idsToRemove.length > 0) {
    console.log("Removing existing rules:", idsToRemove)
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: idsToRemove,
      addRules: []
    })
  }

  if (mode === "chill") {
    console.log("Chill mode - no blocking rules")
    currentWhitelist = whitelist
    currentMode = mode
    return // nothing else
  }

  // Build new rules
  const newRules: DNRule[] = []

  // 1. Block everything (low priority)
  newRules.push({
    id: BLOCK_RULE_ID,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "|http", // matches http and https
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
    }
  })

  // 2. Allow whitelist (higher priority)
  whitelist.forEach((domain, idx) => {
    const id = ALLOW_RULE_BASE + idx
    // Clean domain - remove protocol and trailing slashes
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
    console.log("Adding allow rule for domain:", cleanDomain, "with id:", id)
    
    newRules.push({
      id,
      priority: 2,
      action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: {
        requestDomains: [cleanDomain],
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
      }
    })
  })

  if (newRules.length > 0) {
    console.log("Adding new rules:", newRules)
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [],
      addRules: newRules
    })
  }

  currentWhitelist = whitelist
  currentMode = mode
}

async function fetchConfig() {
  try {
    console.log("Fetching config from API...")
    const res = await fetch(CONFIG_ENDPOINT)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const mode = data.mode as "chill" | "grind"
    const whitelist = data.whitelist as string[]
    const clientInitiated = data.client_initiated as boolean | undefined
    console.log("Received config - mode:", mode, "whitelist:", whitelist, "client_initiated:", clientInitiated)
    
    if (mode !== currentMode || JSON.stringify(whitelist) !== JSON.stringify(currentWhitelist)) {
      console.log("Config changed, updating rules...")
      await updateRules(mode, whitelist)
    } else {
      console.log("Config unchanged")
    }
  } catch (e) {
    console.error("Failed to fetch config", e)
  }
}

// Poll config every 5 seconds (reduced frequency)
setInterval(fetchConfig, 5000)

// Startup function
async function startup() {
  console.log("Starting extension...")
  await updateRules("chill", []) // Clear rules on launch
  await fetchConfig()
}

// Start the extension
startup()

// Messaging handler (optional) for popup to force refresh
// @ts-ignore
export const handler: PlasmoMessaging.Handler = async (req, res) => {
  if (req.body?.action === "refresh") {
    console.log("Manual refresh requested")
    await fetchConfig()
    res.send({ ok: true })
  }
} 