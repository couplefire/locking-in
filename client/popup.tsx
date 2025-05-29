import { useEffect, useState } from "react"
import browser from "webextension-polyfill"

const API_BASE = "http://localhost:5005"

function IndexPopup() {
  const [cfg, setCfg] = useState<{ mode: string; until?: string; whitelist: string[] } | null>(null)

  const fetchCfg = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`)
      const data = await res.json()
      setCfg(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCfg()
  }, [])

  const refreshRules = async () => {
    await browser.runtime.sendMessage({ action: "refresh" })
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Productivity Extension</h3>
      {cfg ? (
        <>
          <p>
            Current Mode: <strong>{cfg.mode.toUpperCase()}</strong>
          </p>
          {cfg.mode === "grind" && cfg.until && <p>Until: {new Date(cfg.until).toLocaleString()}</p>}
          <button onClick={fetchCfg}>Refresh Status</button>
          <button onClick={refreshRules} style={{ marginLeft: 8 }}>
            Sync Rules
          </button>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  )
}

export default IndexPopup
