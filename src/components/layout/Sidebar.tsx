import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export function Sidebar() {
  return (
    <aside className="app-sidebar" aria-label="Navegação principal">
      <div className="sidebar-caption">ESPAÇO DE TRABALHO</div>
      <nav className="sidebar-nav">
        <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">⌂</span>
          <span>Visão geral</span>
        </NavLink>
        <NavLink to="/app/projetos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">▤</span>
          <span>Projetos</span>
        </NavLink>
        <span className="sidebar-link sidebar-link--disabled" aria-disabled="true">
          <span className="nav-icon" aria-hidden="true">▦</span>
          <span>Quadros Kanban</span>
          <span className="nav-soon">EM BREVE</span>
        </span>
        <NavLink to="/app/perfil" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">◉</span>
          <span>Perfil</span>
        </NavLink>
      </nav>

      <div className="sidebar-version">SPRINT 02 / USUÁRIO E PROJETOS</div>
    </aside>
  );
}
