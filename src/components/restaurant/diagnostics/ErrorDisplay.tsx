
import React from "react";

interface ErrorDisplayProps {
  errors: string[];
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div>
      <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
      <div className="space-y-1">
        {errors.map((error, index) => (
          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ErrorDisplay;
