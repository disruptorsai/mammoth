import { Routes, Route } from 'react-router-dom'
import { ClientProvider } from './context/ClientContext'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import PaidAdvertising from './pages/PaidAdvertising'
import SocialMedia from './pages/SocialMedia'
import TaskManagement from './pages/TaskManagement'
import SeoGeo from './pages/SeoGeo'
import Subscription from './pages/Subscription'
import Crm from './pages/Crm'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ClientProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="paid-advertising" element={<PaidAdvertising />} />
          <Route path="social-media" element={<SocialMedia />} />
          <Route path="task-management" element={<TaskManagement />} />
          <Route path="seo-geo" element={<SeoGeo />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="crm" element={<Crm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ClientProvider>
  )
}
