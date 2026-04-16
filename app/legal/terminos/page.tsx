import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terminos de Servicio — SofIA by Ataraxia IA Labs',
  description: 'Terminos y condiciones de uso de la plataforma SofIA.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-void">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-surface sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono text-brand-purple font-semibold tracking-wide">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.6" />
              <circle cx="24" cy="24" r="5" fill="#8B5CF6" opacity="0.8" />
              <circle cx="24" cy="24" r="2" fill="#F5F3FF" />
            </svg>
            SofIA
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={12} />
            Volver
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-8">
          <span className="badge badge-purple mb-3 inline-flex">Legal</span>
          <h1 className="font-mono text-3xl lg:text-4xl font-bold text-white mb-3">
            Terminos de Servicio
          </h1>
          <p className="text-text-muted text-xs font-mono">
            Ultima actualizacion: febrero de 2026 &mdash; Version 2.0
          </p>
        </div>

        <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-5 space-y-6 text-text-secondary text-sm font-body leading-relaxed">

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">1. Aceptacion de los Terminos</h2>
            <p>
              Al acceder y usar la plataforma SofIA de Ataraxia IA Labs (&ldquo;la Plataforma&rdquo;, &ldquo;el Servicio&rdquo;),
              usted acepta quedar vinculado por estos Terminos de Servicio. Si no esta de acuerdo con estos terminos,
              por favor no use la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">2. Descripcion del Servicio</h2>
            <p className="mb-2">
              SofIA es una plataforma de inteligencia artificial disenada para clinicas de salud y estetica en
              Latinoamerica. Proporciona:
            </p>
            <ul className="space-y-1 ml-3">
              {[
                'Asistente virtual por WhatsApp Business API para atencion al paciente',
                'Sistema de agendamiento automatico de citas',
                'Procesamiento de pagos anticipados',
                'CRM y analytics de pacientes',
                'Pipeline de oportunidades de negocio',
                'Dashboard de gestion clinica en tiempo real',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-brand-purple mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">3. Uso Aceptable</h2>
            <p className="mb-2">El Servicio esta disenado exclusivamente para uso por:</p>
            <ul className="space-y-1 ml-3">
              <li className="flex items-start gap-2">
                <span className="text-brand-purple mt-0.5">&#8226;</span>
                Clinicas dentales y de medicina estetica legalmente constituidas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-purple mt-0.5">&#8226;</span>
                Centros de medicina general y especializada
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-purple mt-0.5">&#8226;</span>
                Profesionales de salud independientes con RUT vigente
              </li>
            </ul>
            <p className="mt-2">
              Queda prohibido el uso del Servicio para actividades ilegales, envio de spam, o cualquier
              actividad que viole la legislacion colombiana aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">4. Facturacion y Cancelacion</h2>
            <p className="mb-2">
              El servicio se factura mensualmente en USD. El periodo de prueba gratuito de 7 dias no requiere
              tarjeta de credito. Despues del periodo de prueba, el plan activo se factura automaticamente.
            </p>
            <p>
              Puede cancelar en cualquier momento desde el dashboard. La cancelacion es efectiva al final
              del periodo de facturacion vigente. No se realizan reembolsos parciales por cancelaciones
              a mitad de periodo, excepto en caso de garantia de satisfaccion aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">5. Garantia de Satisfaccion</h2>
            <p>
              Si dentro de los primeros 30 dias de su primer mes de pago SofIA no mejora su tasa de
              agendamiento al menos un 20% respecto al periodo previo, Ataraxia IA Labs reembolsara
              el valor del mes pagado. Para aplicar la garantia, contacte soporte dentro de los 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">6. Propiedad Intelectual</h2>
            <p>
              SofIA, sus algoritmos, modelos de IA, interfaces y toda la propiedad intelectual asociada
              son propiedad exclusiva de Ataraxia IA Labs. Los datos de pacientes generados en la plataforma
              son propiedad de la clinica cliente. Ataraxia IA Labs no reclamara derechos sobre dichos datos.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">7. Limitacion de Responsabilidad</h2>
            <p>
              SofIA es una herramienta de apoyo administrativo. No reemplaza el juicio medico profesional
              y no debe usarse para diagnostico o prescripcion. Ataraxia IA Labs no sera responsable por
              decisiones clinicas tomadas basadas en informacion procesada por la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">8. Contacto</h2>
            <p>
              Para consultas sobre estos terminos: <span className="text-brand-purple">legal@ataraxiaialabs.ai</span>
            </p>
          </section>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-brand-purple hover:text-brand-purple-light text-xs font-mono transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
