<?php

namespace App\Entity;

use App\Repository\AlumnoRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AlumnoRepository::class)]
class Alumno
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $habilidades = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $cvPdf = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $foto = null;

    #[ORM\OneToOne(inversedBy: 'alumno', cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\ManyToOne(inversedBy: 'alumnos')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Centro $centro = null;

    #[ORM\ManyToOne(inversedBy: 'alumnos')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Grado $grado = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $tutorCentro = null;

    #[ORM\OneToMany(mappedBy: 'alumno', targetEntity: Candidatura::class)]
    private Collection $candidaturas;

    public function __construct()
    {
        $this->candidaturas = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getHabilidades(): ?string
    {
        return $this->habilidades;
    }

    public function setHabilidades(?string $habilidades): static
    {
        $this->habilidades = $habilidades;

        return $this;
    }

    public function getCvPdf(): ?string
    {
        return $this->cvPdf;
    }

    public function setCvPdf(?string $cvPdf): static
    {
        $this->cvPdf = $cvPdf;

        return $this;
    }

    public function getFoto(): ?string
    {
        return $this->foto;
    }

    public function setFoto(?string $foto): static
    {
        $this->foto = $foto;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getCentro(): ?Centro
    {
        return $this->centro;
    }

    public function setCentro(?Centro $centro): static
    {
        $this->centro = $centro;

        return $this;
    }

    public function getGrado(): ?Grado
    {
        return $this->grado;
    }

    public function setGrado(?Grado $grado): static
    {
        $this->grado = $grado;

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

    /**
     * @return Collection<int, Candidatura>
     */
    public function getCandidaturas(): Collection
    {
        return $this->candidaturas;
    }

    public function addCandidatura(Candidatura $candidatura): static
    {
        if (!$this->candidaturas->contains($candidatura)) {
            $this->candidaturas->add($candidatura);
            $candidatura->setAlumno($this);
        }

        return $this;
    }

    public function removeCandidatura(Candidatura $candidatura): static
    {
        if ($this->candidaturas->removeElement($candidatura)) {
            if ($candidatura->getAlumno() === $this) {
                $candidatura->setAlumno(null);
            }
        }

        return $this;
    }
}
