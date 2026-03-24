<?php

namespace App\Entity;

use App\Repository\CandidaturaRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CandidaturaRepository::class)]
class Candidatura
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $estado = 'POSTULADO'; // POSTULADO, ADMITIDO, VALIDADO

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $fechaInicio = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $fechaFin = null;

    #[ORM\Column(length: 255)]
    private ?string $tipoDuracion = null; // 1_mes, 2_meses

    #[ORM\ManyToOne(inversedBy: 'candidaturas')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Alumno $alumno = null;

    #[ORM\ManyToOne(inversedBy: 'candidaturas')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Oferta $oferta = null;

    #[ORM\ManyToOne(inversedBy: 'candidaturasTutorCentro')]
    private ?User $tutorCentro = null;

    #[ORM\ManyToOne(inversedBy: 'candidaturasTutorEmpresa')]
    private ?User $tutorEmpresa = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $horario = null; // manana, tarde

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $firmaTutorCentro = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $firmaTutorEmpresa = null;

    #[ORM\OneToMany(mappedBy: 'candidatura', targetEntity: DiarioActividad::class, cascade: ['remove'])]
    private Collection $actividadesDiarias;

    public function __construct()
    {
        $this->actividadesDiarias = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getFechaInicio(): ?\DateTimeInterface
    {
        return $this->fechaInicio;
    }

    public function setFechaInicio(\DateTimeInterface $fechaInicio): static
    {
        $this->fechaInicio = $fechaInicio;

        return $this;
    }

    public function getFechaFin(): ?\DateTimeInterface
    {
        return $this->fechaFin;
    }

    public function setFechaFin(\DateTimeInterface $fechaFin): static
    {
        $this->fechaFin = $fechaFin;

        return $this;
    }

    public function getTipoDuracion(): ?string
    {
        return $this->tipoDuracion;
    }

    public function setTipoDuracion(string $tipoDuracion): static
    {
        $this->tipoDuracion = $tipoDuracion;

        return $this;
    }

    public function getAlumno(): ?Alumno
    {
        return $this->alumno;
    }

    public function setAlumno(?Alumno $alumno): static
    {
        $this->alumno = $alumno;

        return $this;
    }

    public function getOferta(): ?Oferta
    {
        return $this->oferta;
    }

    public function setOferta(?Oferta $oferta): static
    {
        $this->oferta = $oferta;

        return $this;
    }

    public function getTutorCentro(): ?User
    {
        return $this->tutorCentro;
    }

    public function setTutorCentro(?User $tutorCentro): static
    {
        $this->tutorCentro = $tutorCentro;

        return $this;
    }

    public function getTutorEmpresa(): ?User
    {
        return $this->tutorEmpresa;
    }

    public function setTutorEmpresa(?User $tutorEmpresa): static
    {
        $this->tutorEmpresa = $tutorEmpresa;

        return $this;
    }

    public function getHorario(): ?string
    {
        return $this->horario;
    }

    public function setHorario(?string $horario): static
    {
        $this->horario = $horario;

        return $this;
    }

    public function getFirmaTutorCentro(): ?string
    {
        return $this->firmaTutorCentro;
    }

    public function setFirmaTutorCentro(?string $firmaTutorCentro): static
    {
        $this->firmaTutorCentro = $firmaTutorCentro;

        return $this;
    }

    public function getFirmaTutorEmpresa(): ?string
    {
        return $this->firmaTutorEmpresa;
    }

    public function setFirmaTutorEmpresa(?string $firmaTutorEmpresa): static
    {
        $this->firmaTutorEmpresa = $firmaTutorEmpresa;

        return $this;
    }

    /**
     * @return Collection<int, DiarioActividad>
     */
    public function getActividadesDiarias(): Collection
    {
        return $this->actividadesDiarias;
    }
}
