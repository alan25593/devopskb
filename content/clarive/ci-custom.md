---
title: "Creación de CIs Custom"
category: "clarive"
tags: ["clarive", "ci", "perl"]
keywords: ["custom ci clarive", "crear ci clarive", "instanciar ci", "actualizar ci perl"]
description: "Paso a paso para crear Configuration Items custom, instanciarlos y persistirlos utilizando la API de Perl."
---

# Creación de CIs custom

Los CIs custom de Clarive pueden implementarse como módulos Perl dentro del backend.

Una ubicación utilizada para este tipo de módulos es:

```text
/opt/clarive/features/bancoformosa/lib/BaselinerX/CI/
```

Por ejemplo:

```text
BFAlanTEST.pm
```

## Estructura básica

El nombre del `package` debe coincidir con la clase definida por el archivo.

```perl
package BaselinerX::CI::BFAlanTEST;

use Baseliner::Moose;
use Baseliner::Sugar;

has mi_campo_prueba => qw(is rw isa Str);
has otro_campo      => qw(is rw isa Int);

with 'Baseliner::Role::CI::BFormosa';

sub icon { '/BFormosa/logo.png' }

sub has_bl { 0 }
```

## Campos

Los atributos del CI se definen mediante `has`.

Campo string:
```perl
has nombre => qw(is rw isa Str);
```

Campo numérico:
```perl
has cantidad => qw(is rw isa Int);
```

La definición concreta de los tipos y roles disponibles debe verificarse contra la versión de Clarive instalada.

## Registrar el CI

Guardar el módulo en:

```text
/opt/clarive/features/bancoformosa/lib/BaselinerX/CI/BFAlanTEST.pm
```

Luego se debe reiniciar el servidor web de Clarive para que el módulo Perl sea cargado en memoria:

```bash
cla web-stop
cla web-start --daemon -d
```

## Utilización desde JavaScript

Una vez cargada la clase, puede consultarse desde código JavaScript mediante:

```javascript
ci.getClass('BFAlanTEST')
```

Esto permite trabajar con el nuevo tipo de CI desde las funcionalidades que utilicen la API correspondiente.

## Ejemplo de CI con relaciones: BFCelula

1. Buscar si el archivo ya existe:
   ```bash
   find . -name BFCelula.pm
   ```
2. Posicionarse en el directorio base de CIs:
   ```bash
   cd ./features/bancoformosa/lib/BaselinerX/CI/
   ```
3. Editar o crear el archivo (`nano BFCelula.pm`) y utilizar este código base:

```perl
package BaselinerX::CI::BFCelula;
use Baseliner::Moose;
use Baseliner::Sugar;

has acronym => qw(is rw isa Str);
has_ci 'responsable';

sub rel_type {
    {
        responsable      => [from_mid    => 'bfcelula_responsable']
    },
}
with 'Baseliner::Role::CI::BFormosa';
with 'Baseliner::Role::CI::BFEquipo';

sub icon { '/static/images/icons/users.svg' }

sub has_bl { 0 }
```

4. Reiniciar el servidor web de Clarive como se explicó en la sección de registro.

> **Pendiente**: Documentar el uso de archivos JSON para filtrar recursos de este u otros CIs directamente en los formularios.

## Instanciar, actualizar y crear CIs desde Perl

Para manipular CIs y Tópicos directamente desde el código Perl, podés combinar los métodos provistos por la clase (API) con accesos directos a MongoDB como *fallback* para operaciones más rápidas y seguras.

Ver el script de ejemplo completo en `ejemplos/upsert-proveedor.pl`. A continuación, los conceptos clave desglosados:

### 1. Búsqueda segura (`find_one`)
Antes de instanciar o modificar, es buena práctica buscar el documento en `master_doc` usando identificadores únicos para decidir si hacer *insert* o *update*:

```perl
my $doc = mdb->collection('master_doc')->find_one({
    collection    => 'BFProveedorCOM',
    cod_proveedor => $cod_proveedor,
    num_doc       => $num_doc
});
```

### 2. Actualización directa por BD (Fallback rápido)
Si el CI ya existe, podés actualizarlo rápidamente directo por base de datos mediante `update_one`. Esto suele ser más robusto si solo querés cambiar datos planos sin disparar validaciones complejas de la clase:

```perl
if ($doc) {
    mdb->collection('master_doc')->update_one(
        { _id => $doc->{_id} },
        { 
            '$set' => { 
                correo  => $stash->{topic_data}->{contacto_comercial_1},
                active  => 1 
            } 
        }
    );
}
```

### 3. Creación limpia vía API (`new` y `save`)
Si el CI no existe, la forma correcta de crearlo es instanciarlo usando el método `new()` provisto por el componente `ci`, asignar las propiedades una por una y persistir con `save()` (esto genera el `mid` automáticamente):

```perl
eval {
    my $nuevo = ci->BFProveedorCOM->new();
    
    $nuevo->{cod_proveedor} = $cod_proveedor;
    $nuevo->{correo}        = $stash->{topic_data}->{contacto_comercial_1};
    $nuevo->{active}        = 1;
    
    $nuevo->save(); # Persiste en DB y genera el mid
};
if ($@) {
    print "Falló al crear por API: $@\n";
}
```

### 4. Patrón robusto para Comentarios
Para dejar asentado un log en el hilo de comentarios de un tópico, podés cargarlo en memoria, re-bendecirlo (*bless*) si es necesario, e intentar guardarlo por API. Como red de seguridad, se puede usar un *fallback* a la colección.

```perl
sub agregar_comentario {
    my ($mid, $texto) = @_;
    eval {
        my $topic = ci->topic->load($mid);
        if ($topic) {
            $topic->{comment} = $texto;
            # Forzamos el bless por si devuelve un HASH crudo
            bless $topic, 'BaselinerX::CI::topic' if ref($topic) eq 'HASH';
            
            if ($topic->can('save')) {
                $topic->save();
            } else {
                # Fallback de seguridad
                mdb->collection('master_doc')->update_one(
                    { mid => $mid },
                    { '$set' => { comment => $texto } }
                );
            }
        }
    };
}
```

### 5. Forzar recálculos (Touch)
Luego de hacer manipulaciones pesadas sobre los datos del tópico por debajo, siempre es conveniente ejecutar un *touch* para que Clarive se entere, refresque la interfaz y dispare eventos pendientes:

```perl
Baseliner::Model::Topic->touch( $stash->{topic_mid}, 'clarive' );
```
