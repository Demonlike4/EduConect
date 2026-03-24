<?php

namespace App\Controller;

use App\Entity\Candidatura;
use App\Service\CandidaturaManager;
use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/documento')]
class DocumentoController extends AbstractController
{
    #[Route('/convenio/{id}', name: 'app_documento_convenio', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function generarConvenio(Candidatura $candidatura, CandidaturaManager $manager): Response
    {
        if ($candidatura->getEstado() !== 'VALIDADO') {
            throw $this->createAccessDeniedException('La candidatura no está validada.');
        }

        $pdfContent = $manager->generateConvenioPdf($candidatura);

        return new Response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="convenio.pdf"',
        ]);
    }
}
