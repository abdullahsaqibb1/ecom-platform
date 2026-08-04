import { Link } from 'react-router-dom';
import { useStorefrontConfig } from '../lib/storefront-config';

export function AnnouncementBar() {
  const { settings } = useStorefrontConfig();
  if (!settings.announcementText) return null;
  return <div className="announcement"><span>{settings.announcementText}</span>{settings.announcementLinkUrl && settings.announcementLinkLabel ? <Link to={settings.announcementLinkUrl}>{settings.announcementLinkLabel}</Link> : null}</div>;
}
