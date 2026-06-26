"use client"
import { useState, useEffect } from 'react'

export default function StealthDemo() {
  const [announcements, setAnnouncements] = useState([])
  const [addr, setAddr] = useState('')
  const [ephem, setEphem] = useState('')

  async function load() {
    const res = await fetch('http://localhost:4000/announcements')
    const data = await res.json()
    setAnnouncements(data.announcements || [])
  }

  useEffect(() => { load() }, [])

  async function post() {
    await fetch('http://localhost:4000/announcements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stealthAddress: addr, ephemeralR: ephem })
    })
    setAddr('')
    setEphem('')
    load()
  }

  return (
    <section className="p-6 bg-muted rounded-md">
      <h3 className="text-lg font-semibold mb-2">Stealth Demo</h3>
      <div className="flex gap-2 mb-4">
        <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="stealth address" className="input" />
        <input value={ephem} onChange={e=>setEphem(e.target.value)} placeholder="ephemeral R" className="input" />
        <button onClick={post} className="btn">Announce</button>
      </div>
      <div>
        {announcements.map(a => (
          <div key={a.id} className="p-2 border rounded mb-2">
            <div className="text-sm">{a.stealthAddress}</div>
            <div className="text-xs text-muted-foreground">{a.ephemeralR}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
