import { Link } from 'react-router-dom';
import { useStorefrontConfig } from '../lib/storefront-config';

export function Footer() {
  const { settings } = useStorefrontConfig();
  const footer = settings.footer;

  const brand = settings.logoUrl ? (
    <img
      className="footer-logo"
      src={settings.logoUrl}
      alt={settings.logoAlt || settings.siteName}
    />
  ) : (
    settings.siteName
  );

  return (
    <footer className="site-footer">
      <section className="newsletter">
        <div>
          <p className="eyebrow">{footer.newsletterEyebrow}</p>
          <h2>{footer.newsletterHeading}</h2>
        </div>

        <form onSubmit={(event) => event.preventDefault()}>
          <input
            type="email"
            placeholder="Email address"
            aria-label="Email address"
          />
          <button type="submit">Subscribe</button>
        </form>
      </section>

      <div className="footer-grid">
        <div>
          <Link
            className={`footer-wordmark ${
              settings.logoUrl ? 'footer-wordmark--image' : ''
            }`}
            to="/"
          >
            {brand}
          </Link>

          <p>{footer.brandDescription}</p>
        </div>

        {footer.columns.map((column) => (
          <div key={column.heading}>
            <h3>{column.heading}</h3>

            {column.links.map((link) => (
              <Link key={`${link.href}-${link.label}`} to={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        <div>
          <h3>{footer.supportHeading}</h3>

          {footer.supportLines.map((line) => (
            <p key={line}>{line}</p>
          ))}

          {settings.supportEmail ? (
            <a href={`mailto:${settings.supportEmail}`}>
              {settings.supportEmail}
            </a>
          ) : null}

          {settings.supportPhone ? (
            <a href={`tel:${settings.supportPhone}`}>
              {settings.supportPhone}
            </a>
          ) : null}
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copyright">
          <span>
            © {new Date().getFullYear()} {settings.siteName}
          </span>

          <span className="footer-credit-separator"> · </span>

          <a
            href="https://www.abdullahsaqib.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="developer-credit"
          >
            Developed by Abdullah Saqib
          </a>
        </span>

        <span className="footer-legal-links">
          {footer.legalLinks.map((link, index) => (
            <span key={link.href}>
              {index ? ' · ' : ''}
              <Link to={link.href}>{link.label}</Link>
            </span>
          ))}
        </span>
      </div>
    </footer>
  );
}
