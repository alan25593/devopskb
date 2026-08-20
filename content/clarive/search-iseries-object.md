---
title: "Buscar objeto iSeries por nombre"
category: "clarive"
tags: ["iseries", "perl", "script", "clarive", "search"]
keywords: "buscar objeto iseries por nombre, encontrar psip300, iseries perl clarive, recuperar libreria iseries, script perl iseries object"
description: "Script de Perl para buscar un objeto iSeries por nombre en Clarive y obtener información de su librería y baseline."
---

# Buscar objeto iSeries por nombre

Este script en Perl permite buscar un objeto iSeries por su nombre (ej. `PSIP300`) y recuperar información sobre su librería, entorno y baseline (BL).

```perl
my @objetos = ci->iseries_object->find({ name => 'PSIP300' })->all;

foreach my $obj (@objetos) {
    my $lib_id = $obj->{library};
    my $entorno = 'N/A';
    if ($lib_id) {
        my $lib_obj = ci->iseries_library->find_one({ mid => $lib_id });
        
        if ($lib_obj && $lib_obj->{environments}) {
            my $env = $lib_obj->{environments};
            $entorno = ref $env eq 'ARRAY' ? join(', ', @$env) : $env;
        }
    }

    print "ID: " . $obj->{mid} . " | Lib: $lib_id | Entorno(Lib): $entorno | BL: " . ($obj->{bl} || '-') . "\n";
}
```
