import localFont from 'next/font/local';

export const microgrammaBold = localFont({
  src: '../public/fonts/microgramma-bold.otf',
  weight: '800',
  display: 'swap',
  variable: '--font-microgramma',
});

export const geistSans = localFont({
  src: '../public/fonts/geist-variable.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
});
