<?php

namespace App\Entity;

use App\Repository\OfertaRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: OfertaRepository::class)]
class Oferta
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $titulo = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $descripcion = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $tipo = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $tecnologias = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $ubicacion = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $jornada = null;

    #[ORM\Column(length: 50)]
    private ?string $estado = 'Activa';

    #[ORM\ManyToOne(inversedBy: 'ofertas')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Empresa $empresa = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $color = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $imagen = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $horario = null;

    #[ORM\OneToMany(mappedBy: 'oferta', targetEntity: Candidatura::class)]
    private Collection $candidaturas;

    public function __construct()
    {
        $this->candidaturas = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitulo(): ?string
    {
        return $this->titulo;
    }

    public function setTitulo(string $titulo): static
    {
        $this->titulo = $titulo;

        return $this;
    }

    public function getDescripcion(): ?string
    {
        return $this->descripcion;
    }

    public function setDescripcion(string $descripcion): static
    {
        $this->descripcion = $descripcion;

        return $this;
    }

    public function getEmpresa(): ?Empresa
    {
        return $this->empresa;
    }

    public function setEmpresa(?Empresa $empresa): static
    {
        $this->empresa = $empresa;

        return $this;
    }

    public function getTipo(): ?string
    {
        return $this->tipo;
    }

    public function setTipo(?string $tipo): static
    {
        $this->tipo = $tipo;
        return $this;
    }

    public function getTecnologias(): ?string
    {
        return $this->tecnologias;
    }

    public function setTecnologias(?string $tecnologias): static
    {
        $this->tecnologias = $tecnologias;
        return $this;
    }

    public function getUbicacion(): ?string
    {
        return $this->ubicacion;
    }

    public function setUbicacion(?string $ubicacion): static
    {
        $this->ubicacion = $ubicacion;
        return $this;
    }

    public function getJornada(): ?string
    {
        return $this->jornada;
    }

    public function setJornada(?string $jornada): static
    {
        $this->jornada = $jornada;
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
            $candidatura->setOferta($this);
        }

        return $this;
    }

    public function removeCandidatura(Candidatura $candidatura): static
    {
        if ($this->candidaturas->removeElement($candidatura)) {
            if ($candidatura->getOferta() === $this) {
                $candidatura->setOferta(null);
            }
        }

        return $this;
    }

    public function getColor(): ?string
    {
        return $this->color;
    }

    public function setColor(?string $color): static
    {
        $this->color = $color;
        return $this;
    }

    public function getImagen(): ?string
    {
        return $this->imagen;
    }

    public function setImagen(?string $imagen): static
    {
        $this->imagen = $imagen;
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
}
