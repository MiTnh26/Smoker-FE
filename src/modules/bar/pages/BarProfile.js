import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import barPageApi from '../../../api/barPageApi';
import OwnProfilePage from '../../customer/pages/OwnProfilePage';

export default function BarProfile() {
  const { barPageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have barPageId from URL, fetch the bar page to get EntityAccountId
    // Then redirect to /profile/:entityAccountId to use ProfilePage
    const fetchAndRedirect = async () => {
      if (!barPageId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch bar page to get EntityAccountId
        const res = await barPageApi.getBarPageById(barPageId);
        
        if (res?.status === 'success' && res?.data) {
          // Get EntityAccountId from bar page data
          const eaId = res.data.EntityAccountId || res.data.entityAccountId || res.data.EntityAccountID;
          if (eaId) {
            // Redirect to ProfilePage route with EntityAccountId
            navigate(`/profile/${eaId}`, { replace: true });
            return;
          }
        }
        
        // If EntityAccountId not found, show error
        console.error('EntityAccountId not found for barPageId:', barPageId);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bar page:', err);
        setLoading(false);
      }
    };

    fetchAndRedirect();
  }, [barPageId, navigate]);

  // If we have barPageId in URL, show loading while redirecting
  if (barPageId) {
    if (loading) {
      return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
    }
    // If redirect failed, show error
    return <div className="min-h-screen bg-background flex items-center justify-center">Bar page not found</div>;
  }

  // No barPageId in URL - this is own profile view (for logged-in bar owners)
  return <OwnProfilePage profileType="BarPage" />;
}
