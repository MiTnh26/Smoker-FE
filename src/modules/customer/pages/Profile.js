import React, { useState, useEffect } from 'react';
import OwnProfilePage from './OwnProfilePage';
import { getSession } from '../../../utils/sessionManager';

export default function Profile() {
  const [profileType, setProfileType] = useState('Account');

  const detectProfileType = () => {
    // Detect profile type from session activeEntity
    const session = getSession();
    const activeEntity = session?.activeEntity || {};
    
    // Map entity type to profile type
    // Account -> Account, BarPage -> BarPage, Business -> BusinessAccount
    let detectedType = 'Account'; // Default fallback
    
    if (activeEntity?.type) {
      const entityType = activeEntity.type;
      if (entityType === 'BarPage' || entityType === 'BAR') {
        detectedType = 'BarPage';
      } else if (entityType === 'Business' || entityType === 'BusinessAccount') {
        detectedType = 'BusinessAccount';
      } else if (entityType === 'Account') {
        detectedType = 'Account';
      }
    }
    
    setProfileType(detectedType);
  };

  // Detect profile type on mount
  useEffect(() => {
    detectProfileType();
  }, []);

  // Listen for session updates (when user switches role)
  useEffect(() => {
    const handleSessionUpdate = () => {
      detectProfileType();
    };

    window.addEventListener('sessionUpdated', handleSessionUpdate);
    window.addEventListener('profileUpdated', handleSessionUpdate);

    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
      window.removeEventListener('profileUpdated', handleSessionUpdate);
    };
  }, []);

  return <OwnProfilePage profileType={profileType} />;
}
