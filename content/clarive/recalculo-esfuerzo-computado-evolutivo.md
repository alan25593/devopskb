---
title: "Recálculo de Esfuerzo Computado en Evolutivos (Clarive)"
category: "clarive"
tags: ["clarive", "perl", "mongodb", "esfuerzo", "evolutivo", "recalculo", "post-modified"]
keywords: ["recalculo esfuerzo computado evolutivo", "esfuerzo computado especificacion", "clarive esfuerzo evolutivo", "todos mis descendientes clarive", "regla clarive esfuerzo", "esfuerzos otros evos clarive", "barrera corte evolutivo clarive"]
description: "Cómo calcular y recalcular los campos de esfuerzo computado (especificación y construcción) en Evolutivos de Clarive, evitando sumar esfuerzos de otros EVOs relacionados o estados cancelados."
---

# Recálculo de Esfuerzo Computado en Evolutivos

En Clarive, los atributos **`esfuerzo_computado_especificacion`** (Análisis y Diseño) y **`esfuerzo_computado_construccion`** consolidan los esfuerzos registrados en un Evolutivo (EVO) y en sus tópicos descendientes legítimos.

---

## 1. Problema: Incrementos Fantasma y Cruce entre EVOs

Al revisar el log de auditoría de un Evolutivo (por ejemplo, `#326851`), se detectó que `esfuerzo_computado_especificacion` se incrementaba progresivamente (ej. $262.5 \rightarrow 264 \rightarrow 265.5 \rightarrow 273.5 \rightarrow 303$) **sin que existieran cargas de esfuerzos visibles en el EVO ni en sus tópicos hijos**.

### Causas Raíz Técnicas

1. **Salto de Relación en `SERVICE.TOPIC.RELATED`:**
   - La regla disparada al modificar un esfuerzo buscaba el Evolutivo ancestro con `Depth: 4`, `Query type: parents`, `Single: true`.
   - Cuando un EVO nuevo (#339505) está enlazado a un EVO anterior (#326851), el servicio ascendía hasta el EVO relacionado y lo seleccionaba para actualizar.
   - Además, el filtro de estados solo tenía `CANCELADO`, omitiendo estados reales como **`CANCELADA POR INACTIVIDAD`**.
2. **Descenso a otros Evolutivos (`_created_by_parent`):**
   - La función recursiva de búsqueda descendente navegaba en base a `_created_by_parent`.
   - Si el EVO nuevo fue creado desde el EVO viejo, su `_created_by_parent` era el EVO viejo.
   - El script no validaba la categoría del hijo y **descendía dentro del nuevo Evolutivo**, absorbiendo las épicas y esfuerzos de otro proyecto.
3. **Falta de Filtro de Estados y Categorías:**
   - No se validaba si el esfuerzo o el tópico intermedio estaba cancelado.
   - No se restringía la búsqueda a las categorías aprobadas por la especificación funcional (Épicas, Historias de Usuario, Parametrías, Cambios de Alcance).

---

## 2. Configuración en Clarive (Regla CM: Post Modified)

### A. Servicio: Buscar Cambios EVO (`[SERVICE.TOPIC.RELATED]`)
- **Mid:** `${mid}`
- **Query type:** `parents`
- **Filter categories:** `Evolutivo`
- **Filter statuses:** Agregar **todos** los estados inactivos del catálogo:
  - `CANCELADO`
  - `CANCELADA`
  - `CANCELADA POR INACTIVIDAD`
  - `CANCELADO POR INACTIVIDAD`
- **Not in statuses:** `[x]` (Marcado)
- **Depth:** `4`
- **Single?:** `[x]`
- **Mids only?:** `[x]`

---

### B. Nodo de Código: Buscar Esfuerzos EVO Hijos
Implementa la **barrera de corte de Evolutivos** para evitar cruce entre proyectos, filtra cancelados y restringe categorías según la matriz funcional:

```perl
use List::Util qw(uniq);

my $evo_mid = $stash->{evo_esfuerzo};
my $niveles = 5;

# Categorías autorizadas por la matriz funcional
my %cat_permitidas = map { $_ => 1 } (
    'Épica',
    'Epica',
    'Historia de Usuario',
    'Parametria',
    'Parametría',
    'Cambio de Alcance'
);

sub todos_mis_descendientes {
    my ($niveles_restantes, @padres) = @_;
    return () if $niveles_restantes <= 0 || !@padres;

    # Soportar búsqueda tanto por string como por int para MongoDB
    my @padres_query = map { ($_, 0 + $_) } @padres;

    my @hijos = mdb->topic->find({
        _created_by_parent => { '$in' => \@padres_query },
        status             => { '$nin' => [
            'CANCELADO', 
            'CANCELADA', 
            'CANCELADA POR INACTIVIDAD', 
            'CANCELADO POR INACTIVIDAD'
        ]}
    })->fields({ _id => 0, mid => 1, category_name => 1, status => 1 })->all;

    return () unless @hijos;

    my @esfuerzos_encontrados;
    my @padres_siguiente_nivel;

    foreach my $hijo (@hijos) {
        my $cat = $hijo->{category_name} // '';

        # 1. Si es esfuerzo, se recolecta
        if ($cat eq 'Esfuerzo') {
            push @esfuerzos_encontrados, $hijo->{mid};
        }
        # 2. BARRERA DE SEGURIDAD: Nunca descender a otro Evolutivo
        elsif ($cat eq 'Evolutivo') {
            _info "Omitiendo Evolutivo hijo/relacionado MID: $hijo->{mid} para aislar proyectos";
            next;
        }
        # 3. Solo descender por ramas autorizadas
        elsif ($cat_permitidas{$cat}) {
            push @padres_siguiente_nivel, $hijo->{mid};
        }
    }

    my @descendientes_profundos = ();
    if (@padres_siguiente_nivel) {
        @descendientes_profundos = todos_mis_descendientes($niveles_restantes - 1, @padres_siguiente_nivel);
    }

    return (@esfuerzos_encontrados, @descendientes_profundos);
}

# Ejecutar recursión desde el EVO raíz
my @esfuerzos_raw = todos_mis_descendientes($niveles, ($evo_mid));

# Deduplicar MIDs
my @esfuerzos = uniq(grep { defined $_ && $_ ne '' } @esfuerzos_raw);

_log "Nº Esfuerzos legítimos del EVO $evo_mid: " . scalar(@esfuerzos);
_log _dump \@esfuerzos;

$stash->{esfuerzos_evo} = \@esfuerzos;
```

---

### C. Nodo de Código: Asignar Datos del EST EVO
Valida que cada esfuerzo esté activo y normaliza decimales:

```perl
my @evo_estimacion_suma_est = @{ $stash->{esfuerzos_evo} || [] };
_info "evo_estimacion_suma_est: @evo_estimacion_suma_est"; 

my $total_a = 0; # Especificación (Análisis / Diseño)
my $total_b = 0; # Construcción

foreach my $topico_es (@evo_estimacion_suma_est) {
    my $mid = ref($topico_es) eq 'HASH' ? $topico_es->{mid} : $topico_es;
    next unless $mid;
    
    my $est_p = mdb->topic->find_one({ mid => { '$in' => ["$mid", 0 + $mid] } });
    next unless $est_p; 
    
    # Omitir esfuerzos cancelados
    my $status = $est_p->{status} // '';
    next if $status =~ /cancel/i;
    
    my $tipo_esf = '';
    if (ref($est_p->{tipo_esfuerzo}) eq 'ARRAY' && @{$est_p->{tipo_esfuerzo}}) {
        $tipo_esf = $est_p->{tipo_esfuerzo}->[0] // '';
    } else {
        $tipo_esf = $est_p->{tipo_esfuerzo} // '';
    }
    
    my $horas = $est_p->{horas} // 0;
    $horas =~ s/,/./;
    $horas = 0 unless $horas =~ /^-?\d+(\.\d+)?$/;
    
    _info "Procesando Esfuerzo $mid (tipo: $tipo_esf, horas: $horas)";
    
    # BFTipoEsfuerzo-25: Análisis | BFTipoEsfuerzo-26: Diseño
    if ($tipo_esf eq 'BFTipoEsfuerzo-25' || $tipo_esf eq 'BFTipoEsfuerzo-26') {
        $total_a += $horas;
    }
    # BFTipoEsfuerzo-27 / BFTipoEsfuerzo-42: Construcción
    elsif ($tipo_esf eq 'BFTipoEsfuerzo-27' || $tipo_esf eq 'BFTipoEsfuerzo-42') {
        $total_b += $horas;
    }
}

$stash->{datos_esf_ev} = {
    esfuerzo_computado_especificacion => $total_a,
    esfuerzo_computado_construccion   => $total_b,
};

_info "total_a (Especificación): " . $total_a;
_info "total_b (Construcción): " . $total_b;
```

---

## 3. Script de Recálculo Manual / Mantenimiento Masivo

Dado que las reglas `Post Modified` son reactivas y no actúan de forma retroactiva, los EVOs que ya tenían datos erróneos (o que quedaron en 0 por ser inactivos) deben corregirse con este script desde la consola o job de Clarive:

```perl
use List::Util qw(uniq);

# Lista de EVOs a recalcular
my @evos_a_reparar = ('326851', '339505');

my %cat_permitidas = map { $_ => 1 } (
    'Épica', 'Epica',
    'Historia de Usuario',
    'Parametria', 'Parametría',
    'Cambio de Alcance'
);

sub obtener_esfuerzos_evo {
    my ($niveles, @padres) = @_;
    return () if $niveles <= 0 || !@padres;

    my @padres_query = map { ($_, 0 + $_) } @padres;

    my @hijos = mdb->topic->find({
        _created_by_parent => { '$in' => \@padres_query },
        status             => { '$nin' => [
            'CANCELADO', 'CANCELADA', 
            'CANCELADA POR INACTIVIDAD', 'CANCELADO POR INACTIVIDAD'
        ]}
    })->fields({ _id => 0, mid => 1, category_name => 1, status => 1 })->all;

    return () unless @hijos;

    my @esfs;
    my @siguiente_nivel;

    foreach my $hijo (@hijos) {
        my $cat = $hijo->{category_name} // '';
        if ($cat eq 'Esfuerzo') {
            push @esfs, $hijo->{mid};
        } elsif ($cat eq 'Evolutivo') {
            next; # BARRERA: No entrar a otros Evolutivos
        } elsif ($cat_permitidas{$cat}) {
            push @siguiente_nivel, $hijo->{mid};
        }
    }

    my @deep = ();
    if (@siguiente_nivel) {
        @deep = obtener_esfuerzos_evo($niveles - 1, @siguiente_nivel);
    }
    return (@esfs, @deep);
}

foreach my $evo_mid (@evos_a_reparar) {
    my $evo = mdb->topic->find_one({ mid => { '$in' => ["$evo_mid", 0 + $evo_mid] } });
    unless ($evo) {
        print "EVO #$evo_mid no encontrado.\n";
        next;
    }

    print "\n========================================\n";
    print "Procesando EVO #$evo_mid (" . ($evo->{title} // '') . ")\n";
    print "Estado: " . ($evo->{status} // '') . "\n";
    print "Valor anterior en BD: " . ($evo->{esfuerzo_computado_especificacion} // 0) . "\n";

    my @esfuerzos_raw = obtener_esfuerzos_evo(5, ($evo_mid));
    my @esfuerzos = uniq(grep { defined $_ && $_ ne '' } @esfuerzos_raw);

    my $total_a = 0; # Especificación
    my $total_b = 0; # Construcción

    foreach my $mid_esf (@esfuerzos) {
        my $t = mdb->topic->find_one({ mid => { '$in' => ["$mid_esf", 0 + $mid_esf] } });
        next unless $t;
        next if ($t->{status} // '') =~ /cancel/i;

        my $tipo = ref($t->{tipo_esfuerzo}) eq 'ARRAY' ? $t->{tipo_esfuerzo}->[0] : $t->{tipo_esfuerzo};
        my $horas = $t->{horas} // 0;
        $horas =~ s/,/./;
        $horas = 0 unless $horas =~ /^-?\d+(\.\d+)?$/;

        if ($tipo eq 'BFTipoEsfuerzo-25' || $tipo eq 'BFTipoEsfuerzo-26') {
            $total_a += $horas;
        } elsif ($tipo eq 'BFTipoEsfuerzo-27' || $tipo eq 'BFTipoEsfuerzo-42') {
            $total_b += $horas;
        }
    }

    print "Nuevo valor calculado -> Especificación: $total_a | Construcción: $total_b\n";

    mdb->topic->update(
        { mid => $evo->{mid} },
        { '$set' => {
            esfuerzo_computado_especificacion => $total_a,
            esfuerzo_computado_construccion   => $total_b
        }}
    );

    eval {
        Baseliner::Model::Topic->touch($evo->{mid});
    };

    print "¡EVO #$evo_mid actualizado exitosamente!\n";
}
```
