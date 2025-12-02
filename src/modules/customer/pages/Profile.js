import React from 'react';
import OwnProfilePage from './OwnProfilePage';
import { getSession } from '../../../utils/sessionManager';

export default function Profile() {
  // Detect profile type from session activeEntity
  const session = getSession();
  const activeEntity = session?.activeEntity || {};
  
  // Map entity type to profile type
  // Account -> Account, BarPage -> BarPage, Business -> BusinessAccount
  let profileType = 'Account'; // Default fallback
  
  if (activeEntity?.type) {
    const entityType = activeEntity.type;
    if (entityType === 'BarPage' || entityType === 'BAR') {
      profileType = 'BarPage';
    } else if (entityType === 'Business' || entityType === 'BusinessAccount') {
      profileType = 'BusinessAccount';
    } else if (entityType === 'Account') {
      profileType = 'Account';
    }
  }
  
  return <OwnProfilePage profileType={profileType} />;
}
