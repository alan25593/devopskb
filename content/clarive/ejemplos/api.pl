# api — Regla WEBSERVICE unificada (reemplaza api_rule_get y api_ci_get)
# Crear SOLO en DEV (config mi-config-dev). Un único nodo "Server CODE" (statement.code.server), lang perl.
#
# Rutas (el recurso va como sub-ruta: ws_arguments):
#   GET /rule/json/api/whoami                     -> usuario, entorno y si puede escribir
#   GET /rule/json/api/rules?list=1               -> todas las reglas (id, nombre, tipo, evento, activa)
#   GET /rule/json/api/rules/<id>                 -> regla completa (meta + árbol)   &meta=1 sin árbol
#   GET /rule/json/api/rules?name=<rule_name>     -> regla por nombre
#   GET /rule/json/api/rules?tipo=event           -> reglas de un tipo
#   GET /rule/json/api/rules/<id>/versions        -> historial de versiones (rule_version)   ?v=<n> una versión
#   GET /rule/json/api/ci/clases                  -> clases de CI con cantidad
#   GET /rule/json/api/ci?clase=<Clase>           -> CIs de una clase
#   GET /rule/json/api/ci/<mid>                   -> CI completo + relaciones
#   GET /rule/json/api/users                      -> usuarios
#   GET /rule/json/api/users/<name>               -> usuario (sin secretos) + grupos + roles con ámbito
#   GET /rule/json/api/groups                     -> grupos (roles, cantidad de usuarios)
#   GET /rule/json/api/groups/<name|mid>          -> grupo + roles con ámbito + usuarios (master_rel group_user)
#   GET /rule/json/api/roles                      -> roles
#   GET /rule/json/api/roles/<id|nombre>          -> rol completo
#   GET /rule/json/api/meta/collections           -> colecciones de MongoDB (para ubicar versiones de reglas)
#   GET /rule/json/api/find/<coleccion>?q=<json>&fields=a,b&sort=-campo&limit=N
#                                                 -> búsqueda genérica de solo lectura (colecciones permitidas en %FIND_OK)
#   GET /rule/json/api/find/<coleccion>?distinct=<campo>&q=<json>
#                                                 -> valores distintos de un campo con cantidad
# Comunes: &limit=N (default 500, máx 5000)  &utf8=1 (fix de acentos)
#
#   GET /rule/json/api/rules/<id>?b64=1           -> además rule_tree_b64: el string crudo de rule_tree en base64 (UTF-8),
#                                                    para editar sin pasar por el serializador (acentos intactos)
#   GET /rule/json/api/category/<id>              -> categoría (estados, campos, workflow, form)
#
# Escritura (SOLO DEV: config mi-config-dev + usuario en @WRITERS + POST). Sin confirm=1 es simulacro (dry run):
#   POST /rule/json/api/rules/<id>/save        tree_b64=<base64 de JSON UTF-8 del árbol>  base_version=<version_id leída>
#        -> copia la versión actual a rule_version (igual que el Rule Designer), guarda rule_tree, version_id+1, ts, autor.
#           Si base_version no coincide con la actual (alguien guardó en el medio) no escribe.
#   POST /rule/json/api/category/<id>/add_status     status=<id de estado>   (remove_status igual)
#   POST /rule/json/api/ci/new?clase=<Clase>       fields_b64=<base64 de JSON {name, ...}>  -> crea un CI (no duplica por nombre)
#   POST /rule/json/api/ci/<mid>/set                  fields_b64=<base64 de JSON {campo: valor}>  -> solo created_by, modified_by, description (master_doc)
#   TST y PROD (config mi-config-prod) quedan siempre en solo lectura, aunque la regla se migre.

use Encode ();
use JSON::XS ();
use MIME::Base64 ();
use Time::HiRes ();

my @WRITERS  = qw(mi_usuario);
my $DEV_CONF = 'mi-config-dev';

my $p      = $stash->{ws_params} // {};
my @args   = grep { defined && length } @{ ref $stash->{ws_arguments} eq 'ARRAY' ? $stash->{ws_arguments} : [] };
my $res    = shift(@args) // $p->{recurso} // '';
my $key    = shift(@args) // $p->{id} // $p->{mid} // $p->{name};
my $sub    = shift(@args) // '';
my $method = uc( $stash->{ws_method} // 'GET' );
my $user   = $stash->{username} // '';
my $conf   = $ENV{CLARIVE_CONFIG} // $ENV{BASELINER_CONFIG_LOCAL_SUFFIX} // '';
my $limit  = ( $p->{limit} && $p->{limit} =~ /^\d+$/ ) ? ( $p->{limit} > 5000 ? 5000 : $p->{limit} ) : 500;
my $SENS   = qr/pass|api_?key|token|secret|salt|hash|credential/i;
# Colecciones legibles por /find (nunca session, personal_access_token, user_login_attempts, temp_users, config)
my %FIND_OK = map { $_ => 1 } qw(topic category master_doc master_rel event event_log job_log notification message
    label scheduler effort calendar calendar_window dashboard activity rule_status rule_version rule_keeper tag);

sub _can_write_base {
    return ( $conf eq $DEV_CONF && ( grep { $_ eq $user } @WRITERS ) && $method eq 'POST' ) ? 1 : 0;
}
sub _can_write {
    return ( _can_write_base() && $p->{confirm} ) ? 1 : 0;
}
sub _deny_write {
    return { error => "Escritura denegada: solo DEV (config $DEV_CONF), usuarios autorizados y POST. Config=$conf usuario=$user método=$method" };
}
sub _ts {
    my ( $s, $us ) = Time::HiRes::gettimeofday();
    my @t = localtime($s);
    return sprintf( '%04d-%02d-%02d %02d:%02d:%02d.%05d', $t[5] + 1900, $t[4] + 1, $t[3], $t[2], $t[1], $t[0], int( $us / 10 ) );
}
sub _b64_json {
    my ($b64) = @_;
    my $bytes = MIME::Base64::decode_base64( $b64 // '' );
    return eval { JSON::XS->new->utf8(1)->decode($bytes) };
}
sub _str_b64 {
    my ($s) = @_;
    return '' unless defined $s;
    return MIME::Base64::encode_base64( utf8::is_utf8($s) ? Encode::encode( 'UTF-8', $s ) : $s, '' );
}
sub _count_nodes {
    my ($n) = @_;
    return 0 unless ref $n;
    return 0 + eval { my $c = 0; $c += _count_nodes($_) for @$n; $c } if ref $n eq 'ARRAY';
    return 1 + _count_nodes( $n->{children} ) if ref $n eq 'HASH';
    return 0;
}
sub _clean {
    my ($x) = @_;
    return { map { $_ => _clean( $x->{$_} ) } grep { $_ ne '_id' && $_ !~ $SENS } keys %$x } if ref $x eq 'HASH';
    return [ map { _clean($_) } @$x ] if ref $x eq 'ARRAY';
    return ref $x ? "$x" : $x;
}
sub _enc_deep {
    my ($x) = @_;
    return [ map { _enc_deep($_) } @$x ] if ref $x eq 'ARRAY';
    return { map { $_ => _enc_deep( $x->{$_} ) } keys %$x } if ref $x eq 'HASH';
    return ( defined $x && !ref $x && utf8::is_utf8($x) ) ? Encode::encode( 'UTF-8', $x ) : $x;
}
sub _rels {
    my ($mid) = @_;
    return {
        from => [ mdb->master_rel->find( { from_mid => "$mid" } )->fields( { _id => 0, to_mid => 1, rel_type => 1, rel_field => 1 } )->limit(1000)->all ],
        to   => [ mdb->master_rel->find( { to_mid   => "$mid" } )->fields( { _id => 0, from_mid => 1, rel_type => 1, rel_field => 1 } )->limit(1000)->all ],
    };
}
# project_security [{id_role, mid, type}] -> [{rol, id_role, ambito, ambito_mid, ambito_tipo}]
sub _security {
    my ($ps) = @_;
    my @ps = ref $ps eq 'ARRAY' ? @$ps : ();
    return [] unless @ps;
    my %seen;
    @ps = grep { !$seen{ ( $_->{id_role} // '' ) . '|' . ( $_->{mid} // '' ) }++ } @ps;
    my @rids = keys %{ { map { ( $_->{id_role} // '' ) => 1 } @ps } };
    # ojo: 0+$_ sobre un alias deja el string como dualvar y el driver lo manda como int.
    # Se arman copias separadas: strings puros + enteros puros.
    my @rin = map { my $s = "$_"; $s } @rids;
    push @rin, map { my $n = "$_"; $n =~ /^\d+$/ ? int($n) : () } @rids;
    my %rol;
    for my $r ( mdb->role->find( { id => { '$in' => \@rin } } )->fields( { _id => 0, id => 1, role => 1 } )->all ) {
        $rol{ "$r->{id}" } = $r->{role};
    }
    my @mids = keys %{ { map { ( $_->{mid} // '' ) => 1 } @ps } };
    my %amb  = map { $_->{mid} => $_ } mdb->master_doc->find( { mid => { '$in' => \@mids } } )->fields( { _id => 0, mid => 1, name => 1, collection => 1 } )->all;
    return [ sort { ( $a->{rol} // '' ) cmp( $b->{rol} // '' ) } map { {
        rol => $rol{ $_->{id_role} } // "?($_->{id_role})", id_role => $_->{id_role},
        ambito => ( $amb{ $_->{mid} // '' } // {} )->{name} // $_->{mid}, ambito_mid => $_->{mid},
        ambito_tipo => ( $amb{ $_->{mid} // '' } // {} )->{collection} // $_->{type},
    } } @ps ];
}
sub _names {
    my (@mids) = @_;
    return [] unless @mids;
    return [ sort { ( $a->{name} // '' ) cmp( $b->{name} // '' ) }
        mdb->master_doc->find( { mid => { '$in' => [ map {"$_"} @mids ] } } )->fields( { _id => 0, mid => 1, name => 1, realname => 1, collection => 1 } )->all ];
}
sub _rule_doc {
    my ( $id, $name ) = @_;
    my $d;
    if ( defined $id && length $id ) {
        $d = mdb->rule->find_one( { id => "$id" } );
        $d //= mdb->rule->find_one( { id => 0 + $id } ) if $id =~ /^\d+$/;
    }
    $d //= mdb->rule->find_one( { rule_name => "$name" } ) if defined $name && length $name;
    return $d;
}

my $r = eval {
    # ---------- whoami ----------
    if ( $res eq 'whoami' ) {
        return { usuario => $user, config => $conf, es_dev => ( $conf eq $DEV_CONF ? \1 : \0 ),
                 puede_escribir => ( ( $conf eq $DEV_CONF && grep { $_ eq $user } @WRITERS ) ? \1 : \0 ), metodo => $method };
    }
    # ---------- rules ----------
    if ( $res eq 'rules' ) {
        if ( !$key && !$p->{name} ) {
            my @l = mdb->rule->find( {} )->fields( { _id => 0, id => 1, rule_name => 1, rule_type => 1, rule_event => 1, rule_when => 1, rule_active => 1, version_id => 1, ts => 1, modified_by => 1, username => 1 } )->all;
            @l = grep { ( $_->{rule_type} // '' ) eq $p->{tipo} } @l if $p->{tipo};
            return { total => scalar(@l), rules => [ sort { ( $a->{rule_name} // '' ) cmp( $b->{rule_name} // '' ) } @l ] };
        }
        my $d = _rule_doc( $key, $p->{name} ) or return { error => 'Regla no encontrada' };
        if ( $sub eq 'save' ) {
            return _deny_write() unless _can_write_base();
            return { error => "base_version ($p->{base_version}) distinta de la actual ($d->{version_id}): alguien guardó en el medio, volvé a leer la regla" }
                unless defined $p->{base_version} && "$p->{base_version}" eq ( $d->{version_id} // '' ) . '';
            my $tree = _b64_json( $p->{tree_b64} );
            return { error => "tree_b64 inválido (tiene que ser base64 de un array JSON UTF-8): $@" } unless ref $tree eq 'ARRAY';
            my $new_str  = JSON::XS->new->utf8(0)->encode($tree);
            my $old_tree = eval { JSON::XS->new->utf8(0)->decode( $d->{rule_tree} // '[]' ) } // [];
            my %prev = ( regla => $d->{rule_name}, id => $d->{id}, tipo => $d->{rule_type}, version_actual => $d->{version_id},
                         nodos_antes => _count_nodes($old_tree), nodos_despues => _count_nodes($tree),
                         largo_antes => length( $d->{rule_tree} // '' ), largo_despues => length($new_str),
                         igual => ( ( $d->{rule_tree} // '' ) eq $new_str ? \1 : \0 ) );
            return { %prev, simulacro => \1 } unless $p->{confirm};
            my $now = _ts();
            my %ver = %$d;
            delete $ver{_id};
            @ver{qw(id_rule version_on version_by was _uid)} = ( "$d->{id}", $now, $user, '', '' );
            eval { mdb->rule_version->insert( \%ver ); 1 } or eval { mdb->rule_version->insert_one( \%ver ); 1 }
                or return { error => "No se pudo respaldar en rule_version, no se guardó nada: $@" };
            my $nv  = ( $d->{version_id} // 0 ) + 1;
            my $set = { '$set' => { rule_tree => $new_str, version_id => $nv, ts => $now, modified_by => $user, username => $user } };
            eval { mdb->rule->update( { id => $d->{id} }, $set ); 1 } or eval { mdb->rule->update_one( { id => $d->{id} }, $set ); 1 }
                or return { error => "Respaldo hecho pero falló el guardado: $@" };
            my $chk = _rule_doc( $d->{id} );
            return { %prev, guardado => \1, version_nueva => $nv, verificado => ( ( $chk->{rule_tree} // '' ) eq $new_str ? \1 : \0 ),
                     respaldo => "rule_version id_rule=$d->{id} version_id=$d->{version_id}" };
        }
        if ( $sub eq 'versions' ) {
            # /rules/<id>/versions            -> últimas N versiones (sin árbol) + campos de rule_version
            # /rules/<id>/versions?v=<n>      -> una versión con su árbol
            my @q = ( { id_rule => "$d->{id}" }, { rule_id => "$d->{id}" }, { id => "$d->{id}" } );
            my $n = $p->{limit} && $p->{limit} =~ /^\d+$/ ? $p->{limit} : 10;
            my @v;
            for my $q (@q) { @v = mdb->rule_version->find($q)->sort( { ts => -1 } )->limit( $p->{v} ? 500 : $n )->all; last if @v; }
            return { error => 'Sin versiones en rule_version (probadas claves id_rule, rule_id, id)', ejemplo => _clean( mdb->rule_version->find_one( {} ) // {} ) } unless @v;
            my @campos = sort keys %{ $v[0] };
            if ( $p->{v} ) {
                my ($one) = grep { ( $_->{version_id} // $_->{version} // '' ) eq $p->{v} } @v;
                return { error => "Versión $p->{v} no encontrada" } unless $one;
                return { version => _clean($one), campos => \@campos };
            }
            return { regla => $d->{rule_name}, version_actual => $d->{version_id}, campos => \@campos,
                     versiones => [ map { my $x = _clean($_); delete $x->{rule_tree}; $x } @v ] };
        }
        delete $d->{_id};
        my $tree = $d->{rule_tree};
        if ( defined $tree && !ref $tree ) { my $t = eval { JSON::XS->new->utf8(0)->decode($tree) }; $tree = $t if $t; }
        my %meta = map { $_ => $d->{$_} } grep { $_ ne 'rule_tree' && !ref $d->{$_} } keys %$d;
        return { meta => \%meta, campos => [ sort keys %$d ], ( $p->{meta} ? () : ( rule_tree => $tree ) ),
                 ( $p->{b64} ? ( rule_tree_b64 => _str_b64( $d->{rule_tree} ) ) : () ) };
    }
    # ---------- ci ----------
    if ( $res eq 'ci' ) {
        if ( defined $key && $key eq 'clases' ) {
            my @c = mdb->master_doc->aggregate( [ { '$group' => { _id => '$collection', n => { '$sum' => 1 } } }, { '$sort' => { _id => 1 } } ] )->all;
            return { clases => [ map { { clase => $_->{_id}, cantidad => $_->{n} } } @c ] };
        }
        if ( defined $key && $key eq 'new' ) {
            return _deny_write() unless _can_write_base();
            my $clase = $p->{clase} // '';
            return { error => 'clase inválida' } unless $clase =~ /^\w+$/;
            my $f = _b64_json( $p->{fields_b64} );
            return { error => 'fields_b64 inválido o sin name' } unless ref $f eq 'HASH' && length( $f->{name} // '' );
            my $dup = mdb->master_doc->find_one( { collection => $clase, name => $f->{name} } );
            return { error => "Ya existe $clase con ese nombre", mid => $dup->{mid}, existe => \1 } if $dup;
            return { clase => $clase, campos => $f, simulacro => \1 } unless $p->{confirm};
            my $pkg = "BaselinerX::CI::$clase";
            my $obj = eval { $pkg->new( %$f, created_by => $user, modified_by => $user ) } or return { error => "No se pudo crear $pkg: $@" };
            my $mid = eval { $obj->save };
            return { error => "Falló save: $@" } if $@;
            $mid = eval { $obj->mid } if !$mid || ref $mid;
            # auditoría (por si la clase no la toma del constructor) e id_status de los estados
            my %fix = ( created_by => $user, modified_by => $user );
            $fix{id_status} = "$mid" if $clase eq 'status';
            eval { mdb->master_doc->update( { mid => "$mid" }, { '$set' => \%fix } ); 1 }
                or eval { mdb->master_doc->update_one( { mid => "$mid" }, { '$set' => \%fix } ); 1 };
            return { creado => \1, mid => "$mid", doc => _clean( mdb->master_doc->find_one( { mid => "$mid" } ) // {} ) };
        }
        if ( defined $key && length $key && $sub eq 'set' ) {
            # Solo campos sin lógica asociada. ci() no existe en reglas webservice, así que se escribe en master_doc.
            my %SET_OK = map { $_ => 1 } qw(created_by modified_by description);
            return _deny_write() unless _can_write_base();
            my $f = _b64_json( $p->{fields_b64} );
            return { error => 'fields_b64 inválido (base64 de un objeto JSON UTF-8)' } unless ref $f eq 'HASH' && %$f;
            my @malos = grep { !$SET_OK{$_} } keys %$f;
            return { error => "Campos no permitidos: @malos (permitidos: " . join( ', ', sort keys %SET_OK ) . ')' } if @malos;
            my $before = mdb->master_doc->find_one( { mid => "$key" } ) or return { error => "CI $key no encontrado" };
            my %antes = map { $_ => $before->{$_} } keys %$f;
            return { mid => $key, antes => _clean( \%antes ), despues => $f, simulacro => \1 } unless $p->{confirm};
            my $upd = { '$set' => { %$f, ( exists $f->{modified_by} ? () : ( modified_by => $user ) ) } };
            eval { mdb->master_doc->update( { mid => "$key" }, $upd ); 1 } or eval { mdb->master_doc->update_one( { mid => "$key" }, $upd ); 1 }
                or return { error => "Falló la actualización: $@" };
            my $after = mdb->master_doc->find_one( { mid => "$key" } );
            return { mid => $key, antes => _clean( \%antes ), despues => _clean( { map { $_ => $after->{$_} } keys %$f } ), guardado => \1 };
        }
        if ( defined $key && length $key ) {
            my $d = mdb->master_doc->find_one( { mid => "$key" } ) or return { error => "CI $key no encontrado" };
            return { ci => _clean($d), relaciones => _rels($key) };
        }
        return { error => 'Falta clase o mid' } unless $p->{clase};
        my @l = mdb->master_doc->find( { collection => "$p->{clase}" } )->fields( { _id => 0, mid => 1, name => 1, moniker => 1, active => 1 } )->limit($limit)->all;
        return { clase => $p->{clase}, total => scalar(@l), cis => \@l };
    }
    # ---------- users ----------
    if ( $res eq 'users' ) {
        if ( !$key ) {
            my @l = mdb->master_doc->find( { collection => 'user' } )->fields( { _id => 0, mid => 1, name => 1, realname => 1, email => 1, active => 1 } )->limit($limit)->all;
            return { total => scalar(@l), usuarios => [ sort { ( $a->{name} // '' ) cmp( $b->{name} // '' ) } @l ] };
        }
        my $d = mdb->master_doc->find_one( { collection => 'user', '$or' => [ { name => "$key" }, { username => "$key" }, { mid => "$key" } ] } )
            or return { error => "Usuario $key no encontrado" };
        my $sec = $d->{project_security};
        my $u = _clean($d);
        delete @{$u}{qw(project_security dashboards workspaces tour)};
        return { usuario => $u, grupos => _names( @{ ref $d->{groups} eq 'ARRAY' ? $d->{groups} : [] } ), roles => _security($sec) };
    }
    # ---------- groups ----------
    if ( $res eq 'groups' ) {
        if ( !$key ) {
            my %n = map { $_->{_id} => $_->{n} } mdb->master_rel->aggregate( [ { '$match' => { rel_type => 'group_user' } }, { '$group' => { _id => '$from_mid', n => { '$sum' => 1 } } } ] )->all;
            my @l = mdb->master_doc->find( { collection => 'UserGroup' } )->fields( { _id => 0, mid => 1, name => 1, active => 1, project_security => 1 } )->limit($limit)->all;
            return { total => scalar(@l), grupos => [ sort { ( $a->{name} // '' ) cmp( $b->{name} // '' ) } map { {
                mid => $_->{mid}, name => $_->{name}, active => $_->{active},
                roles => ( ref $_->{project_security} eq 'ARRAY' ? scalar @{ $_->{project_security} } : 0 ), usuarios => $n{ $_->{mid} } // 0 } } @l ] };
        }
        my $d = mdb->master_doc->find_one( { collection => 'UserGroup', '$or' => [ { name => "$key" }, { mid => "$key" } ] } )
            or return { error => "Grupo $key no encontrado" };
        my @umids = map { $_->{to_mid} } mdb->master_rel->find( { from_mid => $d->{mid}, rel_type => 'group_user' } )->fields( { _id => 0, to_mid => 1 } )->all;
        my $g = _clean($d);
        delete $g->{project_security};
        return { grupo => $g, roles => _security( $d->{project_security} ), usuarios => _names(@umids) };
    }
    # ---------- roles ----------
    if ( $res eq 'roles' ) {
        if ( !$key ) {
            my @l = mdb->role->find( {} )->fields( { _id => 0, id => 1, role => 1, description => 1 } )->limit($limit)->all;
            return { total => scalar(@l), roles => [ sort { ( $a->{role} // '' ) cmp( $b->{role} // '' ) } @l ] };
        }
        my $d = mdb->role->find_one( { id => "$key" } );
        $d //= mdb->role->find_one( { id => 0 + $key } ) if $key =~ /^\d+$/;
        $d //= mdb->role->find_one( { role => "$key" } );
        return $d ? { rol => _clean($d), campos => [ sort keys %$d ] } : { error => "Rol $key no encontrado" };
    }
    # ---------- meta ----------
    if ( $res eq 'meta' && ( $key // '' ) eq 'collections' ) {
        my @c = eval { mdb->db->collection_names };
        @c = eval { map { $_->{name} } mdb->db->list_collections->all } unless @c;
        return { error => "No se pudo listar colecciones: $@" } unless @c;
        return { total => scalar(@c), collections => [ sort @c ] };
    }
    # ---------- category ----------
    if ( $res eq 'category' ) {
        my $c = mdb->category->find_one( { id => "$key" } ) or return { error => "Categoría $key no encontrada" };
        if ( $sub eq 'add_status' || $sub eq 'remove_status' ) {
            return _deny_write() unless _can_write_base();
            my $st = $p->{status} // '';
            return { error => 'Falta status' } unless length $st;
            mdb->master_doc->find_one( { mid => "$st", collection => 'status' } ) or return { error => "El estado $st no existe" };
            my @antes = @{ ref $c->{statuses} eq 'ARRAY' ? $c->{statuses} : [] };
            my @desp  = $sub eq 'add_status' ? ( ( grep { $_ eq $st } @antes ) ? @antes : ( @antes, $st ) ) : grep { $_ ne $st } @antes;
            return { categoria => $c->{name}, antes => \@antes, despues => \@desp, simulacro => \1 } unless $p->{confirm};
            my $upd = { '$set' => { statuses => \@desp } };
            eval { mdb->category->update( { id => "$key" }, $upd ); 1 } or eval { mdb->category->update_one( { id => "$key" }, $upd ); 1 }
                or return { error => "Falló la actualización: $@" };
            return { categoria => $c->{name}, antes => \@antes, despues => mdb->category->find_one( { id => "$key" } )->{statuses}, guardado => \1 };
        }
        return { categoria => _clean($c) };
    }
    # ---------- find (lectura genérica) ----------
    if ( $res eq 'find' ) {
        my $c = $key // '';
        return { error => "Colección '$c' no permitida", permitidas => [ sort keys %FIND_OK ] } unless $FIND_OK{$c};
        my $q = {};
        if ( length( $p->{q} // '' ) ) {
            $q = eval { JSON::XS->new->utf8(0)->decode( $p->{q} ) };
            return { error => "q no es un JSON objeto válido: $@" } unless ref $q eq 'HASH';
        }
        my $coll = mdb->$c;
        if ( $p->{distinct} ) {
            return { error => 'distinct inválido' } unless $p->{distinct} =~ /^[\w.]+$/;
            my @d = $coll->aggregate( [ { '$match' => $q }, { '$group' => { _id => '$' . $p->{distinct}, n => { '$sum' => 1 } } },
                                        { '$sort' => { n => -1 } }, { '$limit' => $limit } ] )->all;
            return { coleccion => $c, campo => $p->{distinct}, total => scalar(@d), valores => [ map { { valor => _clean( $_->{_id} ), n => $_->{n} } } @d ] };
        }
        my $f = { _id => 0 };
        if ( $p->{fields} ) { $f->{$_} = 1 for grep { /^[\w.]+$/ } split /\s*,\s*/, $p->{fields}; }
        my $cur = $coll->find($q)->fields($f);
        $cur = $cur->sort( { $2 => ( $1 ? -1 : 1 ) } ) if ( $p->{sort} // '' ) =~ /^(-?)([\w.]+)$/;
        my @l = $cur->limit($limit)->all;
        my $total = eval { $coll->count($q) };
        return { coleccion => $c, total => $total, devueltos => scalar(@l), docs => _clean( \@l ) };
    }
    return { error => 'Recurso inválido', recursos => [qw(whoami rules ci users groups roles meta/collections find category)] };
};
$r = { error => "Excepción: $@" } if !$r && $@;

$r->{success} = $r->{error} ? \0 : \1;
_log "api: $method /$res/" . ( $key // '' ) . " user=$user conf=$conf ok=" . ( $r->{error} ? 0 : 1 );
$stash->{ws_response} = $p->{utf8} ? _enc_deep($r) : $r;
