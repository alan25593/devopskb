---
title: "Firmado de Commits y Tags"
category: "Seguridad y Compliance"
tags: ["git", "security", "gpg", "ssh", "commits"]
description: "Asegura la autoría de tus commits firmándolos con GPG o claves SSH."
---

# Firmado de Commits y Tags 🔐

Buenas. Hoy toca ponernos serios con la seguridad. En Git, cualquiera puede hacer un commit usando tu mail (posta, es solo cambiar el `user.email`). Para evitar que alguien se haga pasar por vos e inyecte código malicioso a tu nombre, firmamos los commits. 

Github, Gitlab y Bitbucket te muestran ese tilde verde hermoso de "Verified" cuando haces las cosas bien.

## Opción 1: Firmar con GPG (La clásica)

Es el estándar de la industria, pero armar las llaves puede ser medio tedioso.

### 1. Generar la llave GPG
```bash
gpg --full-generate-key
# Elige RSA and RSA, tamaño 4096, y asóciala al mismo mail que usas en Git.
```

### 2. Obtener el ID de la llave
```bash
gpg --list-secret-keys --keyid-format=long
# Vas a ver algo como: rsa4096/3AA5C34371567BD2
# Copia ese ID (3AA5C34371567BD2)
```

### 3. Configurar Git
```bash
git config --global user.signingkey 3AA5C34371567BD2
# Obligar a Git a firmar todo por defecto
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

### 4. Exportar la llave pública (para Github/Gitlab)
```bash
gpg --armor --export 3AA5C34371567BD2
# Copia todo el bloque y pegalo en la config de SSH/GPG keys de tu proveedor.
```

## Opción 2: Firmar con SSH (La nueva escuela)

Desde Git 2.34+, podés firmar usando tu misma llave SSH con la que haces push. Es **mucho** más fácil si ya usás SSH y no querés meterte con GPG.

### 1. Configurar Git para usar SSH
```bash
git config --global gpg.format ssh
# Le decís a Git qué llave SSH usar (la pública)
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

### 2. Archivo de llaves permitidas (opcional pero recomendado)
Para que Git valide firmas localmente, creas un archivo de llaves permitidas:
```bash
touch ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
# Agregas tu mail y llave
echo "$(git config --get user.email) $(cat ~/.ssh/id_ed25519.pub)" >> ~/.ssh/allowed_signers
```

Subí tu llave SSH pública a Github como "Signing Key" (hay una solapa especial para eso, separada de "Authentication Keys") y listo, tilde verde instantáneo.

> [!TIP]
> Si en algún momento Git se queja de `gpg failed to sign the data`, probablemente te falta exportar la variable `GPG_TTY=$(tty)` en tu `.bashrc` o `.zshrc`. 
