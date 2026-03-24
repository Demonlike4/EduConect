<?php

namespace App\Entity;

use App\Repository\CentroRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CentroRepository::class)]
class Centro
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $nombre = null;

    #[ORM\Column(length: 255)]
    private ?string $direccion = null;

    #[ORM\OneToMany(mappedBy: 'centro', targetEntity: Grado::class)]
    private Collection $grados;

    #[ORM\OneToMany(mappedBy: 'centro', targetEntity: Alumno::class)]
    private Collection $alumnos;

    #[ORM\OneToMany(mappedBy: 'centroEducativo', targetEntity: User::class)]
    private Collection $tutores;

    public function __construct()
    {
        $this->grados = new ArrayCollection();
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

    public function getDireccion(): ?string
    {
        return $this->direccion;
    }

    public function setDireccion(string $direccion): static
    {
        $this->direccion = $direccion;

        return $this;
    }

    /**
     * @return Collection<int, Grado>
     */
    public function getGrados(): Collection
    {
        return $this->grados;
    }

    public function addGrado(Grado $grado): static
    {
        if (!$this->grados->contains($grado)) {
            $this->grados->add($grado);
            $grado->setCentro($this);
        }

        return $this;
    }

    public function removeGrado(Grado $grado): static
    {
        if ($this->grados->removeElement($grado)) {
            // set the owning side to null (unless already changed)
            if ($grado->getCentro() === $this) {
                $grado->setCentro(null);
            }
        }

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
            $alumno->setCentro($this);
        }

        return $this;
    }

    public function removeAlumno(Alumno $alumno): static
    {
        if ($this->alumnos->removeElement($alumno)) {
            if ($alumno->getCentro() === $this) {
                $alumno->setCentro(null);
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
            $tutor->setCentroEducativo($this);
        }

        return $this;
    }

    public function removeTutor(User $tutor): static
    {
        if ($this->tutores->removeElement($tutor)) {
            // set the owning side to null (unless already changed)
            if ($tutor->getCentroEducativo() === $this) {
                $tutor->setCentroEducativo(null);
            }
        }

        return $this;
    }
}
