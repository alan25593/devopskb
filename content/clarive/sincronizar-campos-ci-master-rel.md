---
title: "Reglas de Eventos (Post-Created, Topic Modified, Change Status) y Sincronización master_rel"
category: "clarive"
tags: ["clarive", "perl", "mongodb", "master_rel", "post-created", "topic-modified", "change-status", "ci"]
keywords: ["master_rel clarive", "copiar campos ci topico", "se ve en ui pero no al editar", "post created clarive", "topic modified bucle infinito", "field_changes clarive", "change status post offline"]
description: "Guía completa de reglas de eventos sobre tópicos en Clarive: cómo sincronizar mdb->topic y mdb->master_rel en Post-Created, Topic Modified (evitando bucles infinitos) y Topic Changed Status Post-Offline."
---

# Reglas de Eventos de Tópicos y Sincronización `master_rel`

Al automatizar la copia y sincronización de campos entre tópicos en Clarive (por ejemplo, entre **Gestión del Cambio GIT** y **CMDB**), el comportamiento del `$stash` y de MongoDB varía según el tipo de regla de evento.

## 1. Tipos de Reglas de Eventos y sus Diferencias

| Tipo de Regla | Momento de Ejecución | Particularidades Técnicas |
|---|---|---|
| **Pre-Online** | Antes de persistir en MongoDB | Se usa para validar y frenar el guardado agregando mensajes a `$stash->{errors}`. |
| **Action Post-Created** | Inmediatamente después de crear el tópico | El tópico ya existe en `mdb->topic`. Para que los campos CI funcionen al editar, se debe actualizar `mdb->topic` **y** `mdb->master_rel`, ejecutando `Baseliner::Model::Topic->touch` al final. |
| **Topic Modified** (`event.topic.modify`) | Al modificar un tópico existente | **Peligro de bucle infinito:** hacer `update` o `touch` dispara nuevamente `Topic Modified` con `username: clarive` y `field_changes: []`. Se debe filtrar al inicio y aplicar cambios solo si son diferentes a lo ya guardado. |
| **Topic Changed Status (Post-Offline)** | En background tras cambiar de estado (ej. a `Resuelta`) | En árboles con `Load topic data = topic_data` y `Update topic data` al final, se debe leer desde `mdb->topic` (con fallback a `$stash->{topic_data}`) y actualizar `$stash->{topic_data}` para que el último nodo no pise los cambios. |

---

## 2. Por qué los Campos CI se ven en la Vista pero desaparecen al Editar

En Clarive, los campos de tipo relación CI (`fieldlet.system.cis` o `fieldlet.system.list_topics`) almacenan datos en **dos colecciones**:
1. **`mdb->topic`:** Guarda el array de MIDs (ej. `['cla-default-BFImpactoGIT-1']`) y, tras correr `Baseliner::Model::Topic->touch`, genera la propiedad cacheada `<campo>._ci_name_list` (ej. `impacto._ci_name_list: Alto`). **De aquí lee la vista de lectura de la UI**.
2. **`mdb->master_rel`:** Guarda un documento por cada vínculo (`from_mid`, `to_mid`, `rel_field`, `from_bl`, `to_bl`, `ts`, `username`). **De aquí cargan sus valores los selectores CI cuando se abre el formulario en modo Edición**.

Si solo se ejecuta `mdb->topic->update`, la vista muestra los datos pero al hacer clic en **Edit** los campos CI aparecen en blanco.

---

## 3. Regla `Topic Modified`: Importación de CMDB + Cálculo de SLA sin Bucle Infinito

Incluye cortafuegos contra ejecuciones automáticas (`username eq 'clarive'`), marca `_last_cmdb_imported` + lectura de `field_changes` para importar una única vez cuando cambia el CMDB, y cálculo de `sla_ejecucion` a partir de los IDs de `BFImpactoGIT` / `BFRiesgo`:

```perl
# ============================================================
# CORTAFUEGOS ANTI-BUCLE:
# Si el evento lo disparó el propio sistema ('clarive'), salimos
# ============================================================
if (($stash->{username} // '') eq 'clarive' && !@{$stash->{field_changes} || []}) {
    return;
}

sub agregar_comentario {
    my ($mid, $texto) = @_;
    eval {
        my $post = ci->post->new({
            topic        => $mid,
            content_type => 'html',
            created_by   => 'clarive',
            created_on   => mdb->ts
        });
        $post->save();
        $post->put_data("<p>$texto</p>");
    };
}

sub obtener_mid {
    my ($valor) = @_;
    return undef unless defined $valor;

    if (ref($valor) eq 'ARRAY') {
        return undef unless @$valor;
        my $item = $valor->[0];
        if (ref($item) eq 'HASH') {
            return $item->{mid} || $item->{value} || $item->{topic_mid} || $item->{m};
        }
        return $item;
    }
    if (ref($valor) eq 'HASH') {
        return $valor->{mid} || $valor->{value} || $valor->{id} || $valor->{topic_mid} || $valor->{m};
    }
    return $valor;
}

sub a_lista {
    my $val = shift;
    return () unless defined $val;
    return ref($val) eq 'ARRAY' ? @$val : ($val);
}

sub campo_fue_modificado {
    my ($nombre_campo, $changes_ref) = @_;
    return 0 unless ref($changes_ref) eq 'ARRAY';
    foreach my $ch (@$changes_ref) {
        if (ref($ch) eq 'HASH') {
            my $id = $ch->{field} || $ch->{id_field} || $ch->{name} || '';
            return 1 if $id eq $nombre_campo;
        } elsif (!ref($ch) && $ch eq $nombre_campo) {
            return 1;
        }
    }
    return 0;
}

sub sincronizar_master_rel {
    my ($cmdb_mid, $topic_mid, $campo_origen, $campo_destino, $mids_ref, $user) = @_;

    mdb->master_rel->remove({
        from_mid  => "$topic_mid",
        rel_field => "$campo_destino"
    });

    return unless $mids_ref && @$mids_ref;

    my @rels_origen = mdb->master_rel->find({
        from_mid  => "$cmdb_mid",
        rel_field => "$campo_origen"
    })->all;

    if (@rels_origen) {
        foreach my $rel (@rels_origen) {
            delete $rel->{_id};
            $rel->{from_mid}  = "$topic_mid";
            $rel->{rel_field} = "$campo_destino";
            $rel->{ts}        = mdb->ts;
            $rel->{username}  = $user if $user;
            mdb->master_rel->insert($rel);
        }
    } else {
        foreach my $to_mid (@$mids_ref) {
            mdb->master_rel->insert({
                from_mid  => "$topic_mid",
                to_mid    => "$to_mid",
                rel_field => "$campo_destino",
                from_bl   => '*',
                to_bl     => '*',
                ts        => mdb->ts,
                username  => $user || 'clarive'
            });
        }
    }
}

my $topic_mid = $stash->{topic_mid} || $stash->{mid} || $stash->{topic_data}->{topic_mid} || $stash->{topic_data}->{mid};
my $user      = $stash->{username} || 'clarive';

my $topic_actual = mdb->topic->find_one({ mid => "$topic_mid" }) || {};

my $cmdb_mid = obtener_mid(
    $stash->{control_configuraciones}
    // $stash->{topic_data}->{control_configuraciones}
    // $topic_actual->{control_configuraciones}
);

my $hubo_touch_necesario = 0;

my $ultimo_cmdb_importado = $topic_actual->{_last_cmdb_imported} // '';
my $cambio_cmdb = ($cmdb_mid && $cmdb_mid ne '-' && (
    $cmdb_mid ne $ultimo_cmdb_importado ||
    campo_fue_modificado('control_configuraciones', $stash->{field_changes})
));

# 1. IMPORTACIÓN DESDE CMDB (Solo 1 vez cuando cambia el CMDB)
if ($cambio_cmdb) {
    eval {
        my $cmdb_topic = mdb->topic->find_one({ mid => "$cmdb_mid" });

        if ($cmdb_topic) {
            my %mapeo_campos = (
                'equipo_resolutor'          => 'equipo_resolutor',
                'categoria'                 => 'categoria',
                'subcategoria'              => 'subcategoria',
                'descripcion'               => 'descripcion',
                'perfil'                    => 'perfil',
                'tipo_de_cambio'            => 'tipo_de_cambio',
                'preaprobado'               => 'preaprobado',
                'requiere_cab'              => 'requiere_cab',
                'frecuencia'                => 'frecuencia',
                'ventana_autorizada'        => 'ventana_autorizada',
                'duracion_estimada'         => 'duracion_estimada',
                'sla'                       => 'sla',
                'procedimiento_documentado' => 'procedimiento_documentado',
                'plan_rollback'             => 'plan_rollback',
                'punto_no_retorno'          => 'punto_no_retorno',
                'dependencia'               => 'dependencia',
                'servicio_impactado'        => 'servicio_impactado',
                'dueno_del_servicio'        => 'dueno_del_servicio',
                'aprobador_funcinoal'       => 'aprobador_funcinoal',
                'metrica_exito'             => 'metrica_exito',
                'ambientes'                 => 'ambientes',
                'ci_tipo_impacto'           => 'ci_tipo_impacto',
                'nivel_impacto_ci'          => 'nivel_impacto_ci',
                'tipo_de_ci'                => 'tipo_de_ci',
                'requiere_ci'               => 'requiere_ci',
                'impacto'                   => 'impacto',
                'riesgo'                    => 'riesgo',
                'title'                     => 'cmdb_title',
            );

            my %campos_ci_rel = map { $_ => 1 } qw(
                equipo_resolutor categoria subcategoria perfil impacto riesgo nivel_impacto_ci
            );

            my %campos_actualizar = ( _last_cmdb_imported => "$cmdb_mid" );
            my %mids_para_rel;
            my $hubo_datos = 0;

            foreach my $campo_origen (keys %mapeo_campos) {
                my $campo_destino = $mapeo_campos{$campo_origen};
                my $valor_origen  = $cmdb_topic->{$campo_origen};

                if ($campos_ci_rel{$campo_destino}) {
                    my @valores_crudos = a_lista($valor_origen);
                    my @valores_limpios;

                    foreach my $item (@valores_crudos) {
                        my $mid_limpio = obtener_mid($item);
                        push @valores_limpios, "$mid_limpio" if defined($mid_limpio) && $mid_limpio ne '';
                    }

                    if (@valores_limpios) {
                        if (ref($valor_origen) eq 'ARRAY') {
                            $campos_actualizar{$campo_destino} = [ @valores_limpios ];
                        } else {
                            $campos_actualizar{$campo_destino} = $valores_limpios[0];
                        }
                        $mids_para_rel{$campo_origen} = [ @valores_limpios ];
                        $hubo_datos = 1;
                    } else {
                        $campos_actualizar{$campo_destino} = [];
                        $mids_para_rel{$campo_origen}      = [];
                    }
                } elsif (defined $valor_origen && $valor_origen ne '') {
                    $campos_actualizar{$campo_destino} = $valor_origen;
                    $hubo_datos = 1;
                }
            }

            if ($hubo_datos) {
                mdb->topic->update({ mid => "$topic_mid" }, { '$set' => \%campos_actualizar });

                foreach my $campo_origen (keys %mids_para_rel) {
                    my $campo_destino = $mapeo_campos{$campo_origen};
                    sincronizar_master_rel($cmdb_mid, $topic_mid, $campo_origen, $campo_destino, $mids_para_rel{$campo_origen}, $user);
                }

                foreach my $k (keys %campos_actualizar) {
                    $stash->{$k}        = $campos_actualizar{$k};
                    $topic_actual->{$k} = $campos_actualizar{$k};
                    if (ref($stash->{topic_data}) eq 'HASH') {
                        $stash->{topic_data}->{$k} = $campos_actualizar{$k};
                    }
                }

                agregar_comentario($topic_mid, "Se actualizaron automáticamente los datos desde el CMDB vinculado (<b>$cmdb_mid</b>).");
                $hubo_touch_necesario = 1;
            }
        }
    };
}

# 2. CÁLCULO DE SLA DE EJECUCIÓN POR IMPACTO Y RIESGO
my $impacto_id = obtener_mid($topic_actual->{impacto} // $stash->{impacto} // $stash->{topic_data}->{impacto}) // '';
my $riesgo_id  = obtener_mid($topic_actual->{riesgo}  // $stash->{riesgo}  // $stash->{topic_data}->{riesgo})  // '';

my %mapa_criticidad = (
    'cla-default-BFImpactoGIT-1' => 'Alto',  'BFImpactoGIT-1' => 'Alto',  'BFRiesgo-1' => 'Alto',  'cla-default-BFRiesgo-1' => 'Alto',  'Alto'  => 'Alto',
    'cla-default-BFImpactoGIT-2' => 'Medio', 'BFImpactoGIT-2' => 'Medio', 'BFRiesgo-2' => 'Medio', 'cla-default-BFRiesgo-2' => 'Medio', 'Medio' => 'Medio',
    'cla-default-BFImpactoGIT-3' => 'Bajo',  'BFImpactoGIT-3' => 'Bajo',  'BFRiesgo-3' => 'Bajo',  'cla-default-BFRiesgo-3' => 'Bajo',  'Bajo'  => 'Bajo',
);

my $impacto_nombre = $mapa_criticidad{$impacto_id} // $stash->{'impacto._ci_name_list'} // '';
my $riesgo_nombre  = $mapa_criticidad{$riesgo_id}  // $stash->{'riesgo._ci_name_list'}  // '';

my %matriz_sla = (
    'Alto-Alto'   => '4h',  'Alto-Medio'  => '8h',  'Alto-Bajo'  => '12h',
    'Medio-Alto'  => '8h',  'Medio-Medio' => '12h', 'Medio-Bajo' => '24h',
    'Bajo-Alto'   => '12h', 'Bajo-Medio'  => '24h', 'Bajo-Bajo'  => '24h',
);

my $sla_calculado = $matriz_sla{"$impacto_nombre-$riesgo_nombre"} // '24h';
my $sla_actual    = $topic_actual->{sla_ejecucion} // '';

if ($sla_actual ne $sla_calculado) {
    $stash->{datos} ||= {};
    $stash->{datos}->{sla_ejecucion} = $sla_calculado;
    $stash->{sla_ejecucion}          = $sla_calculado;
    if (ref($stash->{topic_data}) eq 'HASH') {
        $stash->{topic_data}->{sla_ejecucion} = $sla_calculado;
    }

    mdb->topic->update({ mid => "$topic_mid" }, { '$set' => { sla_ejecucion => $sla_calculado } });
    $hubo_touch_necesario = 1;
}

if ($hubo_touch_necesario) {
    Baseliner::Model::Topic->touch("$topic_mid", 'clarive');
}
```
