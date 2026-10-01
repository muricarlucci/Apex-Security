// Entry used only by the offline browser regression script.
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'
import { DemoProvider } from '../src/context/DemoContext'
import i18n from '../src/i18n'
import '../src/index.css'

window.__i18n = i18n
window.__apiCalls = []
createRoot(document.getElementById('root')).render(
  <BrowserRouter><DemoProvider><App /></DemoProvider></BrowserRouter>,
)
