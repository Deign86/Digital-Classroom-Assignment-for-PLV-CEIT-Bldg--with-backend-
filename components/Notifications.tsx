import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import notificationService, { askNotificationPermission, subscribeToPush, sendSubscriptionToServer, unsubscribeFromPush } from '../lib/notificationService';
import { toast } from 'sonner';

interface NotificationsProps {
  userId?: string;
}

export default function Notifications({ userId }: NotificationsProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  }, []);

  const handleRequestPermission = async () => {
    const p = await askNotificationPermission();
    setPermission(p);
    if (p === 'granted') {
      toast.success('Notifications enabled');
    } else if (p === 'denied') {
      toast.error('Notifications denied — change in browser settings to re-enable');
    }
  };

  const handleSubscribe = async () => {
    if (permission !== 'granted') {
      toast('Please allow notifications first');
      return;
    }
    const sub = await subscribeToPush();
    if (!sub) {
      toast.error('Subscription failed — check console for details');
      return;
    }
    const res = await sendSubscriptionToServer(sub, userId);
    if (res.ok) {
      setSubscribed(true);
      toast.success('Subscribed to push notifications');
    } else {
      toast('Subscribed locally — backend registration failed');
    }
  };

  const handleUnsubscribe = async () => {
    const ok = await unsubscribeFromPush();
    if (ok) {
      setSubscribed(false);
      toast('Unsubscribed from push notifications');
    } else {
      toast.error('Failed to unsubscribe');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="hidden sm:flex items-center space-x-2">
        {!supported && <p className="text-sm text-gray-500">Push not supported in this browser</p>}
        {supported && permission !== 'granted' && (
          <Button size="sm" variant="outline" onClick={handleRequestPermission}>Enable Notifications</Button>
        )}
        {supported && permission === 'granted' && !subscribed && (
          <Button size="sm" onClick={handleSubscribe}>Subscribe</Button>
        )}
        {supported && permission === 'granted' && subscribed && (
          <Button size="sm" variant="destructive" onClick={handleUnsubscribe}>Unsubscribe</Button>
        )}
      </div>
      <div className="sm:hidden">
        <Button size="sm" onClick={() => toast('Notifications available in settings')}>Notify</Button>
      </div>
    </div>
  );
}
