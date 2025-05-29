import { useEffect, useState } from "react"
import browser from "webextension-polyfill"

const API_BASE = "http://localhost:5005"

function IndexPopup() {
  const [cfg, setCfg] = useState<{ mode: string; until?: string; whitelist: string[]; client_initiated?: boolean } | null>(null)
  const [grindHours, setGrindHours] = useState(1)

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

  const enableGrindMode = async () => {
    try {
      const res = await fetch(`${API_BASE}/client-grind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grind_hours: grindHours })
      })
      if (!res.ok) {
        const error = await res.text()
        alert(`Failed to enable grind mode: ${error}`)
        return
      }
      const data = await res.json()
      setCfg(data)
      await refreshRules()
    } catch (e) {
      console.error(e)
      alert("Failed to enable grind mode")
    }
  }

  return (
    <div style={{ padding: 16, minWidth: 300 }}>
      <h3>Productivity Extension</h3>
      {cfg ? (
        <>
          <p>
            Current Mode: <strong>{cfg.mode.toUpperCase()}</strong>
          </p>
          {cfg.mode === "grind" && cfg.until && <p>Until: {new Date(cfg.until).toLocaleString()}</p>}
          {cfg.mode === "grind" && !cfg.until && <p>Mode: Indefinite (no time limit)</p>}
          {cfg.client_initiated && (
            <p style={{ color: "#ff6b6b", fontSize: "12px" }}>
              ⚠️ You enabled grind mode - only admin can disable it
            </p>
          )}
          
          {/* Show grind mode controls only in chill mode */}
          {cfg.mode === "chill" && (
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #ccc", borderRadius: 4 }}>
              <h4 style={{ margin: "0 0 8px 0" }}>Enable Grind Mode</h4>
              <p style={{ fontSize: "12px", margin: "0 0 8px 0", color: "#666" }}>
                Warning: Once enabled, you cannot disable it yourself!
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min="0"
                  value={grindHours}
                  onChange={(e) => setGrindHours(parseInt(e.target.value) || 0)}
                  style={{ width: 60 }}
                />
                <span>hours (0 = indefinite)</span>
              </div>
              <button 
                onClick={enableGrindMode} 
                style={{ marginTop: 8, backgroundColor: "#ff6b6b", color: "white", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}
              >
                Enable Grind Mode
              </button>
            </div>
          )}
          
          <div style={{ marginTop: 16 }}>
            <button onClick={fetchCfg}>Refresh Status</button>
            <button onClick={refreshRules} style={{ marginLeft: 8 }}>
              Sync Rules
            </button>
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  )
}

export default IndexPopup
