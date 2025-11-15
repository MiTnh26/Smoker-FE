import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import comboApi from "../../../api/comboApi";
import { useParams } from "react-router-dom";

export default function BarMenuCombo() {
  const { t } = useTranslation();
  const { barPageId } = useParams();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchCombos = async () => {
      try {
        setLoading(true);
        const res = await comboApi.getCombosByBar(barPageId);
        setCombos(res.data || []);
      } catch (err) {
        console.error(err);
        setMessage(t("bar.errorLoadingCombos"));
      } finally {
        setLoading(false);
      }
    };

    fetchCombos();
  }, [barPageId]);

  if (loading) return <div className="text-center py-4">{t("bar.loadingMenu")}</div>;

  return (
    <div className="profile-card mt-6">
      <h3 className="section-title text-2xl font-bold mb-4">{t("bar.menuComboTitle")}</h3>

      {message && <p className="text-red-500 mb-4">{message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {combos.length ? (
          combos.map((combo) => (
            <div
              key={combo.ComboId}
              className="relative bg-gradient-to-br from-purple-500 to-indigo-500 text-white p-3 rounded-xl shadow-2xl transform transition duration-300 hover:scale-105 hover:shadow-3xl"
            >
              <h4 className="text-sm font-semibold mb-1">{combo.ComboName}</h4>
              <p className="text-xs opacity-80">{combo.Price.toLocaleString()} đ</p>

              <i
                className="bx bx-edit-alt text-yellow-300 cursor-pointer absolute top-2 right-2 text-lg hover:text-white transition-colors"
                title={t("bar.editCombo")}
              // onClick={() => handleEdit(combo.ComboId)}
              ></i>
            </div>

          ))
        ) : (
          <p className="text-gray-400 col-span-full text-center">{t("bar.noCombos")}</p>
        )}
      </div>
    </div>
  );
}
