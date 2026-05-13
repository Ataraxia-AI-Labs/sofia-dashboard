'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { HyperPersuasivePage } from '@/components/hyper-persuasive-page'
import {
  Database, Zap, Palette, Store, Webhook, Brain,
  Search, Cpu, GitBranch, Layers, MessageCircle, Tag,
  Calendar, Share2, Globe, BarChart3, Users, Rocket,
  ShieldCheck, Sparkles, FileJson,
} from 'lucide-react'

const CONFIGS: Record<string, Parameters<typeof HyperPersuasivePage>[0]> = {
  datalake: {
    icon: <Database size={38} strokeWidth={1.3} />,
    title: 'Data Lake',
    eta: 'En desarrollo · Próximamente',
    headline: 'Tu memoria colectiva.',
    subhead: 'Cada conversación, cita y decisión de tu clínica se vuelve conocimiento entrenable — tuyo, no de un proveedor genérico.',
    features: [
      { icon: <Search size={18} strokeWidth={1.5} />, title: 'Búsqueda semántica', description: 'Encuentra cualquier conversación antigua por significado, no por keyword.' },
      { icon: <Cpu size={18} strokeWidth={1.5} />, title: 'Fine-tuning propio', description: 'Entrena una versión de SofIA con la voz exacta de tu marca.' },
      { icon: <Layers size={18} strokeWidth={1.5} />, title: 'Memoria inteligente', description: 'Cada interaccion indexada y lista para consultar en segundos.' },
      { icon: <FileJson size={18} strokeWidth={1.5} />, title: 'Exports libres', description: 'Descarga tu data en cualquier formato cuando quieras. Sin ataduras.' },
    ],
    faq: [
      { q: '¿Mi data queda en Ataraxia o en mi propio stack?', a: 'Tuya. Vive en tu tenant Supabase. Puedes migrarla fuera en cualquier momento con los exports.' },
      { q: '¿Cuánto cuesta?', a: 'Add-on al plan Business. Precio por GB indexado + consultas al mes. Detalle exacto al abrir beta.' },
      { q: '¿Puedo entrenar un modelo solo con mis datos?', a: 'Sí. Eso es exactamente el flow — tus interacciones curadas → fine-tune sobre Llama 3 o Qwen.' },
    ],
    footerQuote: 'Los datos de una clínica son el mayor activo. Data Lake los vuelve inteligencia entrenable.',
    formUseCaseOptions: ['Entrenar mi propio modelo', 'Análisis histórico profundo', 'Integración con BI externo', 'Otro'],
  },
  automatizaciones: {
    icon: <Zap size={38} strokeWidth={1.3} />,
    title: 'Automatizaciones visuales',
    eta: 'Próximamente',
    headline: 'Lo que hoy haces en 10 pasos, en uno.',
    subhead: 'Flujos drag & drop entre SofIA, tu calendario, facturación e inventario — sin escribir una línea.',
    features: [
      { icon: <GitBranch size={18} strokeWidth={1.5} />, title: 'Editor visual', description: 'Nodos, ramas condicionales, validaciones. Intuitivo para no-devs.' },
      { icon: <Zap size={18} strokeWidth={1.5} />, title: 'Triggers por evento', description: 'Cita creada, pago recibido, mensaje llega, lead hot. Dispara acciones.' },
      { icon: <Layers size={18} strokeWidth={1.5} />, title: 'Plantillas clínicas', description: 'Recordatorios post-op, encuestas NPS, reactivación de no-shows.' },
      { icon: <ShieldCheck size={18} strokeWidth={1.5} />, title: 'Ejecución observable', description: 'Logs por paso. Si un flujo falla, sabes exactamente dónde.' },
    ],
    faq: [
      { q: '¿Qué diferencia tiene vs Zapier?', a: 'Zapier es genérico. Esto es nativo a clínicas: nodos que entienden citas, pacientes, consentimientos.' },
      { q: '¿Puedo usar IA adentro del flujo?', a: 'Sí. Cada nodo puede llamar a SofIA para decidir ramas (ej. "SofIA, ¿esto es una emergencia?").' },
    ],
  },
  contenido: {
    icon: <Palette size={38} strokeWidth={1.3} />,
    title: 'Content Studio',
    eta: 'En desarrollo · Próximamente',
    headline: 'Contenido diario sin bloqueo creativo.',
    subhead: 'IA que genera posts, carousels y reels en la voz de tu clínica. Tú apruebas. Ella publica.',
    features: [
      { icon: <Sparkles size={18} strokeWidth={1.5} />, title: 'Genera por formato', description: 'Posts, carousels, reels, stories. Calendarizados por ti.' },
      { icon: <Users size={18} strokeWidth={1.5} />, title: 'Aprende tu voz', description: 'Analiza tu feed actual y replica tono, vocabulario, hashtags.' },
      { icon: <MessageCircle size={18} strokeWidth={1.5} />, title: 'Prompts cortos', description: 'Escribe "post sobre limpieza dental con humor" y obtienes 5 variantes.' },
      { icon: <Share2 size={18} strokeWidth={1.5} />, title: 'Publica a Meta', description: 'Instagram y Facebook directo. Fecha y hora programadas.' },
    ],
    faq: [
      { q: '¿Reemplaza a mi community manager?', a: 'No. Le ahorra horas. Su rol es curar y aprobar, no redactar desde cero.' },
      { q: '¿Y copyright de imágenes?', a: 'Usamos tu banco propio + stock licenciado. Cero scraping.' },
    ],
  },
  marketplace: {
    icon: <Store size={38} strokeWidth={1.3} />,
    title: 'Marketplace',
    eta: 'En desarrollo · Próximamente',
    headline: 'Un click. Integrado.',
    subhead: 'Google Calendar, Stripe, Meta Ads, HubSpot, 50+ apps — conectadas a SofIA sin setup técnico.',
    features: [
      { icon: <Layers size={18} strokeWidth={1.5} />, title: 'Directorio curado', description: 'Integraciones verificadas por el equipo Ataraxia. Calidad garantizada.' },
      { icon: <ShieldCheck size={18} strokeWidth={1.5} />, title: 'OAuth2 un click', description: 'Sin tokens manuales, sin config técnica. Login y listo.' },
      { icon: <Cpu size={18} strokeWidth={1.5} />, title: 'Certificaciones', description: 'Plugins pasan auditorias de seguridad y desempeno antes de publicarse.' },
      { icon: <Rocket size={18} strokeWidth={1.5} />, title: 'Developer Portal', description: 'Publica tus propios conectores. Comisión por instalación.' },
    ],
    integrations: [
      { name: 'Google Calendar' }, { name: 'Stripe' }, { name: 'Meta Ads' },
      { name: 'HubSpot' }, { name: 'Mailchimp' }, { name: 'Zapier' },
      { name: 'Notion' }, { name: 'Slack' }, { name: 'Airtable' },
    ],
  },
  webhooks: {
    icon: <Webhook size={38} strokeWidth={1.3} />,
    title: 'Webhooks',
    eta: 'En desarrollo · Próximamente',
    headline: 'Conecta SofIA con lo que sea.',
    subhead: 'Eventos en tiempo real con firma digital y reintentos automáticos. Tu sistema externo siempre recibe la notificación.',
    features: [
      { icon: <Zap size={18} strokeWidth={1.5} />, title: 'Eventos granulares', description: 'Cita, pago, mensaje, lead, paciente. Cada cambio notifica a tu sistema.' },
      { icon: <ShieldCheck size={18} strokeWidth={1.5} />, title: 'Firma digital', description: 'Cada evento viene firmado para que sepas que viene de Ataraxia de verdad.' },
      { icon: <GitBranch size={18} strokeWidth={1.5} />, title: 'Reintentos', description: 'Si tu sistema no responde, reintentamos automaticamente. Nada se pierde.' },
      { icon: <BarChart3 size={18} strokeWidth={1.5} />, title: 'Dashboard entregas', description: 'Ve cuáles webhooks fueron entregados, fallos y replay manual.' },
    ],
  },
  network: {
    icon: <Brain size={38} strokeWidth={1.3} />,
    title: 'Red Neuronal Inter-Clínica',
    eta: 'Beta privada · Lista de espera',
    headline: 'Cómo te comparas — sin revelar nada.',
    subhead: 'Benchmarks anónimos entre clínicas de estética y dental en LATAM. Ve si tu conversión, ticket promedio y retención están sobre el promedio de tu vertical.',
    features: [
      { icon: <Globe size={18} strokeWidth={1.5} />, title: 'Métricas por vertical', description: 'Estética, dental, spa. Benchmarks por segmento y ciudad.' },
      { icon: <ShieldCheck size={18} strokeWidth={1.5} />, title: 'Zero data leak', description: 'Solo agregados cifrados. Tu data nunca es identificable.' },
      { icon: <BarChart3 size={18} strokeWidth={1.5} />, title: 'Alertas P25', description: 'Cuando un indicador cae bajo el cuartil 25, te avisa con acciones.' },
      { icon: <Users size={18} strokeWidth={1.5} />, title: 'Playbooks top', description: 'Ve qué hacen las clínicas top performers (opt-in anónimo).' },
    ],
    faq: [
      { q: '¿Mis datos son visibles para otros?', a: 'Jamás. Solo agregados estadísticos. Ni siquiera el equipo Ataraxia ve data identificable.' },
      { q: '¿Para qué me sirve si no sé con quién comparo?', a: 'Ves "tu conversión está en el P65 del vertical estética Bogotá". Sabes si vas bien o no.' },
    ],
    footerQuote: 'La marea sube a todas las clínicas cuando compartimos mejores prácticas anónimas.',
  },
}

export default function ComingSoonPage() {
  const params = useParams<{ feature: string }>()
  const key = params?.feature
  const config = key ? CONFIGS[key] : undefined
  // S154: antes llamábamos notFound() pero en client components sin un
  // not-found.tsx adyacente eso dispara el error boundary ("¡Algo salió
  // mal!"). Para un slug fuera del catálogo mostramos empty state limpio
  // con CTA de regreso, no un crash.
  if (!config) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <h1 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">Funcionalidad no disponible</h1>
        <p className="text-[12px] font-body text-text-dim">Esta sección no existe o todavía no la lanzamos. Vuelve al dashboard para ver lo que sí está activo.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold hover:bg-brand-purple-dark transition-colors"
        >
          Volver al dashboard
        </Link>
      </div>
    )
  }
  return <HyperPersuasivePage {...config} />
}
