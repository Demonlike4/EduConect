<?php

namespace App\Entity;

use App\Repository\DiarioActividadRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DiarioActividadRepository::class)]
class DiarioActividad
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $fecha = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $actividad = null;

    #[ORM\Column]
    private ?float $horas = null;

    #[ORM\Column(length: 255)]
    private ?string $estado = 'PENDIENTE'; // PENDIENTE, APROBADO, RECHAZADO

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $observacionesTutor = null;

    #[ORM\ManyToOne(inversedBy: 'actividadesDiarias')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Candidatura $candidatura = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFecha(): ?\DateTimeInterface
    {
        return $this->fecha;
    }

    public function setFecha(\DateTimeInterface $fecha): static
    {
        $this->fecha = $fecha;

        return $this;
    }

    public function getActividad(): ?string
    {
        return $this->actividad;
    }

    public function setActividad(string $actividad): static
    {
        $this->actividad = $actividad;

        return $this;
    }

    public function getHoras(): ?float
    {
        return $this->horas;
    }

    public function setHoras(float $horas): static
    {
        $this->horas = $horas;

        return $this;
    }

    public function getEstado(): ?string
    {
        return $this->estado;
    }

    public function setEstado(string $estado): static
    {
        $this->estado = $estado;

        return $this;
    }

    public function getObservacionesTutor(): ?string
    {
        return $this->observacionesTutor;
    }

    public function setObservacionesTutor(?string $observacionesTutor): static
    {
        $this->observacionesTutor = $observacionesTutor;

        return $this;
    }

    public function getCandidatura(): ?Candidatura
    {
        return $this->candidatura;
    }

    public function setCandidatura(?Candidatura $candidatura): static
    {
        $this->candidatura = $candidatura;

        return $this;
    }
}
