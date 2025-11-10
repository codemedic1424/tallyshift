// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ---- PWA & Manifest ---- */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ffffff" />

        {/* ---- iOS Home Screen Icons ---- */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon-180.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/apple-touch-icon-167.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-touch-icon-152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/apple-touch-icon-120.png"
        />

        {/* ---- iOS Web App Settings ---- */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TallyShift" />

        {/* ---- Optional Viewport (you can move to _app.js if already set) ---- */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Head>

      <body style={{ backgroundColor: '#ffffff' }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
