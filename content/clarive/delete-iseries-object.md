---
title: "Borrar objeto iSeries (duplicado)"
category: "clarive"
tags: ["iseries", "perl", "script", "clarive", "delete"]
keywords: "borrar objeto iseries, eliminar duplicado iseries clarive, ci new delete iseries, instanciar y borrar objeto iseries"
description: "Script de Perl para instanciar y borrar un objeto iSeries específico por ID (útil para limpiar duplicados)."
---

# Borrar objeto iSeries (duplicado)

Este script en Perl permite instanciar un objeto iSeries (específicamente en el contexto de Clarive, usando `ci->new()`) a partir de su ID y luego eliminarlo. Útil para limpiar objetos duplicados.

```perl
# Definimos cuál vamos a fletar
my $id_a_volar = 'iseries_object-590083';

# Acá está la magia: usamos ->new() para instanciarlo como objeto posta
my $obj_duplicado = ci->new($id_a_volar);

if ($obj_duplicado) {
    # Ahora sí tiene el método
    $obj_duplicado->delete(); 
    print "¡Adiós duplicado! El objeto $id_a_volar fue borrado.\n";
} else {
    print "Che, no se pudo instanciar el objeto.\n";
}
```
