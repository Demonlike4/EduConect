<?php

namespace App\Entity;

use App\Repository\GradoRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GradoRepository::class)]
class Grado
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $nombre = null;

    #[ORM\ManyToOne(inversedBy: 'grados')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Centro $centro = null;

    #[ORM\OneToMany(mappedBy: 'grado', targetEntity: Alumno::class)]
    private Collection $alumnos;

    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'gradosImpartidos')]
    private Collection $tutores;

    public function __construct()
    {
        $this->alumnos = new ArrayCollection();
        $this->tutores = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNombre(): ?string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): static
    {
        $this->nombre = $nombre;

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

    /**
     * @return Collection<int, Alumno>
     */
    public function getAlumnos(): Collection
    {
        return $this->alumnos;
    }

    public function addAlumno(Alumno $alumno): static
    {
        if (!$this->alumnos->contains($alumno)) {
            $this->alumnos->add($alumno);
            $alumno->setGrado($this);
        }

        return $this;
    }

    public function removeAlumno(Alumno $alumno): static
    {
        if ($this->alumnos->removeElement($alumno)) {
            if ($alumno->getGrado() === $this) {
                $alumno->setGrado(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getTutores(): Collection
    {
        return $this->tutores;
    }

    public function addTutor(User $tutor): static
    {
        if (!$this->tutores->contains($tutor)) {
            $this->tutores->add($tutor);
            $tutor->addGradosImpartido($this);
        }

        return $this;
    }

    public function removeTutor(User $tutor): static
    {
        if ($this->tutores->removeElement($tutor)) {
            $tutor->removeGradosImpartido($this);
        }

        return $this;
    }
}
