// src/components/layout/Sidebar.js
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import "../../styles/modules/newsfeed.css";

export default function CustomerSidebar() {
  const { t } = useTranslation();
  
  return (
    <aside className="newsfeed-sidebar-left">
      <div className="sidebar-user-profile">
        <div className="sidebar-user-avatar">
          <User size={40} />
        </div>
        <div className="sidebar-user-info">
          <h3>{t('common.user')}</h3>
          <p>@username</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link to="#" className="sidebar-nav-item"><span>{t('sidebar.home')}</span></Link>
        <Link to="#" className="sidebar-nav-item"><span>{t('sidebar.registerBusiness')}</span></Link>
        <Link to="#" className="sidebar-nav-item"><span>{t('sidebar.groups')}</span></Link>
        <Link to="#" className="sidebar-nav-item"><span>{t('sidebar.events')}</span></Link>
      </nav>
    </aside>
  );
}
