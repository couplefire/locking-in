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
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input type="password" value={enteredPw} onChange={(e) => setEnteredPw(e.target.value)} placeholder="Password" />
          <button type="submit">Login</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="App">
      <h2>Current Mode: {cfg.mode.toUpperCase()}</h2>
      {cfg.mode === 'grind' && cfg.until && <p>Until: {new Date(cfg.until).toLocaleString()}</p>}
      {cfg.mode === 'grind' && !cfg.until && <p>Mode: Indefinite (no time limit)</p>}
      {cfg.client_initiated && <p>⚠️ Client-initiated grind mode</p>}

      <section>
        <h3>Change Mode</h3>
        <button onClick={() => updateCfg({ mode: 'chill' })}>Switch to Chill</button>
        <div>
          <input type="number" min="0" value={grindHours} onChange={(e) => setGrindHours(e.target.value)} /> Hours (0 for indefinite)
          <button onClick={() => updateCfg({ mode: 'grind', grind_hours: grindHours })}>
            Activate Grind
          </button>
        </div>
      </section>

      <section>
        <h3>Edit Whitelist (one domain per line)</h3>
        <textarea value={whitelistText} onChange={(e) => setWhitelistText(e.target.value)} rows={10} cols={50} />
        <br />
        <button onClick={() => updateCfg({ whitelist: whitelistText.split(/\n+/).map((d) => d.trim()).filter(Boolean) })}>
          Save Whitelist
        </button>
      </section>
    </div>
  )
}

export default App
