import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
    --ink: #1b1d2b;
    --muted: #6b7280;
    --soft: #9aa3b2;
    --accent: #ff7a45;
    --accent-2: #2f80ed;
    --holiday: #7c3aed;
    --surface: #ffffff;
    --surface-alt: #f5f6fb;
    --border: #e3e6f0;
    --shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    --radius: 16px;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    background: radial-gradient(circle at top, #fff4e6 0%, #f0f6ff 45%, #f8fafc 100%);
    min-height: 100vh;
    -webkit-overflow-scrolling: touch;
  }

  html {
    scroll-behavior: smooth;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  button,
  input,
  select,
  textarea {
    font-family: inherit;
  }

  h1,
  h2,
  h3 {
    font-family: 'Space Grotesk', sans-serif;
    margin: 0;
  }
`;
