import React from 'react';
import { PERMISSION_STYLES, MESSAGES } from '../config/constants';
import { openExtensionSettings } from '../process/extension-manager';

export const PermissionsError: React.FC = () => {
  return (
    <div style={PERMISSION_STYLES.container}>
      <strong>{MESSAGES.title}</strong>
      <p style={PERMISSION_STYLES.description}>
        {MESSAGES.description}
        <span onClick={openExtensionSettings} style={PERMISSION_STYLES.link}>
          {MESSAGES.linkText}
        </span>
        {MESSAGES.instruction}
      </p>
    </div>
  );
};
