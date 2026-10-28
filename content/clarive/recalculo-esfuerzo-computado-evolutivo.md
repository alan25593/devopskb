---
title: "Recálculo de Esfuerzo Computado en Evolutivos (Clarive)"
category: "clarive"
tags: ["clarive", "perl", "esfuerzo", "effort", "evolutivo", "recalculo", "post-modified", "calculate_effort"]
keywords: ["recalculo esfuerzo computado evolutivo", "esfuerzo computado especificacion", "clarive esfuerzo evolutivo", "service.topic.calculate_effort", "regla clarive esfuerzo", "esfuerzos otros evos clarive", "barrera corte evolutivo clarive", "Baseliner::RuleFuncs::launch"]
description: "Cómo calcular y recalcular los campos de esfuerzo computado (especificación y construcción) en Evolutivos de Clarive usando service.topic.calculate_effort, sin sumar esfuerzos de otros EVOs relacionados."
---

# Recálculo de Esfuerzo Computado en Evolutivos

En Clarive, los atributos **`esfuerzo_computado_especificacion`** (Análisis y Diseño) y **`esfuerzo_computado_construccion`** consolidan los esfuerzos cargados en un Evolutivo (EVO) y en sus tópicos descendientes.

**Regla de negocio:** cada EVO suma **solo sus propios esfuerzos**. Nunca suma los de otro Evolutivo, aunque estén relacionados o uno se haya creado a partir del otro.

---

## 1. Cómo se guardan los esfuerzos

El esfuerzo **no es una categoría de tópico**: es un objeto *effort* (otra clase). Buscar hijos con `category_name eq 'Esfuerzo'` en `mdb->topic` no devuelve nada y cualquier cálculo hecho así da **0**.

Para obtener horas hay que usar el servicio nativo **`service.topic.calculate_effort`** (implementado en `BaselinerX::Service::TopicServices`). Devuelve en el stash:

```perl
{
    total             => 134,
    total_by_type     => { 'Análisis' => 113.5, 'Diseño' => 20.5 },
    total_by_status   => { en_progreso => { total => 79, total_by_type => {...} }, ... },
    first_effort_date => '2026-07-29',
    last_effort_date  => '2026-10-14',
}
```

| Campo del EVO | Tipos de esfuerzo |
|---|---|
| `esfuerzo_computado_especificacion` | `BFTipoEsfuerzo-25` (Análisis), `BFTipoEsfuerzo-26` (Diseño) |
| `esfuerzo_computado_construccion` | `BFTipoEsfuerzo-27`, `BFTipoEsfuerzo-42`, `cla-default-BFTipoEsfuerzo-51`, `BFTipoEsfuerzo-38` |

---

## 2. Problema: el EVO suma esfuerzos de otro EVO

La regla original llamaba a `calculate_effort` sobre el EVO con `depth: 3` y `categories` vacío. El servicio recorre todo el árbol y **no se detiene al llegar a otro Evolutivo**: si un EVO está relacionado con otro (o el nuevo se creó desde el viejo), suma las horas de ambos.

Además, el servicio `Buscar EVO` (`service.topic.related`, `query_type: parents`) solo excluía un estado cancelado, por lo que podía elegir como destino un EVO `CANCELADA POR INACTIVIDAD`.

---

## 3. Solución: recorrido propio con barrera en Evolutivo

En lugar de pedirle a `calculate_effort` todo el árbol:

1. Se baja desde el EVO nivel por nivel (hasta 3) con `service.topic.related` en modo `children`.
2. **Si un hijo es de categoría `41` (Evolutivo), no se suma ni se desciende por él.**
3. Para cada tópico válido se pide a `calculate_effort` solo su esfuerzo directo (`depth: 0`) y se acumula.
4. Se calculan **especificación y construcción juntas**, así un cambio de tipo de esfuerzo no deja un campo desactualizado.

### Estructura de la regla (Post Modified del esfuerzo)

```
IF effort_type like ^(Análisis|Diseño|Desarrollo|Testing)$   (incluir también los tipos 51 y 38)
└─ GROUP "Cambio EVO"
   ├─ IF scope.id_category not_eq 41 → Buscar EVO (service.topic.related)
   │     parents, categoría 41, Not in statuses: todos los cancelados
   │     (CANCELADO, CANCELADA, CANCELADA POR INACTIVIDAD, CANCELADO POR INACTIVIDAD)
   ├─ ELSE → SET evo_esfuerzo = ${topic_mid}
   └─ IF evo_esfuerzo not_empty
      ├─ CODE "Calcular esfuerzo propio del EVO"   (código abajo)
      └─ service.topic.update
            mid = ${evo_esfuerzo}, username = clarive, touch_parents = 1
            esfuerzo_computado_especificacion = ${esfuerzo_espec}
            esfuerzo_computado_construccion   = ${esfuerzo_constr}
```

### Nodo CODE: Calcular esfuerzo propio del EVO

```perl
# Entrada: $stash->{evo_esfuerzo}
# Salida:  $stash->{esfuerzo_espec}, $stash->{esfuerzo_constr}, $stash->{esfuerzo_detalle}

my $CAT_EVOLUTIVO = '41';
my $PROFUNDIDAD   = 3;
my %TIPOS = (
    espec  => ['BFTipoEsfuerzo-25', 'BFTipoEsfuerzo-26'],
    constr => ['BFTipoEsfuerzo-27', 'BFTipoEsfuerzo-42', 'cla-default-BFTipoEsfuerzo-51', 'BFTipoEsfuerzo-38'],
);

my $lanzar  = defined &launch ? \&launch : \&Baseliner::RuleFuncs::launch;
my $evo_mid = "$stash->{evo_esfuerzo}";

# Hijos directos de un topico
my $hijos_de = sub {
    my ($mid) = @_;
    my $tmp = {};
    $lanzar->('service.topic.related', 'Hijos EVO', $tmp, {
        mid => "$mid", query_type => 'children', depth => '1',
        related_categories => '', related_status => '', not_in_status => '',
        single => '0', mid_only => '1', fields => '',
    }, 'hijos');
    my $r = $tmp->{hijos};
    my @l = ref $r eq 'ARRAY' ? @$r : (defined $r && $r ne '') ? ($r) : ();
    return map { ref $_ eq 'HASH' ? $_->{mid} : $_ } @l;
};

# 1) Recorrer el arbol del EVO cortando en cualquier otro Evolutivo
my %visto   = ($evo_mid => 1);
my @topicos = ($evo_mid);
my @nivel   = ($evo_mid);
foreach my $n (1 .. $PROFUNDIDAD) {
    my @siguiente;
    foreach my $padre (@nivel) {
        foreach my $hijo ($hijos_de->($padre)) {
            next if !$hijo || $visto{$hijo}++;
            my $t = mdb->topic->find_one({ mid => "$hijo" }) or next;
            next if ($t->{id_category} // '') eq $CAT_EVOLUTIVO;
            push @topicos, $hijo;
            push @siguiente, $hijo;
        }
    }
    @nivel = @siguiente or last;
}

# 2) Sumar solo los esfuerzos cargados directamente en cada topico (depth 0)
my %total = (espec => 0, constr => 0);
my @detalle;
foreach my $mid (@topicos) {
    foreach my $k (sort keys %TIPOS) {
        my $tmp = {};
        $lanzar->('service.topic.calculate_effort', 'Esfuerzo propio', $tmp, {
            mid => "$mid", depth => '0', effort_type => $TIPOS{$k},
            categories => '', statuses => '', init_date => '', end_date => '',
        }, 'esf');
        my $horas = ($tmp->{esf} || {})->{total} // 0;
        $total{$k} += $horas;
        push @detalle, { mid => $mid, tipo => $k, horas => $horas } if $horas;
    }
}

$stash->{esfuerzo_espec}   = $total{espec};
$stash->{esfuerzo_constr}  = $total{constr};
$stash->{esfuerzo_detalle} = \@detalle;
```

---

## 4. Recálculo retroactivo desde la consola

Las reglas `Post Modified` son reactivas: los EVOs con valores erróneos se corrigen con este script desde la consola Perl de Clarive.

> **Ojo:** la consola ejecuta en `Clarive::Code::Perl::Eval`, donde `launch` no existe. Hay que invocarlo como **`Baseliner::RuleFuncs::launch`**.

Con `$DRY_RUN = 1` solo muestra el desglose por tópico (nivel, categoría, horas), los Evolutivos que se cortan y la comparación entre el valor nuevo, el que daría la regla anterior y el guardado en BD. Con `$DRY_RUN = 0` escribe usando `service.topic.update`, igual que la regla.

```perl
# Consola: misma logica que el nodo de la regla + recalculo retroactivo
my @evos_a_reparar = ('326851', '339505');
my $DRY_RUN = 1;   # 1 = solo muestra; 0 = escribe en BD

my $CAT_EVOLUTIVO = '41';
my $PROFUNDIDAD   = 3;
my %TIPOS = (
    espec  => ['BFTipoEsfuerzo-25', 'BFTipoEsfuerzo-26'],
    constr => ['BFTipoEsfuerzo-27', 'BFTipoEsfuerzo-42', 'cla-default-BFTipoEsfuerzo-51', 'BFTipoEsfuerzo-38'],
);
my $lanzar = \&Baseliner::RuleFuncs::launch;

sub hijos_de {
    my ($mid) = @_;
    my $tmp = {};
    $lanzar->('service.topic.related', 'Hijos EVO', $tmp, {
        mid => "$mid", query_type => 'children', depth => '1',
        related_categories => '', related_status => '', not_in_status => '',
        single => '0', mid_only => '1', fields => '',
    }, 'hijos');
    my $r = $tmp->{hijos};
    my @l = ref $r eq 'ARRAY' ? @$r : (defined $r && $r ne '') ? ($r) : ();
    return map { ref $_ eq 'HASH' ? $_->{mid} : $_ } @l;
}

sub esfuerzo {
    my ($mid, $tipos, $depth) = @_;
    my $tmp = {};
    $lanzar->('service.topic.calculate_effort', 'Esfuerzo', $tmp, {
        mid => "$mid", depth => "$depth", effort_type => $tipos,
        categories => '', statuses => '', init_date => '', end_date => '',
    }, 'esf');
    return ($tmp->{esf} || {})->{total} // 0;
}

sub info {
    my ($t) = @_;
    return sprintf("#%s [%s] %s", $t->{mid}, $t->{category_name} // '?', substr($t->{title} // '', 0, 45));
}

foreach my $evo_mid (@evos_a_reparar) {
    my $evo = mdb->topic->find_one({ mid => "$evo_mid" });
    unless ($evo) { print "EVO #$evo_mid no encontrado.\n"; next; }

    print "\n========================================\n";
    print info($evo) . "\n";

    # Recorrido con barrera en Evolutivo
    my %visto   = ($evo_mid => 1);
    my @topicos = ([$evo, 0]);
    my @nivel   = ($evo_mid);
    foreach my $n (1 .. $PROFUNDIDAD) {
        my @siguiente;
        foreach my $padre (@nivel) {
            foreach my $hijo (hijos_de($padre)) {
                next if !$hijo || $visto{$hijo}++;
                my $t = mdb->topic->find_one({ mid => "$hijo" }) or next;
                if (($t->{id_category} // '') eq $CAT_EVOLUTIVO) {
                    print "  [CORTE] nivel $n: " . info($t) . " (otro Evolutivo, no se suma)\n";
                    next;
                }
                push @topicos, [$t, $n];
                push @siguiente, $hijo;
            }
        }
        @nivel = @siguiente or last;
    }

    my %total = (espec => 0, constr => 0);
    foreach my $item (@topicos) {
        my ($t, $n) = @$item;
        my %h = map { $_ => esfuerzo($t->{mid}, $TIPOS{$_}, 0) } keys %TIPOS;
        $total{$_} += $h{$_} for keys %h;
        printf "  nivel %d  %-60s espec=%-6s constr=%s\n", $n, info($t), $h{espec}, $h{constr};
    }

    # Control: lo que da la regla anterior (depth 3, sin barrera)
    printf "  -> NUEVO: espec=%s constr=%s | REGLA ACTUAL: espec=%s constr=%s | BD: espec=%s constr=%s\n",
        $total{espec}, $total{constr},
        esfuerzo($evo_mid, $TIPOS{espec}, 3), esfuerzo($evo_mid, $TIPOS{constr}, 3),
        $evo->{esfuerzo_computado_especificacion} // 0, $evo->{esfuerzo_computado_construccion} // 0;

    next if $DRY_RUN;

    my $tmp = {};
    $lanzar->('service.topic.update', 'Update esfuerzo evo', $tmp, {
        mid => "$evo_mid", username => 'clarive', touch_parents => '1',
        variables => {
            esfuerzo_computado_especificacion => $total{espec},
            esfuerzo_computado_construccion   => $total{constr},
        },
    }, '');
    print "  EVO #$evo_mid actualizado.\n";
}
```

---

## 5. Errores frecuentes

| Síntoma | Causa |
|---|---|
| El cálculo da siempre 0 | Se buscan esfuerzos como tópicos (`category_name eq 'Esfuerzo'`); son objetos *effort*. Usar `calculate_effort`. |
| `Undefined subroutine &Clarive::Code::Perl::Eval::launch` | En consola usar `Baseliner::RuleFuncs::launch`. |
| `"my" variable ... masks earlier declaration` / strings sin cerrar | La consola tenía código previo o el script se cortó al copiarlo. Vaciar la consola y copiar desde un archivo. |
| Un EVO suma horas de otro EVO | `calculate_effort` con `depth > 0` no corta en Evolutivos. Usar el recorrido con barrera. |
