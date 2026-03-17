'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface FacebookLoginProps {
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
}

export default function FacebookLogin({ onSuccess, onError }: FacebookLoginProps) {
  const { data: session } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize Facebook SDK
  useEffect(() => {
    // Get App ID from environment (you need to set NEXT_PUBLIC_FACEBOOK_APP_ID)
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';

    if (!appId || appId === 'your_facebook_app_id_here') {
      console.warn('Facebook App ID not configured');
      return;
    }

    // Load Facebook SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
      setIsLoaded(true);
      console.log('[Facebook SDK] Initialized with App ID:', appId);
    };

    // Load SDK script
    (function (d, s, id) {
      var js: any,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        setIsLoaded(true);
        return;
      }
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      (fjs as any).parentNode.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');
  }, []);

  const handleLogin = () => {
    if (!isLoaded || !window.FB) {
      onError?.('Facebook SDK not loaded. Please refresh the page.');
      return;
    }

    setIsConnecting(true);

    // Check current login status first
    window.FB.getLoginStatus(function (response: any) {
      console.log('[Facebook] Current status:', response.status);

      if (response.status === 'connected') {
        // Already connected - save the token
        saveFacebookConnection(response.authResponse);
      } else {
        // Not connected - show login dialog
        window.FB.login(
          function (loginResponse: any) {
            console.log('[Facebook] Login response:', loginResponse);

            if (loginResponse.authResponse) {
              saveFacebookConnection(loginResponse.authResponse);
            } else {
              setIsConnecting(false);
              onError?.('Facebook login was cancelled or failed');
            }
          },
          { scope: 'public_profile' } // Only basic permission - no review needed
        );
      }
    });
  };

  const saveFacebookConnection = async (authResponse: any) => {
    try {
      // Get user profile
      window.FB.api(
        '/me',
        { fields: 'id,name,email,picture' },
        async function (profileResponse: any) {
          console.log('[Facebook] Profile:', profileResponse);

          // Save to database via API
          const res = await fetch('/api/channels/facebook-connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: authResponse.accessToken,
              userID: authResponse.userID,
              name: profileResponse.name,
              email: profileResponse.email,
              picture: profileResponse.picture?.data?.url,
              userId: session?.user?.id
            })
          });

          const data = await res.json();

          if (res.ok) {
            onSuccess?.(data);
          } else {
            onError?.(data.error || 'Failed to save connection');
          }

          setIsConnecting(false);
        }
      );
    } catch (error: any) {
      setIsConnecting(false);
      onError?.(error.message || 'Failed to connect');
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={!isLoaded || isConnecting}
      className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
      {isConnecting ? 'Connecting...' : 'Connect Facebook'}
    </button>
  );
}