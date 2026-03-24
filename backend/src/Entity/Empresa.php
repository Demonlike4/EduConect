<?php

namespace App\Entity;

use App\Repository\EmpresaRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EmpresaRepository::class)]
class Empresa
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $nombreComercial = null;

    #[ORM\Column(length: 255)]
    private ?string $cif = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $descripcionPublica = null;

    #[ORM\OneToOne(inversedBy: 'empresa', cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\OneToMany(mappedBy: 'empresa', targetEntity: Oferta::class)]
    private Collection $ofertas;

    #[ORM\OneToMany(mappedBy: 'empresaLaboral', targetEntity: User::class)]
    private Collection $tutores;

    public function __construct()
    {
        $this->ofertas = new ArrayCollection();
        $this->tutores = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNombreComercial(): ?string
    {
        return $this->nombreComercial;
    }

    public function setNombreComercial(string $nombreComercial): static
    {
        $this->nombreComercial = $nombreComercial;

        return $this;
    }

    public function getCif(): ?string
    {
        return $this->cif;
    }

    public function setCif(string $cif): static
    {
        $this->cif = $cif;

        return $this;
    }

    public function getDescripcionPublica(): ?string
    {
        return $this->descripcionPublica;
    }

    public function setDescripcionPublica(?string $descripcionPublica): static
    {
        $this->descripcionPublica = $descripcionPublica;

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

    /**
     * @return Collection<int, Oferta>
     */
    public function getOfertas(): Collection
    {
        return $this->ofertas;
    }

    public function addOferta(Oferta $oferta): static
    {
        if (!$this->ofertas->contains($oferta)) {
            $this->ofertas->add($oferta);
            $oferta->setEmpresa($this);
        }

        return $this;
    }

    public function removeOferta(Oferta $oferta): static
    {
        if ($this->ofertas->removeElement($oferta)) {
            if ($oferta->getEmpresa() === $this) {
                $oferta->setEmpresa(null);
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
            $tutor->setEmpresaLaboral($this);
        }

        return $this;
    }

    public function removeTutor(User $tutor): static
    {
        if ($this->tutores->removeElement($tutor)) {
            // set the owning side to null (unless already changed)
            if ($tutor->getEmpresaLaboral() === $this) {
                $tutor->setEmpresaLaboral(null);
            }
        }

        return $this;
    }
}
