// src/components/layout/common/RightSidebar.js
import React from "react";
import { useTranslation } from "react-i18next";
import "../../../styles/layouts/rightSidebar.css";

const mockContacts = [
  { id: 1, name: "Meta AI", online: true },
  { id: 2, name: "Minh Trần", online: true },
  { id: 3, name: "Phạm Khánh Huyền", online: false },
  { id: 4, name: "Kiều Đình Nhật", online: true },
  { id: 5, name: "Hoàng Công Vinh", online: true },
  { id: 6, name: "Nguyễn Tấn Việt", online: false },
];

export default function RightSidebar() {
  const { t } = useTranslation();
  return (
    <aside className="right-sidebar">
      <div className="right-sidebar__section">
        <h4 className="right-sidebar__title">{t('layout.contacts')}</h4>
        <ul className="right-sidebar__list">
          {mockContacts.map((c) => (
            <li
              key={c.id}
              className="right-sidebar__item"
              onClick={() => window.__openChat && window.__openChat(c)}
            >
              <div className="right-sidebar__avatar" aria-hidden>
                {c.name.charAt(0)}
                {c.online && <span className="right-sidebar__status" />}
              </div>
              <span className="right-sidebar__name">{c.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}


