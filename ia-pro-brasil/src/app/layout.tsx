import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Norte IA | Pense com mais clareza',description:'Assistente de IA premium para transformar perguntas em movimento.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
