<?php

namespace App\Service;

use App\Entity\Candidatura;
use App\Entity\User;
use App\Entity\Chat;
use App\Entity\Notificacion;
use Doctrine\ORM\EntityManagerInterface;
use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class CandidaturaManager
{
    private EntityManagerInterface $entityManager;
    private MailerInterface $mailer;

    public function __construct(EntityManagerInterface $entityManager, MailerInterface $mailer)
    {
        $this->entityManager = $entityManager;
        $this->mailer = $mailer;
    }

    public function admitirAlumno(Candidatura $candidatura): void
    {
        // 1. Cambiar estado a ADMITIDO
        $candidatura->setEstado('ADMITIDO');

        // 2. Intentar asignar tutores si no están asignados
        if (!$candidatura->getTutorEmpresa()) {
            $empresa = $candidatura->getOferta()->getEmpresa();
            $tutorEmpresa = $this->findRandomTutorEmpresa($empresa);
            if ($tutorEmpresa) {
                $candidatura->setTutorEmpresa($tutorEmpresa);
            }
        }

        if (!$candidatura->getTutorCentro()) {
            $centro = $candidatura->getAlumno()->getCentro();
            $grado = $candidatura->getAlumno()->getGrado();
            
            // Check if Alumno already has a Tutor assigned (from registration)
            $tutorCentro = $candidatura->getAlumno()->getTutorCentro();
            
            if (!$tutorCentro) {
                $tutorCentro = $this->findRandomTutorCentro($centro, $grado);
            }

            if ($tutorCentro) {
                $candidatura->setTutorCentro($tutorCentro);
            }
        }

        $this->entityManager->flush();

        // Notify Alumno
        if ($candidatura->getAlumno() && $candidatura->getAlumno()->getUser()) {
            $notiAlumno = new Notificacion();
            $notiAlumno->setUser($candidatura->getAlumno()->getUser());
            $notiAlumno->setTipo('success');
            $notiAlumno->setTitle('Prácticas Admitidas');
            $notiAlumno->setDescription('Has sido admitido en ' . $candidatura->getOferta()->getEmpresa()->getNombreComercial() . '.');
            $notiAlumno->setActionText('Ver detalles');
            $notiAlumno->setIcon('done_all');
            $this->entityManager->persist($notiAlumno);
        }

        // Notify Tutor Centro
        if ($candidatura->getTutorCentro()) {
            $notiTutor = new Notificacion();
            $notiTutor->setUser($candidatura->getTutorCentro());
            $notiTutor->setTipo('danger');
            $notiTutor->setTitle('Validación Requerida');
            $notiTutor->setDescription('El alumno ' . ($candidatura->getAlumno()->getUser()->getNombre() ?? $candidatura->getAlumno()->getUser()->getEmail()) . ' ha sido admitido. Debes validar el convenio.');
            $notiTutor->setActionText('Validar alumno');
            $notiTutor->setIcon('fact_check');
            $this->entityManager->persist($notiTutor);
        }

        $this->entityManager->flush();

        // 3. Intentar crear chats (solo se crearán si hay participantes mínimos)
        $this->createChatsForCandidatura($candidatura);
    }

    public function validarPorCentro(Candidatura $candidatura, ?string $firma = null): void
    {
        // Paso 1: El Tutor de Centro valida los detalles y firma.
        $candidatura->setEstado('PENDIENTE_FIRMA_EMPRESA');

        if ($firma) {
            $candidatura->setFirmaTutorCentro($firma);
        }

        // Asignación de tutores (si no estaban ya)
        if (!$candidatura->getTutorEmpresa()) {
            $empresa = $candidatura->getOferta()->getEmpresa();
            $tutorEmpresa = $this->findRandomTutorEmpresa($empresa);
            if ($tutorEmpresa) {
                $candidatura->setTutorEmpresa($tutorEmpresa);
            }
        }

        if (!$candidatura->getTutorCentro()) {
            $centro = $candidatura->getAlumno()->getCentro();
            $grado = $candidatura->getAlumno()->getGrado();
            $tutorCentro = $candidatura->getAlumno()->getTutorCentro();
            if (!$tutorCentro) {
                $tutorCentro = $this->findRandomTutorCentro($centro, $grado);
            }
            if ($tutorCentro) {
                $candidatura->setTutorCentro($tutorCentro);
            }
        }

        // Notify Tutor Empresa
        if ($candidatura->getTutorEmpresa()) {
            $notiTutorE = new Notificacion();
            $notiTutorE->setUser($candidatura->getTutorEmpresa());
            $notiTutorE->setTipo('danger');
            $notiTutorE->setTitle('Firma Pendiente');
            $notiTutorE->setDescription('El Centro Educativo ha validado el convenio de ' . ($candidatura->getAlumno()->getUser()->getNombre() ?? $candidatura->getAlumno()->getUser()->getEmail()) . '. Requiere tu firma final.');
            $notiTutorE->setActionText('Firmar convenio');
            $notiTutorE->setIcon('draw');
            $this->entityManager->persist($notiTutorE);
        }

        $this->entityManager->flush();
    }

    public function validarPorEmpresa(Candidatura $candidatura, ?string $firma = null): void
    {
        // Paso 2: El Tutor de Empresa firma el convenio.
        $candidatura->setEstado('VALIDADO');

        if ($firma) {
            $candidatura->setFirmaTutorEmpresa($firma);
        }

        // Activar rango de fechas (desde hoy)
        $duracion = $candidatura->getTipoDuracion();
        $fechaInicio = new \DateTime();
        $fechaFin = (clone $fechaInicio);

        if ($duracion === '1_mes') {
            $fechaFin->modify('+1 month');
        } elseif ($duracion === '2_meses') {
            $fechaFin->modify('+2 months');
        } else {
             $fechaFin->modify('+3 months');
        }

        $candidatura->setFechaInicio($fechaInicio);
        $candidatura->setFechaFin($fechaFin);

        // Notify Alumno
        if ($candidatura->getAlumno() && $candidatura->getAlumno()->getUser()) {
            $notiAlumno = new Notificacion();
            $notiAlumno->setUser($candidatura->getAlumno()->getUser());
            $notiAlumno->setTipo('success');
            $notiAlumno->setTitle('Convenio Activo');
            $notiAlumno->setDescription('Tu convenio de prácticas con ' . $candidatura->getOferta()->getEmpresa()->getNombreComercial() . ' ya ha sido validado y firmado.');
            $notiAlumno->setActionText('Descargar PDF');
            $notiAlumno->setIcon('task_alt');
            $this->entityManager->persist($notiAlumno);
        }

        $this->entityManager->flush();

        // Crear canales de chat una vez firmado por todos
        $this->createChatsForCandidatura($candidatura);
    }

    public function createChatsForCandidatura(Candidatura $candidatura): void
    {
        // Avoid duplicate chats
        $existingChats = $this->entityManager->getRepository(Chat::class)->findBy(['candidatura' => $candidatura]);
        if (count($existingChats) > 0) {
            return;
        }

        $alumno = $candidatura->getAlumno()->getUser();
        $tutorEmpresa = $candidatura->getTutorEmpresa();
        $tutorCentro = $candidatura->getTutorCentro();

        if ($alumno && $tutorEmpresa) {
            // Chat 1: Alumno <-> Tutor Empresa (Privado)
            $chat1 = new Chat();
            $chat1->setCandidatura($candidatura);
            $chat1->setNombre("Chat con Tutor de Empresa");
            $chat1->addParticipante($alumno);
            $chat1->addParticipante($tutorEmpresa);
            $this->entityManager->persist($chat1);
        }

        if ($alumno && $tutorCentro) {
            // Chat 2: Alumno <-> Tutor Centro (Privado)
            $chat2 = new Chat();
            $chat2->setCandidatura($candidatura);
            $chat2->setNombre("Chat con Tutor de Centro");
            $chat2->addParticipante($alumno);
            $chat2->addParticipante($tutorCentro);
            $this->entityManager->persist($chat2);
        }

        if ($alumno && $tutorEmpresa && $tutorCentro) {
            // Chat 3: Seguimiento Grupal (Alumno + Ambos Tutores)
            $chat3 = new Chat();
            $chat3->setCandidatura($candidatura);
            $chat3->setNombre("Seguimiento Grupal Prácticas");
            $chat3->addParticipante($alumno);
            $chat3->addParticipante($tutorEmpresa);
            $chat3->addParticipante($tutorCentro);
            $this->entityManager->persist($chat3);
        }

        $this->entityManager->flush();
    }

    public function generateConvenioPdf(Candidatura $candidatura): string
    {
        $html = $this->generateConvenioHtml($candidatura);

        $options = new Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true); // Important for base64 images
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    private function enviarEmailsConvenio(Candidatura $candidatura): void
    {
        $pdfContent = $this->generateConvenioPdf($candidatura);
        
        $recipients = [];
        
        // 1. Alumno
        if ($candidatura->getAlumno() && $candidatura->getAlumno()->getUser()) {
            $recipients[] = $candidatura->getAlumno()->getUser()->getEmail();
        }

        // 2. Empresa (Administrador)
        $empresa = $candidatura->getOferta()->getEmpresa();
        if ($empresa && $empresa->getUser()) {
            $recipients[] = $empresa->getUser()->getEmail();
        }

        // 3. Tutor Centro
        if ($candidatura->getTutorCentro()) {
            $recipients[] = $candidatura->getTutorCentro()->getEmail();
        }

        // 4. Tutor Empresa
        if ($candidatura->getTutorEmpresa()) {
            $recipients[] = $candidatura->getTutorEmpresa()->getEmail();
        }

        // Remove duplicates and nulls
        $recipients = array_unique(array_filter($recipients));

        if (empty($recipients)) return;

        $email = (new Email())
            ->from('noreply@educonect.com')
            ->to(...$recipients)
            ->subject('Convenio de Prácticas Formativas - EduConect')
            ->text('Se ha validado el convenio de prácticas. Adjuntamos el documento PDF con todos los detalles.')
            ->attach($pdfContent, 'convenio_practicas.pdf', 'application/pdf');

        $this->mailer->send($email);
    }

    public function generateConvenioHtml(Candidatura $candidatura): string
    {
        // ── Extracción de datos ──────────────────────────────────────────────
        $alumno      = $candidatura->getAlumno()->getUser()->getNombre()
                    ?? $candidatura->getAlumno()->getUser()->getEmail();
        $dniAlumno   = $candidatura->getAlumno()->getDni() ?? '—';
        $empresa     = $candidatura->getOferta()->getEmpresa()->getNombreComercial();
        $cifEmpresa  = $candidatura->getOferta()->getEmpresa()->getCif() ?? '—';
        $oferta      = $candidatura->getOferta()->getTitulo() ?? 'Formación en Centros de Trabajo';
        $centro      = $candidatura->getAlumno()->getCentro()
                        ? $candidatura->getAlumno()->getCentro()->getNombre()
                        : 'N/A';
        $ciclo       = $candidatura->getAlumno()->getGrado()
                        ? $candidatura->getAlumno()->getGrado()->getNombre()
                        : 'N/A';
        $tutorCentro  = $candidatura->getTutorCentro()
                        ? ($candidatura->getTutorCentro()->getNombre()
                           ?? $candidatura->getTutorCentro()->getEmail())
                        : 'Sin asignar';
        $tutorEmpresa = $candidatura->getTutorEmpresa()
                        ? ($candidatura->getTutorEmpresa()->getNombre()
                           ?? $candidatura->getTutorEmpresa()->getEmail())
                        : 'Sin asignar';

        $fechaInicio = $candidatura->getFechaInicio()
                        ? $candidatura->getFechaInicio()->format('d/m/Y') : 'Pendiente';
        $fechaFin    = $candidatura->getFechaFin()
                        ? $candidatura->getFechaFin()->format('d/m/Y') : 'Pendiente';
        $horario     = $candidatura->getHorario() === 'manana' ? 'Mañana (08:00–15:00)' : 'Tarde (15:00–22:00)';
        $duracion    = match ($candidatura->getTipoDuracion()) {
            '1_mes'   => '1 mes',
            '2_meses' => '2 meses',
            default   => '3 meses',
        };

        // Número de expediente determinístico (año + hash parcial del ID)
        $numExpediente = 'EXP-' . date('Y') . '-' . strtoupper(substr(md5((string)$candidatura->getId()), 0, 8));
        $txId = strtoupper(md5($candidatura->getId() . 'educonect'));

        // Fecha de emisión
        $fechaEmision = (new \DateTime())->format('d/m/Y');

        // ── Firmas digitales ─────────────────────────────────────────────────
        $firmaCentroHtml = $candidatura->getFirmaTutorCentro()
            ? "<img src='{$candidatura->getFirmaTutorCentro()}' style='max-width:180px;height:60px;object-fit:contain;display:block;margin:0 auto;'>"
            : "<p style='color:#adb5bd;font-size:9pt;margin:0;padding-top:30px;'>— PENDIENTE DE FIRMA —</p>";

        $firmaEmpresaHtml = $candidatura->getFirmaTutorEmpresa()
            ? "<img src='{$candidatura->getFirmaTutorEmpresa()}' style='max-width:180px;height:60px;object-fit:contain;display:block;margin:0 auto;'>"
            : "<p style='color:#adb5bd;font-size:9pt;margin:0;padding-top:30px;'>— PENDIENTE DE FIRMA —</p>";

        // ── Template HTML institucional ──────────────────────────────────────
        $html = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    /* ── Reset & base ───────────────────────────── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 10pt;
        color: #1a1a2e;
        background: #ffffff;
        padding: 28px 36px;
        line-height: 1.55;
    }

    /* ── Cabecera institucional ─────────────────── */
    .header-band {
        background-color: #006633;   /* Verde Junta de Andalucía */
        height: 8px;
        width: 100%;
        margin-bottom: 0;
    }
    .header-sub-band {
        background-color: #FFD700;   /* Dorado Junta de Andalucía */
        height: 3px;
        width: 100%;
        margin-bottom: 16px;
    }
    .header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
    }
    .header-table td { vertical-align: middle; }
    .logo-cell { width: 100px; text-align: center; }
    .logo-cell img {
        max-width: 90px;
        max-height: 70px;
        object-fit: contain;
    }
    .header-center {
        text-align: center;
        padding: 0 12px;
    }
    .header-center .org-name {
        font-size: 8pt;
        font-weight: bold;
        color: #006633;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .header-center .doc-title {
        font-size: 15pt;
        font-weight: bold;
        color: #1a1a2e;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .header-center .doc-subtitle {
        font-size: 8pt;
        color: #555;
        margin-top: 2px;
    }

    /* ── Número de expediente ───────────────────── */
    .exp-bar {
        background: #f0f4f8;
        border-left: 4px solid #006633;
        padding: 7px 14px;
        margin: 14px 0;
        font-size: 8.5pt;
    }
    .exp-bar strong { color: #006633; }

    /* ── Secciones ──────────────────────────────── */
    .section {
        margin-bottom: 14px;
        border: 1px solid #c8d6c8;
        border-radius: 3px;
        overflow: hidden;
    }
    .section-title {
        background: #e8f1e8;
        border-bottom: 1px solid #c8d6c8;
        padding: 5px 12px;
        font-size: 8.5pt;
        font-weight: bold;
        color: #006633;
        text-transform: uppercase;
        letter-spacing: 0.6px;
    }
    .section-body {
        padding: 10px 14px;
    }
    .field-row {
        display: table;
        width: 100%;
        margin-bottom: 5px;
    }
    .field-label {
        display: table-cell;
        width: 38%;
        font-size: 8pt;
        font-weight: bold;
        color: #4a4a6a;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding-right: 8px;
        vertical-align: top;
    }
    .field-value {
        display: table-cell;
        font-size: 9.5pt;
        color: #1a1a2e;
        border-bottom: 1px dotted #ccc;
        padding-bottom: 2px;
    }

    /* ── Cláusulas legales ──────────────────────── */
    .legal-block {
        font-size: 7.5pt;
        color: #444;
        padding: 10px 14px;
        border: 1px solid #e0e0e0;
        border-radius: 3px;
        margin-bottom: 14px;
        background: #fafafa;
        line-height: 1.6;
    }
    .legal-block p { margin-bottom: 5px; }

    /* ── Tabla de firmas ────────────────────────── */
    .signature-section-title {
        font-size: 8.5pt;
        font-weight: bold;
        color: #006633;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        border-bottom: 2px solid #006633;
        padding-bottom: 4px;
        margin-bottom: 12px;
    }
    .signature-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 4px;
    }
    .signature-box {
        width: 47%;
        border: 1px solid #aac4aa;
        border-radius: 3px;
        padding: 10px 12px;
        text-align: center;
        background: #f9fbf9;
        vertical-align: top;
    }
    .sig-role {
        font-size: 7.5pt;
        font-weight: bold;
        color: #006633;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
    }
    .sig-area {
        height: 70px;
        border-bottom: 1px solid #888;
        margin: 6px 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .sig-name {
        font-size: 8.5pt;
        color: #333;
        font-weight: bold;
        margin-top: 4px;
    }
    .sig-meta {
        font-size: 7pt;
        color: #777;
        margin-top: 2px;
    }
    .sig-spacer { width: 6%; }

    /* ── Footer ─────────────────────────────────── */
    .footer-band {
        background-color: #006633;
        height: 5px;
        width: 100%;
        margin-top: 28px;
        margin-bottom: 0;
    }
    .footer-text {
        font-size: 7pt;
        color: #888;
        text-align: center;
        margin-top: 8px;
        line-height: 1.6;
    }
</style>
</head>
<body>

    <!-- ══ Banda superior institucional ═══════════════════════════════════ -->
    <div class="header-band"></div>
    <div class="header-sub-band"></div>

    <!-- ══ Cabecera con logos ══════════════════════════════════════════════ -->
    <table class="header-table">
        <tr>
            <td class="logo-cell">
                <!-- Placeholder: Logo Centro Educativo en Base64 -->
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAAMklEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBxAABHgAAAABJRU5ErkJggg==" alt="Logo Centro Educativo" />
            </td>
            <td class="header-center">
                <div class="org-name">Consejería de Educación — Junta de Andalucía</div>
                <div class="doc-title">Convenio de Formación en Centros de Trabajo</div>
                <div class="doc-subtitle">Formación Profesional Dual · Módulo FCT</div>
            </td>
            <td class="logo-cell">
                <!-- Placeholder: Logo Empresa en Base64 -->
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAAMklEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBxAABHgAAAABJRU5ErkJggg==" alt="Logo Empresa" />
            </td>
        </tr>
    </table>

    <!-- ══ Número de expediente ════════════════════════════════════════════ -->
    <div class="exp-bar">
        <strong>Nº Expediente:</strong> {$numExpediente}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Fecha de Emisión:</strong> {$fechaEmision}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Curso Académico:</strong> {$this->getCursoAcademico()}
    </div>

    <!-- ══ I. Identificación de las partes ════════════════════════════════ -->
    <div class="section">
        <div class="section-title">I. Identificación de las Partes</div>
        <div class="section-body">
            <div class="field-row">
                <span class="field-label">Estudiante:</span>
                <span class="field-value">{$alumno}</span>
            </div>
            <div class="field-row">
                <span class="field-label">DNI / NIE:</span>
                <span class="field-value">{$dniAlumno}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Centro Educativo:</span>
                <span class="field-value">{$centro}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Ciclo Formativo:</span>
                <span class="field-value">{$ciclo}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Entidad Colaboradora:</span>
                <span class="field-value">{$empresa}</span>
            </div>
            <div class="field-row">
                <span class="field-label">CIF Empresa:</span>
                <span class="field-value">{$cifEmpresa}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Plaza / Puesto:</span>
                <span class="field-value">{$oferta}</span>
            </div>
        </div>
    </div>

    <!-- ══ II. Responsables de Seguimiento ════════════════════════════════ -->
    <div class="section">
        <div class="section-title">II. Responsables de Seguimiento</div>
        <div class="section-body">
            <div class="field-row">
                <span class="field-label">Tutor Académico (Centro):</span>
                <span class="field-value">{$tutorCentro}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Tutor Laboral (Empresa):</span>
                <span class="field-value">{$tutorEmpresa}</span>
            </div>
        </div>
    </div>

    <!-- ══ III. Condiciones de las Prácticas ══════════════════════════════ -->
    <div class="section">
        <div class="section-title">III. Condiciones de las Prácticas</div>
        <div class="section-body">
            <div class="field-row">
                <span class="field-label">Periodo:</span>
                <span class="field-value">{$fechaInicio} &nbsp;→&nbsp; {$fechaFin}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Duración Total:</span>
                <span class="field-value">{$duracion}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Jornada / Turno:</span>
                <span class="field-value">{$horario}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Carácter:</span>
                <span class="field-value">Formación sin carácter laboral (Art. 31 RD 1085/2020)</span>
            </div>
        </div>
    </div>

    <!-- ══ IV. Cláusulas ══════════════════════════════════════════════════ -->
    <div class="legal-block">
        <p><strong>PRIMERA.</strong> Las partes convienen en establecer el presente Convenio de Formación en Centros de Trabajo al amparo de la normativa de Formación Profesional vigente en Andalucía, comprometiéndose a respetar los principios de confidencialidad, no discriminación e igualdad de oportunidades.</p>
        <p><strong>SEGUNDA.</strong> El estudiante no tendrá en ningún caso relación laboral con la Entidad Colaboradora durante la vigencia de este convenio. La cobertura de seguro de responsabilidad civil y accidentes es responsabilidad del Centro Educativo.</p>
        <p><strong>TERCERA.</strong> El incumplimiento de las condiciones aquí estipuladas facultará a cualquiera de las partes a resolver el presente convenio, previa comunicación fehaciente con un mínimo de cinco días hábiles de antelación.</p>
    </div>

    <!-- ══ V. Firmas ═══════════════════════════════════════════════════════ -->
    <div class="signature-section-title">V. Firmas Autorizadas</div>

    <table class="signature-table">
        <tr>
            <td class="signature-box">
                <div class="sig-role">Tutor de Centro Educativo</div>
                <div class="sig-area">{$firmaCentroHtml}</div>
                <div class="sig-name">{$tutorCentro}</div>
                <div class="sig-meta">Firma Digital Verificada · EduConect</div>
            </td>
            <td class="sig-spacer"></td>
            <td class="signature-box">
                <div class="sig-role">Tutor de Entidad Colaboradora</div>
                <div class="sig-area">{$firmaEmpresaHtml}</div>
                <div class="sig-name">{$tutorEmpresa}</div>
                <div class="sig-meta">Firma Digital Verificada · EduConect</div>
            </td>
        </tr>
    </table>

    <!-- ══ Footer ══════════════════════════════════════════════════════════ -->
    <div class="footer-band"></div>
    <div class="footer-text">
        Documento generado electrónicamente mediante la plataforma <strong>EduConect</strong>.<br>
        Nº de Transacción: <strong>{$txId}</strong> · Expediente: <strong>{$numExpediente}</strong><br>
        Este documento tiene plena validez conforme a la normativa de administración electrónica (Ley 39/2015).
    </div>

</body>
</html>
HTML;

        return $html;
    }

    /**
     * Calcula el curso académico actual en formato "YYYY/YYYY+1".
     * Después de agosto se considera inicio del nuevo curso.
     */
    private function getCursoAcademico(): string
    {
        $now = new \DateTime();
        $year = (int)$now->format('Y');
        $month = (int)$now->format('m');
        if ($month >= 9) {
            return $year . '/' . ($year + 1);
        }
        return ($year - 1) . '/' . $year;
    }


    private function findRandomTutorEmpresa($empresa): ?User
    {
        $userRepository = $this->entityManager->getRepository(User::class);
        
        // Find users with ROLE_TUTOR_EMPRESA that belong to this Empresa
        // Using QueryBuilder for more complex role check
        $qb = $userRepository->createQueryBuilder('u');
        $qb->where('u.empresaLaboral = :empresa')
           ->andWhere('u.roles LIKE :role')
           ->andWhere('u.isAprobado = :aprobado')
           ->setParameter('empresa', $empresa)
           ->setParameter('role', '%"ROLE_TUTOR_EMPRESA"%')
           ->setParameter('aprobado', true);
        
        $tutors = $qb->getQuery()->getResult();

        if (count($tutors) > 0) {
            return $tutors[array_rand($tutors)];
        }

        return null; // Or throw exception if strict
    }

    private function findRandomTutorCentro($centro, $grado): ?User
    {
        $userRepository = $this->entityManager->getRepository(User::class);

        // Find users with ROLE_TUTOR_CENTRO that belong to this Centro and teach this Grado
        $qb = $userRepository->createQueryBuilder('u');
        $qb->join('u.gradosImpartidos', 'g')
           ->where('u.centroEducativo = :centro')
           ->andWhere('g.id = :gradoId')
           ->andWhere('u.roles LIKE :role')
           ->setParameter('centro', $centro)
           ->setParameter('gradoId', $grado->getId())
           ->setParameter('role', '%"ROLE_TUTOR_CENTRO"%');

        $tutors = $qb->getQuery()->getResult();

        if (count($tutors) > 0) {
            return $tutors[array_rand($tutors)];
        }
        
        // Fallback: Try just by Center if no specific Grade tutor found? 
        // Logic asked: "Same Centro and Grado". Stick to it.
        
        return null;
    }
}
