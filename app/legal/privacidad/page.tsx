import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata = {
  title: 'Politica de Privacidad — SofIA by Ataraxia IA Labs',
  description: 'Politica de privacidad y tratamiento de datos personales de la plataforma SofIA.',
}

export default function PrivacidadPage() {
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
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-purple inline-flex">Legal</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-mono font-semibold">
              <Shield size={10} />
              Ley 1581 de 2012 — HABEAS DATA Colombia
            </div>
          </div>
          <h1 className="font-mono text-3xl lg:text-4xl font-bold text-white mb-3">
            Politica de Privacidad
          </h1>
          <p className="text-text-muted text-xs font-mono">
            Ultima actualizacion: febrero de 2026 &mdash; Version 2.0
          </p>
        </div>

        <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-5 space-y-6 text-text-secondary text-xs font-mono leading-relaxed">

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">1. Responsable del Tratamiento</h2>
            <p>
              Ataraxia IA Labs (&ldquo;nosotros&rdquo;, &ldquo;la Empresa&rdquo;) es responsable del tratamiento de los
              datos personales recabados a traves de la plataforma SofIA. Actuamos como encargados del
              tratamiento de datos de pacientes en nombre de las clinicas clientes, quienes son los
              responsables del tratamiento frente a sus pacientes.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">2. Datos que Recopilamos</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-text-primary font-medium mb-1.5">Datos de la clinica (cliente):</h3>
                <ul className="space-y-1 ml-3">
                  {[
                    'Nombre del representante legal y datos de contacto',
                    'Informacion de la organizacion (NIT, nombre, direccion)',
                    'Datos de facturacion y pago',
                    'Credenciales de autenticacion (email, password cifrado)',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-brand-purple mt-0.5">&#8226;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-text-primary font-medium mb-1.5">Datos de pacientes (procesados en nombre de la clinica):</h3>
                <ul className="space-y-1 ml-3">
                  {[
                    'Nombre, numero de telefono (WhatsApp)',
                    'Historial de conversaciones y citas agendadas',
                    'Informacion de pagos realizados',
                    'Preferencias de tratamiento y notas clinicas basicas',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-brand-purple mt-0.5">&#8226;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">3. Finalidad del Tratamiento</h2>
            <ul className="space-y-1 ml-3">
              {[
                'Prestar el servicio de asistente IA para clinicas',
                'Procesar y gestionar citas medicas',
                'Facilitar pagos entre pacientes y clinicas',
                'Generar analytics y reportes para la clinica',
                'Mejorar los modelos de IA del servicio (datos anonimizados)',
                'Cumplimiento de obligaciones legales y regulatorias',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-brand-purple mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">4. Base Legal del Tratamiento</h2>
            <p>
              El tratamiento se fundamenta en: (a) el consentimiento del titular, (b) la ejecucion de un
              contrato de servicios, y (c) el cumplimiento de obligaciones legales. Conforme a la Ley 1581
              de 2012 y el Decreto 1377 de 2013.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">5. Seguridad de los Datos</h2>
            <p className="mb-2">
              Implementamos medidas tecnicas y organizativas para proteger los datos:
            </p>
            <ul className="space-y-1 ml-3">
              {[
                'Cifrado en transito (TLS 1.3) y en reposo (AES-256)',
                'Autenticacion de doble factor disponible',
                'Acceso a datos restringido por rol y organizacion (Row Level Security)',
                'Auditorias de seguridad periodicas',
                'Infraestructura en AWS/Supabase con certificaciones SOC 2',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-status-success mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">6. Derechos del Titular</h2>
            <p className="mb-2">Conforme a la Ley 1581 de 2012, usted tiene derecho a:</p>
            <ul className="space-y-1 ml-3">
              {[
                'Conocer, actualizar y rectificar sus datos personales',
                'Solicitar prueba de la autorizacion otorgada',
                'Ser informado sobre el uso de sus datos',
                'Presentar quejas ante la Superintendencia de Industria y Comercio',
                'Revocar la autorizacion y/o solicitar la supresion de datos',
                'Acceder gratuitamente a sus datos personales',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-brand-purple mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos: <span className="text-brand-purple">privacidad@ataraxiaialabs.ai</span>
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">7. Retencion de Datos</h2>
            <p>
              Los datos se conservan durante la vigencia del contrato de servicio y por el periodo adicional
              requerido por la legislacion colombiana aplicable (minimo 5 anos para datos financieros y
              medicos, conforme a la normativa sectorial).
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">8. Transferencia Internacional</h2>
            <p>
              Los datos pueden ser procesados en servidores ubicados en Estados Unidos (AWS us-east-1).
              Esta transferencia se realiza bajo acuerdos de proteccion de datos alineados con estandares
              internacionales y con las garantias requeridas por la Ley 1581 de 2012.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">9. Cambios a esta Politica</h2>
            <p>
              Notificaremos cambios materiales a esta politica via email con al menos 30 dias de anticipacion.
              El uso continuado del servicio tras la notificacion implica aceptacion de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-sm mb-2">10. Contacto</h2>
            <p>
              Oficial de Proteccion de Datos: <span className="text-brand-purple">privacidad@ataraxiaialabs.ai</span>
              <br />
              Superintendencia de Industria y Comercio (SIC): <span className="text-text-muted">www.sic.gov.co</span>
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
