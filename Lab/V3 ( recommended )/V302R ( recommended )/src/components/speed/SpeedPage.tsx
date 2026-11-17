import React, { useState } from 'react';
import type { Speed } from '../../types';
import { SpeedList } from './SpeedList';
import { SpeedForm } from './SpeedForm';
import { useCreateSpeed, useUpdateSpeed } from '../../hooks/useAPI';

export const SpeedPage: React.FC = () => {
  const [showSpeedForm, setShowSpeedForm] = useState(false);
  const [editingSpeed, setEditingSpeed] = useState<Speed | undefined>();
  const [viewingSpeed, setViewingSpeed] = useState<Speed | undefined>();
  
  const { createSpeed } = useCreateSpeed();
  const { updateSpeed } = useUpdateSpeed();

  // Speed handlers
  const handleCreateSpeed = () => {
    setEditingSpeed(undefined);
    setShowSpeedForm(true);
  };

  const handleViewSpeed = (speed: Speed) => {
    setViewingSpeed(speed);
    setShowSpeedForm(true);
  };

  const handleEditSpeed = (speed: Speed) => {
    setEditingSpeed(speed);
    setViewingSpeed(undefined);
    setShowSpeedForm(true);
  };

  const handleSaveSpeed = async (data: Partial<Speed>) => {
    try {
      if (editingSpeed) {
        await updateSpeed(editingSpeed.id.toString(), data);
      } else {
        await createSpeed(data);
      }
      setShowSpeedForm(false);
      setEditingSpeed(undefined);
      setViewingSpeed(undefined);
    } catch (error) {
      console.error('Failed to save speed:', error);
    }
  };

  const handleCancelSpeedForm = () => {
    setShowSpeedForm(false);
    setEditingSpeed(undefined);
    setViewingSpeed(undefined);
  };

  const handleDeleteSpeed = () => {
    setShowSpeedForm(false);
    setEditingSpeed(undefined);
    setViewingSpeed(undefined);
  };

  // Show form if needed
  if (showSpeedForm) {
    return (
      <SpeedForm
        speed={viewingSpeed || editingSpeed}
        onSave={handleSaveSpeed}
        onCancel={handleCancelSpeedForm}
        onDelete={handleDeleteSpeed}
        readOnly={!!viewingSpeed}
      />
    );
  }

  // Default view: Speed list
  return (
    <SpeedList
      onEdit={handleEditSpeed}
      onView={handleViewSpeed}
      onCreate={handleCreateSpeed}
    />
  );
};
