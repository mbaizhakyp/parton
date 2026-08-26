import { createRoot } from 'react-dom/client'
// Route-based code splitting keeps authenticated/collaborative pages out of
// the initial bundle for a public top-level route such as `/`.
import { routes } from '@generouted/react-router/lazy'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { installClientErrorReporter } from 'deepspace'
import { installStaleChunkRecovery } from './stale-chunk-recovery'

// Uncaught browser errors → this app's Worker → `deepspace logs` (tagged
// CLIENT). Dedupes and caps itself; never throws. The admin-page error log is
// separate — see src/lib/errorLog.ts.
installClientErrorReporter()
import './styles.css'

const router = createBrowserRouter(routes)
installStaleChunkRecovery(router)

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
