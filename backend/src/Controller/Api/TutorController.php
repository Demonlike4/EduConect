<?php

namespace App\Controller\Api;

use App\Entity\Candidatura;
use App\Entity\Notificacion;
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
    #[Route('/api/tutor/alumnos', name: 'api_tutor_alumnos', methods: ['GET', 'POST'])]
    public function getAlumnos(Request $request, UserRepository $userRepository, EntityManagerInterface $em): JsonResponse
    {
        // For simplicity in this dev phase, passing email in body to identify the tutor
        // In production, this should use the authenticated user token
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return new JsonResponse(['error' => 'Email required'], 400);
        }

        $tutor = $userRepository->findOneBy(['email' => $email]);

        if (!$tutor || !in_array('ROLE_TUTOR_CENTRO', $tutor->getRoles())) {
            return new JsonResponse(['error' => 'Tutor not found'], 404);
        }

        $centro = $tutor->getCentroEducativo();

        if (!$centro) {
            return new JsonResponse(['alumnos' => []]);
        }

        $alumnosData = [];
        foreach ($centro->getAlumnos() as $alumno) {
            $userAlumno = $alumno->getUser();
            if ($userAlumno) {
                $activeCandidatura = null;
                foreach ($alumno->getCandidaturas() as $candidatura) {
                    // Logic to pick the most relevant one (e.g. latest or not rejected)
                    if ($candidatura->getEstado() !== 'RECHAZADO') {
                        $activeCandidatura = $candidatura;
                        break; 
                    }
                }

                $alumnosData[] = [
                    'id' => $alumno->getId(),
                    'nombre' => $userAlumno->getNombre() ?? 'Sin nombre',
                    'email' => $userAlumno->getEmail(),
                    'isAprobado' => $userAlumno->isAprobado(), // Added field
                    'grado' => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : 'Sin grado',
                    'candidatura_id' => $activeCandidatura ? $activeCandidatura->getId() : null,
                    'oferta_id' => $activeCandidatura && $activeCandidatura->getOferta() ? $activeCandidatura->getOferta()->getId() : null,
                    'status' => $activeCandidatura ? $activeCandidatura->getEstado() : 'Sin Solicitud', 
                    'empresa' => $activeCandidatura && $activeCandidatura->getOferta() ? $activeCandidatura->getOferta()->getEmpresa()->getNombreComercial() : 'Sin asignar',
                    'horario' => $activeCandidatura ? $activeCandidatura->getHorario() : null,
                    'tipoDuracion' => $activeCandidatura ? $activeCandidatura->getTipoDuracion() : null,
                    'foto' => $alumno->getFoto(),
                ];
            }
        }

        $alumnosValidados = 0;
        $pendingValidationsCount = 0;
        $empresasColaboradoras = [];

        foreach ($alumnosData as $al) {
            if ($al['status'] === 'VALIDADO') {
                $alumnosValidados++;
            }
            if ($al['status'] === 'ADMITIDO') {
                $pendingValidationsCount++;
            }
            // ... (rest of the loop)
            if ($al['empresa'] && $al['empresa'] !== 'Sin asignar') {
                 // ... existing logic for companies
                 if (!isset($empresasColaboradoras[$al['empresa']])) {
                    $empresasColaboradoras[$al['empresa']] = [
                        'nombre' => $al['empresa'],
                        'alumnosCount' => 0,
                        'cif' => 'N/A', 
                        'email' => 'N/A'
                    ];

                    $empE = $em->getRepository(\App\Entity\Empresa::class)->findOneBy(['nombreComercial' => $al['empresa']]);
                    if ($empE) {
                        $empresasColaboradoras[$al['empresa']]['id'] = $empE->getId();
                        $empresasColaboradoras[$al['empresa']]['cif'] = $empE->getCif();
                        $empresasColaboradoras[$al['empresa']]['email'] = $empE->getUser()->getEmail();
                        $empresasColaboradoras[$al['empresa']]['logo'] = $empE->getLogo();
                    }
                }
                $empresasColaboradoras[$al['empresa']]['alumnosCount']++;
            }
        }

        $totalEmpresas = $em->getRepository(\App\Entity\Empresa::class)->count([]);

        return new JsonResponse([
            'alumnos' => $alumnosData,
            'empresas' => array_values($empresasColaboradoras),
            'stats' => [
                'totalEmpresas' => $totalEmpresas,
                'pendingValidations' => $pendingValidationsCount,
                'alumnosValidados' => $alumnosValidados,
                'totalAlumnos' => count($alumnosData)
            ]
        ]);
    }

    #[Route('/api/tutor/alumno/{id}/approve', name: 'api_tutor_alumno_approve', methods: ['POST'])]
    public function approveAlumno(int $id, EntityManagerInterface $em): JsonResponse
    {
        $alumno = $em->getRepository(\App\Entity\Alumno::class)->find($id);

        if (!$alumno) {
            return $this->json(['error' => 'Alumno no encontrada'], 404);
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
        $notiAlumno->setActionText('Entrar a EduPrácticas');
        $notiAlumno->setIcon('verified_user');
        $em->persist($notiAlumno);

        $em->flush();

        return $this->json(['status' => 'success', 'message' => 'Alumno aprobado correctamente']);
    }

    #[Route('/api/tutor/alumno/{id}/remove', name: 'api_tutor_alumno_remove', methods: ['POST'])]
    public function removeAlumno(int $id, EntityManagerInterface $em): JsonResponse
    {
        $alumno = $em->getRepository(\App\Entity\Alumno::class)->find($id);

        if (!$alumno) {
            return $this->json(['error' => 'Alumno no encontrado'], 404);
        }

        $user = $alumno->getUser();
        if (!$user) {
             return $this->json(['error' => 'Usuario no encontrado'], 404);
        }

        // Set tutor to null and unapprove the user
        $alumno->setTutorCentro(null);
        $user->setIsAprobado(false);

        $notiAlumno = new Notificacion();
        $notiAlumno->setUser($user);
        $notiAlumno->setTipo('danger');
        $notiAlumno->setTitle('Asignación Eliminada');
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
            return $this->json(['status' => 'success', 'message' => 'Las prácticas ya estaban validadas.']);
        }

        if ($candidatura->getEstado() !== 'ADMITIDO') {
            $estadoActual = $candidatura->getEstado();
            $msg = "No se puede validar desde el estado: $estadoActual. ";
            
            if ($estadoActual === 'RECHAZADO') {
                $msg .= 'Esta candidatura ha sido rechazada.';
            } elseif ($estadoActual === 'POSTULADO') {
                $msg .= 'El alumno aún está pendiente de admisión por la empresa (Estado: POSTULADO).';
            } else {
                $msg .= 'Se requiere que el estado sea ADMITIDO para que el tutor del centro pueda validar.';
            }
            
            return $this->json(['error' => $msg, 'estado' => $estadoActual], 400);
        }

        $data = json_decode($request->getContent(), true);
        $firma = $data['firma'] ?? null;

        try {
            $manager->validarPorCentro($candidatura, $firma);
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
            return new Response('El convenio solo está disponible una vez validadas las prácticas', 403);
        }

        $pdfContent = $manager->generateConvenioPdf($candidatura);

        $alumnoNombre = $candidatura->getAlumno()->getUser()->getNombre() ?? 'alumno';
        $safeFilename = preg_replace('/[^a-zA-Z0-9]/', '_', $alumnoNombre);
        $filename = sprintf('convenio_%s.pdf', $safeFilename);

        return new Response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"'
        ]);
    }

    #[Route('/api/tutor/alumno/{id}', name: 'api_tutor_alumno_detalle', methods: ['GET'])]
    public function getAlumnoDetalle(int $id, EntityManagerInterface $em): JsonResponse
    {
        $alumno = $em->getRepository(\App\Entity\Alumno::class)->find($id);

        if (!$alumno) {
            return $this->json(['error' => 'Alumno no encontrado'], 404);
        }

        $userAlumno = $alumno->getUser();
        $activeCandidatura = null;
        foreach ($alumno->getCandidaturas() as $candidatura) {
            if ($candidatura->getEstado() !== 'RECHAZADO') {
                $activeCandidatura = $candidatura;
                break;
            }
        }

        return $this->json([
            'id' => $alumno->getId(),
            'nombre' => $userAlumno->getNombre() ?? 'Sin nombre',
            'email' => $userAlumno->getEmail(),
            'habilidades' => $alumno->getHabilidades(),
            'cv' => $alumno->getCvPdf(),
            'cvPdf' => $alumno->getCvPdf(),
            'grado' => $alumno->getGrado() ? $alumno->getGrado()->getNombre() : 'Sin grado',
            'centro' => $alumno->getCentro() ? $alumno->getCentro()->getNombre() : 'Sin centro',
            'foto' => $alumno->getFoto(),
            'candidatura' => $activeCandidatura ? [
                'id' => $activeCandidatura->getId(),
                'estado' => $activeCandidatura->getEstado(),
                'empresa' => $activeCandidatura->getOferta()->getEmpresa()->getNombreComercial(),
                'fechaInicio' => $activeCandidatura->getFechaInicio()?->format('Y-m-d'),
                'fechaFin' => $activeCandidatura->getFechaFin()?->format('Y-m-d'),
                'horario' => $activeCandidatura->getHorario(),
                'tipoDuracion' => $activeCandidatura->getTipoDuracion(),
                'oferta' => [
                    'titulo' => $activeCandidatura->getOferta()->getTitulo(),
                    'descripcion' => $activeCandidatura->getOferta()->getDescripcion(),
                    'tecnologias' => $activeCandidatura->getOferta()->getTecnologias(),
                    'ubicacion' => $activeCandidatura->getOferta()->getUbicacion(),
                    'jornada' => $activeCandidatura->getOferta()->getJornada(),
                ]
            ] : null
        ]);
    }
}
