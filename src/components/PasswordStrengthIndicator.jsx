// src/components/PasswordStrengthIndicator.jsx
import React from 'react';

const PasswordStrengthIndicator = ({ password = '' }) => {
  const checkStrength = () => {
    let score = 0;
    if (password.length > 7) score++;
    if (password.length > 11) score++;
    if (/\d/.test(password)) score++; // has a digit
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; // has both lower & upper case
    if (/[^A-Za-z0-9]/.test(password)) score++; // has a special character
    return score;
  };

  const strength = checkStrength();
  const strengthLabels = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
  const barColors = [
    'bg-red-500', 
    'bg-orange-500', 
    'bg-yellow-500', 
    'bg-lime-500', 
    'bg-green-500'
  ];

  const barWidth = `${(strength / strengthLabels.length) * 100}%`;

  return (
    <div className="w-full mt-2">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${barColors[strength - 1] || 'bg-transparent'}`} 
          style={{ width: barWidth }}
        ></div>
      </div>
      <p className={`text-xs mt-1 text-right font-medium ${barColors[strength - 1]?.replace('bg-', 'text-') || 'text-gray-400'}`}>
        {strength > 0 ? strengthLabels[strength - 1] : ''}
      </p>
    </div>
  );
};

export default PasswordStrengthIndicator;