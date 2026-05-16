<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class CandidaturaFirma
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $firmaTutorCentro = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $firmaTutorEmpresa = null;

    public function getId(): ?int
    {
        return $this->id;
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
}
