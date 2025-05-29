import { useState, useEffect } from 'react'
import './App.css'

let API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5005'

function App() {
  const [password, setPassword] = useState(() => localStorage.getItem('adminPassword') || '')
  const [enteredPw, setEnteredPw] = useState('')
  const [cfg, setCfg] = useState(null)
  const [error, setError] = useState('')
  const [grindHours, setGrindHours] = useState(1)
  const [whitelistText, setWhitelistText] = useState('')

  const headers = password ? { Authorization: `Bearer ${password}`, 'Content-Type': 'application/json' } : {}

  const fetchCfg = async () => {
    try {
      console.log(`fetching from ${API_BASE}`)
      const res = await fetch(`${API_BASE}/config`, { headers })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Error ${res.status}: ${text.substring(0, 100)}`)
      }
      if (!res.headers.get('content-type')?.includes('application/json')) {
        const text = await res.text()
        throw new Error(`Unexpected response: ${text.substring(0, 100)}`)
      }
      const data = await res.json()
      setCfg(data)
      setWhitelistText(data.whitelist.join('\n'))
    } catch (e) {
      setCfg(null)
      setError(e.message)
    }
  }

  useEffect(() => {
    if (password) {
      fetchCfg()
    }
  }, [password])

  const handleLogin = (e) => {
    e.preventDefault()
    setPassword(enteredPw)
    localStorage.setItem('adminPassword', enteredPw)
    setEnteredPw('')
  }

  const updateCfg = async (newCfg) => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newCfg)
      })
      if (!res.ok) throw new Error('Failed to update')
      const data = await res.json()
      setCfg(data)
      alert('Updated!')
    } catch (e) {
      alert(e.message)
    }
  }

  if (!password || !cfg) {
    return (
      <div className="App">
        <div className="login-container">
          <h2>🔒 Admin Access</h2>
          <form className="login-form" onSubmit={handleLogin}>
            <input 
              type="password" 
              value={enteredPw} 
              onChange={(e) => setEnteredPw(e.target.value)} 
              placeholder="Enter admin password" 
              required
            />
            <button type="submit" className="btn btn-full">Sign In</button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <h1>🎯 Productivity Control Panel</h1>
      
      {/* Status Card */}
      <div className="status-card">
        <div className={`mode-display ${cfg.mode === 'chill' ? 'mode-chill' : 'mode-grind'}`}>
          Current Mode: {cfg.mode.toUpperCase()}
        </div>
        
        {cfg.mode === 'grind' && cfg.until && (
          <div className="status-info">
            ⏰ Active until: {new Date(cfg.until).toLocaleString()}
          </div>
        )}
        
        {cfg.mode === 'grind' && !cfg.until && (
          <div className="status-info">
            ♾️ Indefinite mode (no time limit)
          </div>
        )}
        
        {cfg.client_initiated && (
          <div className="client-warning">
            ⚠️ Client-initiated grind mode - user cannot disable this themselves
          </div>
        )}
      </div>

      {/* Mode Control */}
      <div className="section">
        <h3>⚡ Mode Control</h3>
        <div className="control-group">
          <button 
            className="btn btn-secondary" 
            onClick={() => updateCfg({ mode: 'chill' })}
          >
            Switch to Chill
          </button>
        </div>
        
        <div className="control-group">
          <input 
            type="number" 
            min="0" 
            value={grindHours} 
            onChange={(e) => setGrindHours(e.target.value)} 
          />
          <span className="label">hours</span>
          <button 
            className="btn btn-danger" 
            onClick={() => updateCfg({ mode: 'grind', grind_hours: grindHours })}
          >
            Activate Grind Mode
          </button>
        </div>
        <div className="helper-text">
          💡 Set 0 hours for indefinite grind mode
        </div>
      </div>

      {/* Whitelist Control */}
      <div className="section">
        <h3>🌐 Allowed Websites</h3>
        <p className="helper-text">Enter one domain per line (e.g., example.com)</p>
        <textarea 
          value={whitelistText} 
          onChange={(e) => setWhitelistText(e.target.value)} 
          placeholder="example.com&#10;github.com&#10;stackoverflow.com"
        />
        <div className="control-group">
          <button 
            className="btn" 
            onClick={() => updateCfg({ 
              whitelist: whitelistText.split(/\n+/).map((d) => d.trim()).filter(Boolean) 
            })}
          >
            Save Whitelist
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
