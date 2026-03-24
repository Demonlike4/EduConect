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
        $alumno = $candidatura->getAlumno()->getUser()->getNombre() ?? $candidatura->getAlumno()->getUser()->getEmail();
        $empresa = $candidatura->getOferta()->getEmpresa()->getNombreComercial();
        $tutorEmpresa = $candidatura->getTutorEmpresa() ? ($candidatura->getTutorEmpresa()->getNombre() ?? $candidatura->getTutorEmpresa()->getEmail()) : 'Sin asignar';
        $tutorCentro = $candidatura->getTutorCentro() ? ($candidatura->getTutorCentro()->getNombre() ?? $candidatura->getTutorCentro()->getEmail()) : 'Sin asignar';
        
        $fechaInicio = $candidatura->getFechaInicio() ? $candidatura->getFechaInicio()->format('d/m/Y') : 'Pendiente';
        $fechaFin = $candidatura->getFechaFin() ? $candidatura->getFechaFin()->format('d/m/Y') : 'Pendiente';

        $firmaCentroHtml = "";
        if ($candidatura->getFirmaTutorCentro()) {
            $firmaData = $candidatura->getFirmaTutorCentro();
            $firmaCentroHtml = "<img src='{$firmaData}' style='max-width: 180px; height: auto; display: block; margin: 5px auto; border-bottom: 1px solid #000;'>";
        }

        $firmaEmpresaHtml = "";
        if ($candidatura->getFirmaTutorEmpresa()) {
            $firmaData = $candidatura->getFirmaTutorEmpresa();
            $firmaEmpresaHtml = "<img src='{$firmaData}' style='max-width: 180px; height: auto; display: block; margin: 5px auto; border-bottom: 1px solid #000;'>";
        }

        $html = "
        <html>
        <head>
            <style>
                body { font-family: sans-serif; padding: 30px; line-height: 1.4; color: #333; }
                h1 { text-align: center; color: #1a56db; margin-bottom: 20px; font-size: 24px; }
                .section { margin-bottom: 15px; border: 1px solid #e5e7eb; padding: 15px; border-radius: 10px; background: #fff; }
                .section h3 { margin-top: 0; color: #1f2937; border-bottom: 2px solid #3b82f6; display: inline-block; padding-bottom: 2px; margin-bottom: 10px; font-size: 16px; }
                .label { font-weight: bold; color: #6b7280; font-size: 0.8em; text-transform: uppercase; }
                .value { color: #111827; font-weight: 500; }
                .footer { margin-top: 40px; text-align: center; font-size: 0.8em; color: #9ca3af; border-top: 1px solid #eee; padding-top: 15px; }
                .signature-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
                .signature-box { border: 1px dashed #ccc; padding: 10px; text-align: center; border-radius: 8px; width: 45%; }
                .signature-label { font-size: 9px; font-weight: bold; color: #666; margin-bottom: 5px; text-transform: uppercase; }
                .signature-name { font-size: 10px; margin-top: 5px; color: #333; }
            </style>
        </head>
        <body>
            <h1>CONVENIO DE FORMACIÓN EN CENTROS DE TRABAJO</h1>
            
            <div class='section'>
                <h3>I. IDENTIFICACIÓN DE LAS PARTES</h3>
                <p><span class='label'>Estudiante:</span> <span class='value'>{$alumno}</span></p>
                <p><span class='label'>Centro Educativo:</span> <span class='value'>" . ($candidatura->getAlumno()->getCentro() ? $candidatura->getAlumno()->getCentro()->getNombre() : 'N/A') . "</span></p>
                <p><span class='label'>Entidad Colaboradora:</span> <span class='value'>{$empresa}</span></p>
            </div>

            <div class='section'>
                <h3>II. RESPONSABLES DE SEGUIMIENTO</h3>
                <p><span class='label'>Tutor Académico (Centro):</span> <span class='value'>{$tutorCentro}</span></p>
                <p><span class='label'>Tutor Laboral (Empresa):</span> <span class='value'>{$tutorEmpresa}</span></p>
            </div>

            <div class='section'>
                <h3>III. CONDICIONES DE LAS PRÁCTICAS</h3>
                <p><span class='label'>Periodo:</span> <span class='value'>{$fechaInicio} - {$fechaFin}</span></p>
                <p><span class='label'>Jornada/Turno:</span> <span class='value'>" . ($candidatura->getHorario() === 'manana' ? 'Mañana' : 'Tarde') . "</span></p>
                <p><span class='label'>Observaciones:</span> <span class='value'>Formación sin carácter laboral. Seguro de responsabilidad civil incluido por el Centro.</span></p>
            </div>

            <table class='signature-table'>
                <tr>
                    <td class='signature-box'>
                        <div class='signature-label'>Tutor de Centro Educativo</div>
                        <div style='height: 100px; vertical-align: middle;'>
                            {$firmaCentroHtml}
                            " . (!$firmaCentroHtml ? "<div style='margin-top: 40px; color: #ccc;'>PENDIENTE</div>" : "") . "
                        </div>
                        <div class='signature-name'>{$tutorCentro}</div>
                    </td>
                    <td style='width: 10%;'></td>
                    <td class='signature-box'>
                        <div class='signature-label'>Tutor de Entidad Colaboradora</div>
                        <div style='height: 100px; vertical-align: middle;'>
                            {$firmaEmpresaHtml}
                            " . (!$firmaEmpresaHtml ? "<div style='margin-top: 40px; color: #ccc;'>PENDIENTE</div>" : "") . "
                        </div>
                        <div class='signature-name'>{$tutorEmpresa}</div>
                    </td>
                </tr>
            </table>

            <div class='footer'>
                <p>Documento firmado electrónicamente bajo la normativa de FCT.</p>
                <p>ID Transacción: " . md5($candidatura->getId() . 'educonect') . "</p>
            </div>
        </body>
        </html>
        ";

        return $html;
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
