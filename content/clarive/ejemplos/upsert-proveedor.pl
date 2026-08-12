sub agregar_comentario {
    my ($mid, $texto) = @_;
    eval {
        my $topic = ci->topic->load($mid);
        
        if ($topic) {
            $topic->{comment} = $texto;
            if (ref($topic) eq 'HASH') {
                bless $topic, 'BaselinerX::CI::topic';
            }
            
            if ($topic->can('save')) {
                $topic->save();
            } else {
                # Fallback por si acaso: actualizamos directo en master_doc con el campo comment
                mdb->collection('master_doc')->update_one(
                    { mid => $mid },
                    { '$set' => { comment => $texto } }
                );
            }
        }
    };
    if ($@) {
        print "Error al registrar el comentario por API: $@\n";
    }
}

# --- SCRIPT PRINCIPAL ---
my $cod_proveedor = $stash->{topic_data}->{codigo_proveedor_tango};
my $num_doc       = $stash->{topic_data}->{cuil};
my $correo_nuevo  = $stash->{topic_data}->{contacto_comercial_1};
my $name_nuevo    = $stash->{topic_data}->{nombre_comercial};
my $moniker_nuevo = $stash->{topic_data}->{razon_social};
my $topic_mid     = $stash->{topic_mid} || $stash->{mid} || $stash->{topic_data}->{topic_mid} || $stash->{topic_data}->{mid};

# 1. Buscamos a ver si existe
my $doc = mdb->collection('master_doc')->find_one({
    collection    => 'BFProveedorCOM',
    cod_proveedor => $cod_proveedor,
    num_doc       => $num_doc
});

if ($doc) {
    # 2. Si existe, metemos update con nombre y moniker
    mdb->collection('master_doc')->update_one(
        { _id => $doc->{_id} },
        { 
            '$set' => { 
                correo  => $correo_nuevo, 
                name    => $name_nuevo,
                moniker => $moniker_nuevo,
                active  => 1 
            } 
        }
    );
    print "¡Update exitoso! Actualizado el mid: " . $doc->{mid} . "\n";
    
    agregar_comentario($topic_mid, "Se actualizó el proveedor (Código: $cod_proveedor). Nombre: $name_nuevo - Razón Social: $moniker_nuevo - Correo: $correo_nuevo");
    
} else {
    # 3. Si NO existe, instanciamos y seteamos UNO x UNO
    eval {
        my $nuevo = ci->BFProveedorCOM->new();
        
        $nuevo->{cod_proveedor} = $cod_proveedor;
        $nuevo->{num_doc}       = $num_doc;
        $nuevo->{correo}        = $correo_nuevo;
        $nuevo->{name}          = $name_nuevo;
        $nuevo->{moniker}       = $moniker_nuevo;
        $nuevo->{tipo_doc}      = 'BFTipoDocCOM-3';
        $nuevo->{active}        = 1;
        
        $nuevo->save();
        print "¡Creado de cero y con datos! Nuevo mid generado.\n";
        
        agregar_comentario($topic_mid, "Se creó el proveedor desde cero (Código: $cod_proveedor). Nombre: $name_nuevo - Razón Social: $moniker_nuevo - Correo: $correo_nuevo");
    };
    if ($@) {
        print "Falló al crear por API: $@\n";
        
        agregar_comentario($topic_mid, "Error: Notificar a equipo arquitectura - $name_nuevo (Código: $cod_proveedor)");
    }
}

Baseliner::Model::Topic->touch( $stash->{topic_mid}, 'clarive' );
Baseliner::Model::Topic->touch( $stash->{topic_mid}, $stash->{username} );
