// @ts-ignore
import type { PlasmoMessaging } from "@plasmohq/messaging"

// Constants
// const API_BASE = "http://3.128.88.225:5005"
const API_BASE = "http://localhost:5005"
const CONFIG_ENDPOINT = `${API_BASE}/config`

// Store current config in memory to detect changes
let currentMode: "chill" | "grind" = "chill"
let currentWhitelist: string[] = []
let currentBlacklist: string[] = []

// Helper to build DNR rules
type DNRule = chrome.declarativeNetRequest.Rule

const BLOCK_RULE_ID = 1
const ALLOW_RULE_BASE = 1000 // ids for allow rules start here
const BLACKLIST_RULE_BASE = 2000 // ids for blacklist rules start here

// Helper function to reload tabs that should be blocked
async function reloadBlockedTabs(whitelist: string[]) {
  try {
    const tabs = await chrome.tabs.query({})
    console.log(`Checking ${tabs.length} tabs for reload...`)
    
    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue
      
      // Skip chrome:// and other browser URLs
      if (!tab.url.startsWith("http://") && !tab.url.startsWith("https://")) {
        continue
      }
      
      // Check if this tab's domain is in the whitelist
      const url = new URL(tab.url)
      const domain = url.hostname
      
      const isWhitelisted = whitelist.some(whitelistedDomain => {
        const cleanDomain = whitelistedDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")
        return domain === cleanDomain || domain.endsWith(`.${cleanDomain}`)
      })
      
      // If not whitelisted, reload the tab
      if (!isWhitelisted) {
        console.log(`Reloading blocked tab: ${tab.url}`)
        await chrome.tabs.reload(tab.id, { bypassCache: true })
      }
    }
  } catch (e) {
    console.error("Error reloading tabs:", e)
  }
}

async function updateRules(mode: "chill" | "grind", whitelist: string[], blacklist: string[] = []) {
  console.log(`Updating rules for mode: ${mode}, whitelist:`, whitelist, "blacklist:", blacklist)
  
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
    currentBlacklist = blacklist
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
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.STYLESHEET,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.FONT,
        chrome.declarativeNetRequest.ResourceType.MEDIA,
        chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
        chrome.declarativeNetRequest.ResourceType.OTHER
      ]
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
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.SCRIPT,
          chrome.declarativeNetRequest.ResourceType.STYLESHEET,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.FONT,
          chrome.declarativeNetRequest.ResourceType.MEDIA,
          chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
          chrome.declarativeNetRequest.ResourceType.OTHER
        ]
      }
    })
  })

  // 3. Block blacklist (highest priority - overrides whitelist)
  blacklist.forEach((domain, idx) => {
    const id = BLACKLIST_RULE_BASE + idx
    // Clean domain - remove protocol and trailing slashes
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
    console.log("Adding blacklist rule for domain:", cleanDomain, "with id:", id)
    
    newRules.push({
      id,
      priority: 3, // Highest priority - overrides whitelist
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        requestDomains: [cleanDomain],
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.SCRIPT,
          chrome.declarativeNetRequest.ResourceType.STYLESHEET,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.FONT,
          chrome.declarativeNetRequest.ResourceType.MEDIA,
          chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
          chrome.declarativeNetRequest.ResourceType.OTHER
        ]
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
  currentBlacklist = blacklist
  currentMode = mode
  
  // Reload tabs that should now be blocked
  if (mode === "grind") {
    await reloadBlockedTabs(whitelist)
  }
}

async function fetchConfig() {
  try {
    console.log("Fetching config from API...")
    const res = await fetch(CONFIG_ENDPOINT)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const mode = data.mode as "chill" | "grind"
    const whitelist = data.whitelist as string[]
    const blacklist = (data.blacklist || []) as string[]
    const clientInitiated = data.client_initiated as boolean | undefined
    console.log("Received config - mode:", mode, "whitelist:", whitelist, "blacklist:", blacklist, "client_initiated:", clientInitiated)
    
    if (mode !== currentMode || 
        JSON.stringify(whitelist) !== JSON.stringify(currentWhitelist) ||
        JSON.stringify(blacklist) !== JSON.stringify(currentBlacklist)) {
      console.log("Config changed, updating rules...")
      
      // Store previous values to detect what changed
      const previousMode = currentMode
      const previousWhitelist = currentWhitelist
      const previousBlacklist = currentBlacklist
      
      await updateRules(mode, whitelist, blacklist)
      
      // If already in grind mode and whitelist/blacklist changed, reload affected tabs
      if (mode === "grind" && previousMode === "grind" && 
          (JSON.stringify(whitelist) !== JSON.stringify(previousWhitelist) ||
           JSON.stringify(blacklist) !== JSON.stringify(previousBlacklist))) {
        console.log("Whitelist/blacklist changed in grind mode, reloading affected tabs...")
        await reloadBlockedTabs(whitelist)
      }
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
  await updateRules("chill", [], []) // Clear rules on launch
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