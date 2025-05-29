import { useEffect, useState } from "react"
import browser from "webextension-polyfill"

const API_BASE = "http://localhost:5005"

// Modern styles
const styles = {
  container: {
    width: '320px',
    minHeight: '400px',
    background: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#1e293b',
    margin: 0,
    padding: 0,
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px',
    textAlign: 'center' as const,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  },
  content: {
    padding: '20px',
  },
  statusCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  modeDisplay: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  modeChill: {
    color: '#059669',
  },
  modeGrind: {
    color: '#dc2626',
  },
  statusInfo: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0',
  },
  warningBadge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    marginTop: '8px',
    borderLeft: '3px solid #f59e0b',
  },
  grindSection: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
  },
  warningText: {
    fontSize: '12px',
    color: '#7f1d1d',
    margin: '0 0 12px 0',
    fontStyle: 'italic',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  numberInput: {
    width: '60px',
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    textAlign: 'center' as const,
    fontSize: '13px',
  },
  label: {
    fontSize: '13px',
    color: '#64748b',
  },
  button: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  buttonDanger: {
    background: '#dc2626',
  },
  buttonSecondary: {
    background: '#64748b',
  },
  buttonFull: {
    width: '100%',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    flex: 1,
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#64748b',
  },
}

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

  if (!cfg) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>🎯 Productivity Extension</h3>
        </div>
        <div style={styles.loading}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🎯 Productivity Extension</h3>
      </div>
      
      <div style={styles.content}>
        {/* Status Display */}
        <div style={styles.statusCard}>
          <div style={{
            ...styles.modeDisplay,
            ...(cfg.mode === 'chill' ? styles.modeChill : styles.modeGrind)
          }}>
            {cfg.mode === 'chill' ? '😌' : '🔥'} {cfg.mode.toUpperCase()} MODE
          </div>
          
          {cfg.mode === "grind" && cfg.until && (
            <div style={styles.statusInfo}>
              ⏰ Until: {new Date(cfg.until).toLocaleString()}
            </div>
          )}
          
          {cfg.mode === "grind" && !cfg.until && (
            <div style={styles.statusInfo}>
              ♾️ Indefinite (no time limit)
            </div>
          )}
          
          {cfg.client_initiated && (
            <div style={styles.warningBadge}>
              ⚠️ You enabled this - only admin can disable
            </div>
          )}
        </div>

        {/* Grind Mode Controls (only show in chill mode) */}
        {cfg.mode === "chill" && (
          <div style={styles.grindSection}>
            <h4 style={styles.sectionTitle}>🚀 Enter Grind Mode</h4>
            <p style={styles.warningText}>
              ⚠️ Warning: Once enabled, you cannot disable it yourself!
            </p>
            
            <div style={styles.inputGroup}>
              <input
                type="number"
                min="0"
                value={grindHours}
                onChange={(e) => setGrindHours(parseInt(e.target.value) || 0)}
                style={styles.numberInput}
              />
              <span style={styles.label}>
                {grindHours === 0 ? 'hours (∞ indefinite)' : grindHours === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            
            <button 
              onClick={enableGrindMode} 
              style={{
                ...styles.button,
                ...styles.buttonDanger,
                ...styles.buttonFull
              }}
            >
              🔥 Enable Grind Mode
            </button>
          </div>
        )}
        
        {/* Action Buttons */}
        <div style={styles.actionGroup}>
          <button 
            onClick={fetchCfg}
            style={styles.actionButton}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = '#e2e8f0'
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = '#f1f5f9'
            }}
          >
            🔄 Refresh
          </button>
          <button 
            onClick={refreshRules}
            style={styles.actionButton}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.background = '#e2e8f0'
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.background = '#f1f5f9'
            }}
          >
            ⚡ Sync Rules
          </button>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
