import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AtaraxiaLogoCompact } from '@/components/ataraxia-logo'

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
          <Link href="/" className="flex items-center gap-2 text-xs font-body text-brand-purple font-semibold tracking-wide">
            <AtaraxiaLogoCompact size={20} />
            SofIA
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-body text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={12} />
            Volver
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-8">
          <span className="badge badge-purple mb-3 inline-flex">Legal</span>
          <h1 className="font-body text-3xl lg:text-4xl font-bold text-white mb-3">
            Terminos de Servicio
          </h1>
          <p className="text-text-muted text-xs font-body">
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
            <h2 className="text-text-primary font-semibold text-sm mb-2">2. Descripción del Servicio</h2>
            <p className="mb-2">
              SofIA es una plataforma de inteligencia artificial diseñada para clínicas de salud y estética en
              Latinoamérica. Proporciona:
            </p>
            <ul className="space-y-1 ml-3">
              {[
                'Asistente virtual por WhatsApp Business API para atención al paciente',
                'Sistema de agendamiento automático de citas',
                'Procesamiento de pagos anticipados',
                'CRM y analytics de pacientes',
                'Pipeline de oportunidades de negocio',
                'Dashboard de gestión clínica en tiempo real',
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
                Clínicas dentales y de medicina estética legalmente constituidas
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
              Queda prohibido el uso del Servicio para actividades ilegales, envío de spam, o cualquier
              actividad que viole la legislación colombiana aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">4. Facturación y Cancelación</h2>
            <p className="mb-2">
              El servicio se factura mensualmente en USD. El periodo de prueba gratuito de 7 días no requiere
              tarjeta de crédito. Después del periodo de prueba, el plan activo se factura automáticamente.
            </p>
            <p>
              Puede cancelar en cualquier momento desde el dashboard. La cancelación es efectiva al final
              del periodo de facturación vigente. No se realizan reembolsos parciales por cancelaciones
              a mitad de periodo, excepto en caso de garantía de satisfacción aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">5. Garantía de Satisfacción</h2>
            <p>
              Si dentro de los primeros 30 días de su primer mes de pago SofIA no mejora su tasa de
              agendamiento al menos un 20% respecto al periodo previo, Ataraxia IA Labs reembolsara
              el valor del mes pagado. Para aplicar la garantía, contacte soporte dentro de los 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">6. Propiedad Intelectual</h2>
            <p>
              SofIA, sus algoritmos, modelos de IA, interfaces y toda la propiedad intelectual asociada
              son propiedad exclusiva de Ataraxia IA Labs. Los datos de pacientes generados en la plataforma
              son propiedad de la clínica cliente. Ataraxia IA Labs no reclamará derechos sobre dichos datos.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">7. Limitación de Responsabilidad</h2>
            <p>
              SofIA es una herramienta de apoyo administrativo. No reemplaza el juicio médico profesional
              y no debe usarse para diagnóstico o prescripción. Ataraxia IA Labs no será responsable por
              decisiones clínicas tomadas basadas en información procesada por la plataforma.
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
          <Link href="/" className="text-brand-purple hover:text-brand-purple-light text-xs font-body transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
