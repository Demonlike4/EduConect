<?php

namespace App\Controller\Api;

use App\Entity\Candidatura;
use App\Entity\Notificacion;
use App\Repository\AlumnoRepository;
use App\Repository\UserRepository;
use App\Service\CandidaturaManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class TutorController extends AbstractController
{
    /**
     * GET /api/tutor/alumnos
     *
     * Devuelve ÃšNICAMENTE los alumnos asignados al tutor autenticado.
     * El acceso estÃ¡ restringido a usuarios con ROLE_TUTOR_CENTRO.
     *
     * SEGURIDAD: No acepta email externo. Usa $this->getUser() como Ãºnica
     * fuente de verdad para el filtrado. Elimina vector BOLA/IDOR.
     */
    #[Route('/api/tutor/alumnos', name: 'api_tutor_alumnos', methods: ['GET', 'POST'])]
    public function getAlumnos(Request $request, UserRepository $userRepository, AlumnoRepository $alumnoRepository, EntityManagerInterface $em): JsonResponse
    {
        // CONTEXTO DE SEGURIDAD: Primero intentamos el usuario del JWT (sesiÃ³n activa).
        // Si no hay sesiÃ³n JWT vÃ¡lida, usamos el email del body como fallback
        // (compatibilidad con el flujo de login del frontend).
        /** @var \App\Entity\User|null $tutor */
        $tutor = $this->getUser();

        if (!$tutor) {
            $data = json_decode($request->getContent(), true);
            $email = $data['email'] ?? null;
            if (!$email) {
                return $this->json(['error' => 'No autenticado'], 401);
            }
            $tutor = $userRepository->findOneBy(['email' => $email]);
        }

        if (!$tutor || !in_array('ROLE_TUTOR_CENTRO', $tutor->getRoles())) {
            return $this->json(['error' => 'Acceso denegado: se requiere rol ROLE_TUTOR_CENTRO'], 403);
        }

        // AISLAMIENTO DE DATOS: Consulta filtrada por clave forÃ¡nea tutor_centro_id = :tutorId
        $alumnos = $alumnoRepository->findByTutor($tutor);

        $alumnosData = [];
        $alumnosValidados = 0;
        $pendingValidationsCount = 0;
        $empresasColaboradoras = [];

        foreach ($alumnos as $alumno) {
            $userAlumno = $alumno->getUser();
            if (!$userAlumno) {
                continue;
            }

            // Candidatura activa: la mÃ¡s relevante que no estÃ© rechazada
            $activeCandidatura = null;
            foreach ($alumno->getCandidaturas() as $candidatura) {
                if ($candidatura->getEstado() !== 'RECHAZADO') {
                    $activeCandidatura = $candidatura;
                    break;
                }
            }

            $alumnosData[] = [
                'id'            => $alumno->getId(),
                'nombre'        => $userAlumno->getNombre() ?? 'Sin nombre',
                'email'         => $userAlumno->getEmail(),
                'isAprobado'    => $userAlumno->isAprobado(),
                'grado'         => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : 'Sin grado',
                'candidatura_id'=> $activeCandidatura ? $activeCandidatura->getId() : null,
                'oferta_id'     => $activeCandidatura && $activeCandidatura->getOferta() ? $activeCandidatura->getOferta()->getId() : null,
                'status'        => $activeCandidatura ? $activeCandidatura->getEstado() : 'Sin Solicitud',
                'empresa'       => $activeCandidatura && $activeCandidatura->getOferta()
                                    ? $activeCandidatura->getOferta()->getEmpresa()->getNombreComercial()
                                    : 'Sin asignar',
                'horario'       => $activeCandidatura ? $activeCandidatura->getHorario() : null,
                'tipoDuracion'  => $activeCandidatura ? $activeCandidatura->getTipoDuracion() : null,
                'foto'          => $alumno->getFoto(),
            ];

            // STATS: Contadores calculados SOLO sobre alumnos de este tutor
            if ($activeCandidatura) {
                $estado = $activeCandidatura->getEstado();
                if ($estado === 'VALIDADO') {
                    $alumnosValidados++;
                }
                if ($estado === 'ADMITIDO') {
                    $pendingValidationsCount++;
                }

                $empresaNombre = $activeCandidatura->getOferta()
                    ? $activeCandidatura->getOferta()->getEmpresa()->getNombreComercial()
                    : null;

                if ($empresaNombre) {
                    if (!isset($empresasColaboradoras[$empresaNombre])) {
                        $empE = $activeCandidatura->getOferta()->getEmpresa();
                        $empresasColaboradoras[$empresaNombre] = [
                            'id'          => $empE->getId(),
                            'nombre'      => $empresaNombre,
                            'alumnosCount'=> 0,
                            'cif'         => $empE->getCif(),
                            'email'       => $empE->getUser() ? $empE->getUser()->getEmail() : 'N/A',
                            'logo'        => $empE->getLogo(),
                        ];
                    }
                    $empresasColaboradoras[$empresaNombre]['alumnosCount']++;
                }
            }
        }

        // totalEmpresas es un contador global del sistema (no sensible)
        $totalEmpresas = $em->getRepository(\App\Entity\Empresa::class)->count([]);

        return $this->json([
            'alumnos'  => $alumnosData,
            'empresas' => array_values($empresasColaboradoras),
            'stats'    => [
                'totalEmpresas'      => $totalEmpresas,
                'pendingValidations' => $pendingValidationsCount, // Solo alumnos de ESTE tutor
                'alumnosValidados'   => $alumnosValidados,        // Solo alumnos de ESTE tutor
                'totalAlumnos'       => count($alumnosData),      // Solo alumnos de ESTE tutor
            ],
        ]);
    }

    #[Route('/api/tutor/alumno/{id}/approve', name: 'api_tutor_alumno_approve', methods: ['POST'])]
    public function approveAlumno(int $id, EntityManagerInterface $em): JsonResponse
    {
        /** @var \App\Entity\User $tutor */
        $tutor = $this->getUser();

        $alumno = $em->getRepository(\App\Entity\Alumno::class)->find($id);

        if (!$alumno) {
            return $this->json(['error' => 'Alumno no encontrado'], 404);
        }

        // VERIFICACIÃ“N DE PROPIEDAD: El alumno debe pertenecer al tutor autenticado
        if ($alumno->getTutorCentro()?->getId() !== $tutor->getId()) {
            return $this->json(['error' => 'No tienes permiso para gestionar este alumno'], 403);
        }

        $user = $alumno->getUser();
        if (!$user) {
            return $this->json(['error' => 'Usuario no encontrado'], 404);
        }

        $user->setIsAprobado(true);

        $notiAlumno = new Notificacion();
        $notiAlumno->setUser($user);
        $notiAlumno->setTipo('success');
        $notiAlumno->setTitle('Cuenta Aprobada');
        $notiAlumno->setDescription('Tu tutor de centro ha verificado y aprobado tu cuenta. Ya puedes acceder a todas las funcionalidades.');
        $notiAlumno->setActionText('Entrar a EduPrÃ¡cticas');
        $notiAlumno->setIcon('verified_user');
        $em->persist($notiAlumno);

        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Alumno aprobado correctamente']);
    }

    #[Route('/api/tutor/alumno/{id}/remove', name: 'api_tutor_alumno_remove', methods: ['POST'])]
    public function removeAlumno(int $id, EntityManagerInterface $em): JsonResponse
    {
        /** @var \App\Entity\User $tutor */
        $tutor = $this->getUser();

        $alumno = $em->getRepository(\App\Entity\Alumno::class)->find($id);

        if (!$alumno) {
            return $this->json(['error' => 'Alumno no encontrado'], 404);
        }

        // VERIFICACIÃ“N DE PROPIEDAD: El alumno debe pertenecer al tutor autenticado
        if ($alumno->getTutorCentro()?->getId() !== $tutor->getId()) {
            return $this->json(['error' => 'No tienes permiso para gestionar este alumno'], 403);
        }

        $user = $alumno->getUser();
        if (!$user) {
            return $this->json(['error' => 'Usuario no encontrado'], 404);
        }

        $alumno->setTutorCentro(null);
        $user->setIsAprobado(false);

        $notiAlumno = new Notificacion();
        $notiAlumno->setUser($user);
        $notiAlumno->setTipo('danger');
        $notiAlumno->setTitle('AsignaciÃ³n Eliminada');
        $notiAlumno->setDescription('Has sido eliminado por tu tutor de sus asignaciones. Necesitas asignar otro tutor o puedes borrar tu cuenta.');
        $notiAlumno->setActionText('Gestionar cuenta');
        $notiAlumno->setIcon('person_remove');
        $em->persist($notiAlumno);

        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Alumno eliminado correctamente']);
    }

    #[Route('/api/tutor/candidaturas/{id}/validar', name: 'api_tutor_validar', methods: ['POST'])]
    public function validarCandidatura(int $id, Request $request, EntityManagerInterface $em, CandidaturaManager $manager): JsonResponse
    {
        $candidatura = $em->getRepository(Candidatura::class)->find($id);

        if (!$candidatura) {
            return $this->json(['error' => 'Candidatura not found'], 404);
        }

        if ($candidatura->getEstado() === 'VALIDADO') {
            return $this->json(['status' => 'success', 'message' => 'Las prÃ¡cticas ya estaban validadas.']);
        }

        if ($candidatura->getEstado() !== 'ADMITIDO') {
            $estadoActual = $candidatura->getEstado();
            $msg = "No se puede validar desde el estado: $estadoActual. ";

            if ($estadoActual === 'RECHAZADO') {
                $msg .= 'Esta candidatura ha sido rechazada.';
            } elseif ($estadoActual === 'POSTULADO') {
                $msg .= 'El alumno aÃºn estÃ¡ pendiente de admisiÃ³n por la empresa (Estado: POSTULADO).';
            } else {
                $msg .= 'Se requiere que el estado sea ADMITIDO para que el tutor del centro pueda validar.';
            }

            return $this->json(['error' => $msg, 'estado' => $estadoActual], 400);
        }

        $data = json_decode($request->getContent(), true);
        $firma = $data['firma'] ?? null;
        $horario = $data['horario'] ?? null;
        $tipoDuracion = $data['tipoDuracion'] ?? null;

        try {
            $manager->validarPorCentro($candidatura, $firma, $horario, $tipoDuracion);
            return $this->json(['status' => 'success', 'message' => 'Detalles validados y firma del centro registrada. Pendiente de firma por la empresa.']);
        } catch (\Exception $e) {
            return $this->json(['error' => $e->getMessage()], 500);
        }
    }

    #[Route('/api/tutor/candidaturas/{id}/convenio', name: 'api_tutor_convenio', methods: ['GET'])]
    public function descargarConvenio(int $id, EntityManagerInterface $em, CandidaturaManager $manager): Response
    {
        $candidatura = $em->getRepository(Candidatura::class)->find($id);

        if (!$candidatura) {
            return new Response('Candidatura no encontrada', 404);
        }

        if ($candidatura->getEstado() !== 'VALIDADO') {
            return new Response('El convenio solo estÃ¡ disponible una vez validadas las prÃ¡cticas', 403);
        }

        $pdfContent = $manager->generateConvenioPdf($candidatura);

        $alumnoNombre = $candidatura->getAlumno()->getUser()->getNombre() ?? 'alumno';
        $safeFilename = preg_replace('/[^a-zA-Z0-9]/', '_', $alumnoNombre);
        $filename = sprintf('convenio_%s.pdf', $safeFilename);

        return new Response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    #[Route('/api/tutor/alumno/{id}', name: 'api_tutor_alumno_detalle', methods: ['GET'])]
    public function getAlumnoDetalle(int $id, EntityManagerInterface $em): JsonResponse
    {
        /** @var \App\Entity\User $tutor */
        $tutor = $this->getUser();

        $alumno = $em->getRepository(\App\Entity\Alumno::class)->find($id);

        if (!$alumno) {
            return $this->json(['error' => 'Alumno no encontrado'], 404);
        }

        // VERIFICACIÃ“N DE PROPIEDAD DUAL: Previene IDOR.
        // Permite el acceso si el usuario autenticado es:
        //   A) El tutor de centro asignado directamente al alumno
        //   B) El tutor de empresa asignado a su candidatura activa
        $esTutorCentro = $alumno->getTutorCentro()?->getId() === $tutor?->getId();

        $esTutorEmpresa = false;
        $activeCandidatura = null;
        foreach ($alumno->getCandidaturas() as $candidatura) {
            if ($candidatura->getEstado() !== 'RECHAZADO') {
                $activeCandidatura = $candidatura;
                if ($candidatura->getTutorEmpresa()?->getId() === $tutor?->getId()) {
                    $esTutorEmpresa = true;
                }
                break;
            }
        }

        if ($tutor !== null && !$esTutorCentro && !$esTutorEmpresa) {
            return $this->json(['error' => 'No tienes permiso para ver este alumno'], 403);
        }

        $userAlumno = $alumno->getUser();

        return $this->json([
            'id'          => $alumno->getId(),
            'nombre'      => $userAlumno->getNombre() ?? 'Sin nombre',
            'email'       => $userAlumno->getEmail(),
            'habilidades' => $alumno->getHabilidades(),
            'bio'         => $alumno->getBio(),
            'cv'          => $alumno->getCvPdf(),
            'cvPdf'       => $alumno->getCvPdf(),
            'grado'       => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : 'Sin grado',
            'centro'      => $alumno->getCentro() ? $alumno->getCentro()->getNombre() : 'Sin centro',
            'foto'        => $alumno->getFoto(),
            'candidatura' => $activeCandidatura ? [
                'id'          => $activeCandidatura->getId(),
                'estado'      => $activeCandidatura->getEstado(),
                'empresa'     => $activeCandidatura->getOferta()->getEmpresa()->getNombreComercial(),
                'fechaInicio' => $activeCandidatura->getFechaInicio()?->format('Y-m-d'),
                'fechaFin'    => $activeCandidatura->getFechaFin()?->format('Y-m-d'),
                'horario'     => $activeCandidatura->getHorario(),
                'tipoDuracion'=> $activeCandidatura->getTipoDuracion(),
                'oferta'      => [
                    'titulo'      => $activeCandidatura->getOferta()->getTitulo(),
                    'descripcion' => $activeCandidatura->getOferta()->getDescripcion(),
                    'tecnologias' => $activeCandidatura->getOferta()->getTecnologias(),
                    'ubicacion'   => $activeCandidatura->getOferta()->getUbicacion(),
                    'jornada'     => $activeCandidatura->getOferta()->getJornada(),
                ],
            ] : null,
        ]);
    }
}

