---
title: "Sincronización de Solicitud GIT y Catálogo de Solicitud (Post-Created y Topic Modified)"
category: "clarive"
tags: ["clarive", "perl", "mongodb", "master_rel", "post-created", "topic-modified", "solicitud-git"]
keywords: ["solicitud git clarive", "catalogo solicitud clarive", "post created clarive", "topic modified clarive", "master_rel clarive", "anti bucle clarive"]
description: "Cómo implementar reglas Post-Created y Topic Modified con anti-bucle para sincronizar campos CI y planos entre Catálogo de Solicitud y Solicitud GIT en Clarive."
---

# Sincronización entre Solicitud GIT y Catálogo de Solicitud

En Clarive, al gestionar solicitudes basadas en un catálogo (ej. categoría **Solicitud GIT** con el campo relacionador `servicio` apuntando a **Catálogo Solicitud**), se requiere transferir campos de tipo CI y campos planos asegurando que se visualicen tanto en modo lectura como en el formulario de edición.

## Mapeo de Campos

- **Relaciones CI (requieren actualización en `mdb->topic` y `mdb->master_rel`):**
  - `equipo_resolutor`
  - `categoria`
  - `subcategoria`
  - `perfil`
  - `nivel_de_criticidad`
- **Campos Planos (requieren actualización en `mdb->topic`):**
  - `estimado_horas`
  - `sla`

---

## 1. Regla Action Post-Created

Se ejecuta automáticamente tras crearse la solicitud en base de datos:

```perl
my $topic_mid = $stash->{topic_mid} || $stash->{mid} || $stash->{topic_data}->{topic_mid} || $stash->{topic_data}->{mid};
my $user      = $stash->{username} || 'clarive';

my $catalogo_mid = obtener_mid(
    $stash->{servicio} // $stash->{topic_data}->{servicio}
);

return if (!$catalogo_mid || $catalogo_mid eq '-');

eval {
    my $cat_topic = mdb->topic->find_one({ mid => "$catalogo_mid" });
    if ($cat_topic) {
        my %mapeo_campos = (
            'equipo_resolutor'    => 'equipo_resolutor',
            'categoria'           => 'categoria',
            'subcategoria'        => 'subcategoria',
            'perfil'              => 'perfil',
            'nivel_de_criticidad' => 'nivel_de_criticidad',
            'estimado_horas'      => 'estimado_horas',
            'sla'                 => 'sla',
        );

        my %campos_ci_rel = map { $_ => 1 } qw(
            equipo_resolutor categoria subcategoria perfil nivel_de_criticidad
        );

        my %campos_actualizar;
        my %mids_para_rel;
        my $hubo_datos = 0;

        foreach my $campo_origen (keys %mapeo_campos) {
            my $campo_destino = $mapeo_campos{$campo_origen};
            my $valor_origen  = $cat_topic->{$campo_origen};

            if (defined $valor_origen && $valor_origen ne '') {
                if ($campos_ci_rel{$campo_destino}) {
                    my @valores_crudos = a_lista($valor_origen);
                    my @valores_limpios;

                    foreach my $item (@valores_crudos) {
                        my $mid_limpio = obtener_mid($item);
                        push @valores_limpios, "$mid_limpio" if defined($mid_limpio) && $mid_limpio ne '';
                    }

                    if (@valores_limpios) {
                        $campos_actualizar{$campo_destino} = ref($valor_origen) eq 'ARRAY' ? [ @valores_limpios ] : $valores_limpios[0];
                        $mids_para_rel{$campo_origen} = [ @valores_limpios ];
                        $hubo_datos = 1;
                    }
                } else {
                    $campos_actualizar{$campo_destino} = $valor_origen;
                    $hubo_datos = 1;
                }
            }
        }

        if ($hubo_datos) {
            mdb->topic->update({ mid => "$topic_mid" }, { '$set' => \%campos_actualizar });

            foreach my $campo_origen (keys %mids_para_rel) {
                my $campo_destino = $mapeo_campos{$campo_origen};
                sincronizar_master_rel($catalogo_mid, $topic_mid, $campo_origen, $campo_destino, $mids_para_rel{$campo_origen}, $user);
            }

            foreach my $k (keys %campos_actualizar) {
                $stash->{$k} = $campos_actualizar{$k};
                $stash->{topic_data}->{$k} = $campos_actualizar{$k} if ref($stash->{topic_data}) eq 'HASH';
            }

            agregar_comentario($topic_mid, "Se importó automáticamente la información del Catálogo de Solicitud (<b>$catalogo_mid</b>).");
            Baseliner::Model::Topic->touch("$topic_mid", 'clarive');
            Baseliner::Model::Topic->touch("$topic_mid", $stash->{username}) if $stash->{username};
        }
    }
};
```

---

## 2. Regla Topic Modified (con Control Anti-Bucle)

Evita bucles infinitos y reimportaciones innecesarias utilizando:
1. Salida si `$stash->{username} eq 'clarive'` sin `field_changes`.
2. Verificación de `_last_catalogo_imported` y `field_changes` para ejecutar la importación **únicamente si el usuario cambió el campo `servicio`**.
3. Limpieza en `master_rel` si el nuevo servicio no tiene asignado alguno de los CIs.
