import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Astra Auruda | Uma ideia de cada vez',
  description: 'Converse em português, explore ideias e encontre seu próximo passo com a Astra Auruda.',
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
