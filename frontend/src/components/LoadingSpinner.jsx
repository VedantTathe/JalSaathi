import React from 'react';
import clsx from 'clsx';

const LoadingSpinner = ({ size = 'medium', className, ...props }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
    xlarge: 'h-12 w-12',
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary-500',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
};

export default LoadingSpinner;