<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private ?string $email = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $nombre = null;

    #[ORM\OneToOne(mappedBy: 'user', cascade: ['persist', 'remove'])]
    private ?Alumno $alumno = null;

    #[ORM\OneToOne(mappedBy: 'user', cascade: ['persist', 'remove'])]
    private ?Empresa $empresa = null;

    #[ORM\OneToMany(mappedBy: 'tutorCentro', targetEntity: Candidatura::class)]
    private Collection $candidaturasTutorCentro;

    #[ORM\OneToMany(mappedBy: 'tutorEmpresa', targetEntity: Candidatura::class)]
    private Collection $candidaturasTutorEmpresa;

    #[ORM\ManyToOne(inversedBy: 'tutores')]
    private ?Centro $centroEducativo = null;

    #[ORM\ManyToOne(inversedBy: 'tutores')]
    private ?Empresa $empresaLaboral = null;

    #[ORM\ManyToMany(targetEntity: Grado::class, inversedBy: 'tutores')]
    private Collection $gradosImpartidos;

    #[ORM\Column(options: ['default' => true])]
    private ?bool $isAprobado = true; // Default true for normal users, will be set to false for pending tutors

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $resetToken = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $resetTokenExpiry = null;

    public function __construct()
    {
        $this->candidaturasTutorCentro = new ArrayCollection();
        $this->candidaturasTutorEmpresa = new ArrayCollection();
        $this->gradosImpartidos = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    /**
     * Ensure the session doesn't contain actual password hashes by CRC32C-hashing them, as supported since Symfony 7.3.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0" . self::class . "\0password"] = hash('crc32c', $this->password);
        
        return $data;
    }

    public function eraseCredentials(): void
    {
        // If you store any temporary, sensitive data on the user, clear it here
        // $this->plainPassword = null;
    }

    public function getNombre(): ?string
    {
        return $this->nombre;
    }

    public function setNombre(?string $nombre): static
    {
        $this->nombre = $nombre;

        return $this;
    }

    public function getAlumno(): ?Alumno
    {
        return $this->alumno;
    }

    public function setAlumno(Alumno $alumno): static
    {
        // set the owning side of the relation if necessary
        if ($alumno->getUser() !== $this) {
            $alumno->setUser($this);
        }

        $this->alumno = $alumno;

        return $this;
    }

    public function getEmpresa(): ?Empresa
    {
        return $this->empresa;
    }

    public function setEmpresa(Empresa $empresa): static
    {
        // set the owning side of the relation if necessary
        if ($empresa->getUser() !== $this) {
            $empresa->setUser($this);
        }

        $this->empresa = $empresa;

        return $this;
    }

    /**
     * @return Collection<int, Candidatura>
     */
    public function getCandidaturasTutorCentro(): Collection
    {
        return $this->candidaturasTutorCentro;
    }

    public function addCandidaturasTutorCentro(Candidatura $candidaturasTutorCentro): static
    {
        if (!$this->candidaturasTutorCentro->contains($candidaturasTutorCentro)) {
            $this->candidaturasTutorCentro->add($candidaturasTutorCentro);
            $candidaturasTutorCentro->setTutorCentro($this);
        }

        return $this;
    }

    public function removeCandidaturasTutorCentro(Candidatura $candidaturasTutorCentro): static
    {
        if ($this->candidaturasTutorCentro->removeElement($candidaturasTutorCentro)) {
            // set the owning side to null (unless already changed)
            if ($candidaturasTutorCentro->getTutorCentro() === $this) {
                $candidaturasTutorCentro->setTutorCentro(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Candidatura>
     */
    public function getCandidaturasTutorEmpresa(): Collection
    {
        return $this->candidaturasTutorEmpresa;
    }

    public function addCandidaturasTutorEmpresa(Candidatura $candidaturasTutorEmpresa): static
    {
        if (!$this->candidaturasTutorEmpresa->contains($candidaturasTutorEmpresa)) {
            $this->candidaturasTutorEmpresa->add($candidaturasTutorEmpresa);
            $candidaturasTutorEmpresa->setTutorEmpresa($this);
        }

        return $this;
    }

    public function removeCandidaturasTutorEmpresa(Candidatura $candidaturasTutorEmpresa): static
    {
        if ($this->candidaturasTutorEmpresa->removeElement($candidaturasTutorEmpresa)) {
            // set the owning side to null (unless already changed)
            if ($candidaturasTutorEmpresa->getTutorEmpresa() === $this) {
                $candidaturasTutorEmpresa->setTutorEmpresa(null);
            }
        }

        return $this;
    }

    public function getCentroEducativo(): ?Centro
    {
        return $this->centroEducativo;
    }

    public function setCentroEducativo(?Centro $centroEducativo): static
    {
        $this->centroEducativo = $centroEducativo;

        return $this;
    }

    public function getEmpresaLaboral(): ?Empresa
    {
        return $this->empresaLaboral;
    }

    public function setEmpresaLaboral(?Empresa $empresaLaboral): static
    {
        $this->empresaLaboral = $empresaLaboral;

        return $this;
    }

    /**
     * @return Collection<int, Grado>
     */
    public function getGradosImpartidos(): Collection
    {
        return $this->gradosImpartidos;
    }

    public function addGradosImpartido(Grado $gradosImpartido): static
    {
        if (!$this->gradosImpartidos->contains($gradosImpartido)) {
            $this->gradosImpartidos->add($gradosImpartido);
        }

        return $this;
    }

    public function removeGradosImpartido(Grado $gradosImpartido): static
    {
        $this->gradosImpartidos->removeElement($gradosImpartido);

        return $this;
    }
    public function isAprobado(): ?bool
    {
        return $this->isAprobado;
    }

    public function setIsAprobado(bool $isAprobado): static
    {
        $this->isAprobado = $isAprobado;

        return $this;
    }

    public function getResetToken(): ?string
    {
        return $this->resetToken;
    }

    public function setResetToken(?string $resetToken): static
    {
        $this->resetToken = $resetToken;

        return $this;
    }

    public function getResetTokenExpiry(): ?\DateTimeInterface
    {
        return $this->resetTokenExpiry;
    }

    public function setResetTokenExpiry(?\DateTimeInterface $resetTokenExpiry): static
    {
        $this->resetTokenExpiry = $resetTokenExpiry;

        return $this;
    }
}
