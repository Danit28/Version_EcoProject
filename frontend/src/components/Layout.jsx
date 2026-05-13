import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Factory,
  LayoutDashboard,
  MapPinHouse,
  Package,
  Shuffle
} from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/materias-primas', label: 'Materias Primas', icon: Activity },
  { to: '/productos', label: 'Productos y Formulas', icon: Package },
  { to: '/sedes', label: 'Sedes', icon: MapPinHouse },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/distribucion', label: 'Distribucion', icon: Shuffle },
  { to: '/produccion', label: 'Produccion', icon: Factory }
];

export function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">V</div>
          <div>
            <h1>Version Eco</h1>
            <p>Sistema de inventario</p>
          </div>
        </div>

        <nav className="menu-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={link.to === '/'}
            >
              <link.icon size={16} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">A</div>
          <div>
            <strong>Admin</strong>
            <small>admin@versioneco.com</small>
          </div>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
