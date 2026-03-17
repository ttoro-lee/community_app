import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout() {
  return (
    <div className="layout">
      <Header />
      <div className="layout-body container">
        <Sidebar />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
