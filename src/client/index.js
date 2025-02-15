import '../core/lockdown'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { css } from '@firebolt-dev/css'

import { loadPhysX } from './loadPhysX'
import { createClientWorld } from '../core/createClientWorld'
import { ContextMenu } from './components/ContextMenu'
import { ChatBox } from './components/ChatBox'
import { AppInspectPane } from './components/AppInspectPane'
import { AppCodePane } from './components/AppCodePane'

function App() {
  const viewportRef = useRef()
  const uiRef = useRef()
  const world = useMemo(() => createClientWorld(), [])
  const [context, setContext] = useState(null)
  const [app, setApp] = useState(null)
  const [coding, setCoding] = useState(false)
  useEffect(() => {
    const viewport = viewportRef.current
    const ui = uiRef.current
    const wsUrl = process.env.PUBLIC_WS_URL
    const apiUrl = process.env.PUBLIC_API_URL
    world.init({ viewport, ui, wsUrl, apiUrl, loadPhysX, onContext: setContext, onApp: setApp })
  }, [])
  return (
    <div
      className='App'
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100vh;
        height: 100dvh;
        .App__viewport {
          position: absolute;
          inset: 0;
        }
        .App__ui {
          position: absolute;
          inset: 0;
          pointer-events: none;
          user-select: none;
        }
      `}
    >
      <div className='App__viewport' ref={viewportRef} />
      <div className='App__ui' ref={uiRef}>
        {context && <ContextMenu key={context.id} {...context} />}
        {app && <AppInspectPane app={app} onCode={() => setCoding(true)} onClose={() => setApp(null)} />}
        {coding && <AppCodePane app={app} onClose={() => setCoding(false)} />}
        <ChatBox world={world} />
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
