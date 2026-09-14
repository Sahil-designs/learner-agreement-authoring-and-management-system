import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Note: deliberately NOT wrapped in <React.StrictMode>. Strict mode double-
// invokes effects in development, which fights the contentEditable sync in the
// editor and makes the caret jump on mount.
createRoot(document.getElementById('root')).render(<App />)
