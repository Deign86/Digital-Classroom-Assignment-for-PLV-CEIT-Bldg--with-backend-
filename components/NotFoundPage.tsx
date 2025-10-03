import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onNavigateHome?: () => void;
  onGoBack?: () => void;
  message?: string;
}

export default function NotFoundPage({ 
  onNavigateHome, 
  onGoBack, 
  message = "The page you're looking for doesn't exist."
}: NotFoundPageProps) {
  
  const handleGoHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      // Fallback to reload the page to reset state
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      // Fallback to browser back
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="text-center p-8">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
            <p className="text-gray-600 text-sm">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleGoHome} 
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGoBack}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Additional Help */}
          <div className="mt-6 text-xs text-gray-500">
            <p>If you believe this is an error, please contact your administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Secure 404 component that doesn't expose system information
export function SecureNotFoundPage({ 
  userRole, 
  onNavigateHome, 
  onGoBack 
}: {
  userRole?: string;
  onNavigateHome?: () => void;
  onGoBack?: () => void;
}) {
  // Don't expose different messages based on user role for security
  const secureMessage = "The requested resource could not be found.";
  
  return (
    <NotFoundPage 
      message={secureMessage}
      onNavigateHome={onNavigateHome}
      onGoBack={onGoBack}
    />
  );
}