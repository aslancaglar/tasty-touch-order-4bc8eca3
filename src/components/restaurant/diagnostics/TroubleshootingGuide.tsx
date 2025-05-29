
import React from "react";

const TroubleshootingGuide: React.FC = () => {
  return (
    <div className="bg-blue-50 p-4 rounded-md">
      <h4 className="font-medium mb-2">Troubleshooting Steps:</h4>
      <ol className="text-sm space-y-1 list-decimal list-inside">
        <li>Ensure QZ Tray desktop application is installed and running</li>
        <li>Check that printers are connected and powered on</li>
        <li>Verify printer drivers are installed</li>
        <li>If using HTTPS, ensure certificate is properly installed in QZ Tray</li>
        <li>Try running QZ Tray as administrator</li>
        <li>Check firewall/antivirus settings</li>
        <li>Verify QZ Tray certificate is trusted by the browser</li>
        <li>For persistent signing errors, try reinstalling QZ Tray certificate</li>
      </ol>
    </div>
  );
};

export default TroubleshootingGuide;
