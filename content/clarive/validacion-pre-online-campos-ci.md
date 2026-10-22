---
title: "Validación Pre-Online de Campos CI, Arrays y Obligatoriedad en Formularios"
category: "clarive"
tags: ["clarive", "perl", "validaciones", "pre-online", "stash", "formularios"]
keywords: ["validacion pre online clarive", "stash errors clarive", "_array clarive", "validar campo ci vacio", "array vacio perl clarive", "validar campos obligatorios clarive"]
description: "Cómo validar correctamente campos relacionadores de CIs, textos, HTML y checkboxes en reglas Pre-Online de Clarive evitando falsos positivos."
---

# Validación Pre-Online de Campos CI y Obligatoriedad en Clarive

Al implementar reglas de validación **Pre-Online** (en creación, modificación o cambio de estado de tópicos) en Clarive mediante `$stash->{errors}`, existen tres particularidades críticas en Perl que deben contemplarse para evitar falsos positivos.

## 1. El Problema del `ArrayRef` Vacío al Limpiar un Campo CI

Si se evalúa directamente la referencia en Perl:

```perl
# ❌ INCORRECTO: Falla cuando el usuario selecciona un CI, da error, lo borra y reintenta
if ($stash->{control_configuraciones}) {
    push @errors, "No debe haber un CMDB seleccionado.";
}
```

1. Cuando el formulario se abre por primera vez y el campo no se toca, `$stash->{control_configuraciones}` suele ser `undef` o `""` (evalúa a `false`).
2. Sin embargo, si el usuario selecciona un elemento, salta la validación, **borra el elemento del campo en la UI** e intenta crear nuevamente, el frontend envía un **array vacío `[]`** (o `['']`).
3. En Perl, cualquier referencia (`ARRAY(0x...)`) en contexto booleano (`if ($ref)`) **siempre evalúa a `TRUE`**, haciendo que el error siga saltando aunque el campo esté visualmente vacío.

## 2. Checkboxes con Valor `'0'` y Campos HTML

- **Checkboxes (`preaprobado`, `requiere_cab`, `punto_no_retorno`):** Clarive almacena `'0'` cuando no están tildados. En Perl, `'0'` evalúa a `false` en un `if (!$valor)`, por lo que se debe validar con `defined($val) && $val ne ''`.
- **Editores HTML (`descripcion`):** Pueden enviar etiquetas vacías como `<p><br></p>`, por lo que conviene limpiar tags HTML y espacios antes de validar.

## Script Completo Validado (Pre-Online)

```perl
my $tipo_impacto    = $stash->{ci_tipo_impacto} // $stash->{topic_data}->{ci_tipo_impacto} // '';
my @configuraciones = grep { defined $_ && $_ ne '' && $_ ne '-' } _array(
    $stash->{control_configuraciones} // $stash->{topic_data}->{control_configuraciones}
);
my @errors = _array($stash->{errors});

# Función que valida correctamente Arrays (CIs), Strings, HTML y Checkboxes ('0' es válido)
sub esta_vacio {
    my ($val) = @_;
    return 1 unless defined $val;

    if (ref($val) eq 'ARRAY') {
        my @limpios = grep { defined $_ && $_ ne '' && $_ ne '-' } @$val;
        return scalar(@limpios) == 0 ? 1 : 0;
    }

    my $str = "$val";
    $str =~ s/<[^>]*>//g;   # Limpia tags HTML vacíos (ej. en descripcion)
    $str =~ s/^\s+|\s+$//g; # Limpia espacios en blanco
    return ($str eq '' || $str eq '-') ? 1 : 0;
}

# 1. Validación de Control de Configuraciones según el Tipo de Impacto
if ($tipo_impacto eq 'Creación' && @configuraciones) {
    push(@errors, "Si el Tipo de Impacto es 'Creación', el campo Control de Configuraciones debe estar vacío.");
} elsif (($tipo_impacto eq 'Modificación' || $tipo_impacto eq 'Baja') && !@configuraciones) {
    push(@errors, "Si el Tipo de Impacto es '$tipo_impacto', debe seleccionar un CMDB en Control de Configuraciones.");
}

# 2. Lista de campos obligatorios (id_campo => Nombre visible)
my @campos_cmdb_obligatorios = (
    [ 'cmdb_title'                => 'CMDB Title' ],
    [ 'descripcion'               => 'Descripción' ],
    [ 'perfil'                    => 'Perfil' ],
    [ 'categoria'                 => 'Categoría' ],
    [ 'subcategoria'              => 'SubCategoría' ],
    [ 'equipo_resolutor'          => 'Equipo Resolutor' ],
    [ 'nivel_impacto_ci'          => 'Nivel Impacto CI' ],
    [ 'impacto'                   => 'Impacto' ],
    [ 'riesgo'                    => 'Riesgo' ],
    [ 'tipo_de_cambio'            => 'Tipo de Cambio' ],
    [ 'tipo_de_ci'                => 'Tipo de CI' ],
    [ 'requiere_ci'               => 'Requiere CI' ],
    [ 'preaprobado'               => 'PreAprobado' ],
    [ 'requiere_cab'              => 'Requiere CAB' ],
    [ 'frecuencia'                => 'Frecuencia' ],
    [ 'ventana_autorizada'        => 'Ventana Autorizada' ],
    [ 'ambientes'                 => 'Ambientes' ],
    [ 'duracion_estimada'         => 'Duración Estimada' ],
    [ 'sla'                       => 'SLA' ],
    [ 'procedimiento_documentado' => 'Procedimiento Documentado' ],
    [ 'plan_rollback'             => 'Plan Rollback' ],
    [ 'punto_no_retorno'          => 'Punto no retorno' ],
    [ 'dependencia'               => 'Dependencia' ],
    [ 'servicio_impactado'        => 'Servicio Impactado' ],
    [ 'dueno_del_servicio'        => 'Dueño del Servicio' ],
    [ 'aprobador_funcinoal'       => 'Aprobador Funcional' ],
    [ 'metrica_exito'             => 'Métrica Éxito' ],
);

my @faltantes;

foreach my $item (@campos_cmdb_obligatorios) {
    my ($id_campo, $etiqueta) = @$item;
    my $valor = $stash->{$id_campo} // $stash->{topic_data}->{$id_campo};

    if (esta_vacio($valor)) {
        push(@faltantes, $etiqueta);
    }
}

if (@faltantes) {
    push(@errors, "Los siguientes campos de CMDB son obligatorios y no pueden estar vacíos: " . join(', ', @faltantes) . ".");
}

if (@errors) {
    $stash->{errors} = \@errors;
}
```
