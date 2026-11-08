# api_ci_get — Regla WEBSERVICE de SOLO LECTURA (crear solo en DEV)
# Un único nodo "Server CODE" (statement.code.server), lang perl.
# Lee CIs, usuarios, grupos y roles. Nunca devuelve campos sensibles (password, api_key, tokens, secretos).
#
# Uso (siempre por /rule/json/api_ci_get?api_key=...&...):
#   tipo=clases                         -> clases de CI existentes (collection) con cantidad
#   tipo=ci&clase=BFProveedorCOM        -> lista CIs de una clase (mid, name, moniker, active)
#   tipo=ci&mid=1234                    -> un CI completo + relaciones (master_rel from/to)
#   tipo=usuarios                       -> usuarios (mid, name, realname, email, active)
#   tipo=usuario&name=mi_usuario          -> un usuario completo (sin secretos) + grupos a los que pertenece
#   tipo=grupos                         -> grupos (UserGroup) con roles y cantidad de usuarios
#   tipo=grupo&name=<nombre>            -> un grupo completo + usuarios
#   tipo=roles                          -> roles (id, role, description)
#   tipo=rol&id=<id>|name=<role>        -> un rol completo (acciones)
#   &limit=N (default 500, máx 5000)    &utf8=1 (fix de acentos)

use Encode ();

my $p     = $stash->{ws_params} // {};
my $tipo  = $p->{tipo} // '';
my $limit = ( $p->{limit} && $p->{limit} =~ /^\d+$/ ) ? ( $p->{limit} > 5000 ? 5000 : $p->{limit} ) : 500;
my $SENS  = qr/pass|api_?key|token|secret|salt|hash|credential/i;

sub _clean {
    my ($x) = @_;
    if ( ref $x eq 'HASH' ) {
        return { map { $_ => _clean( $x->{$_} ) } grep { $_ ne '_id' && $_ !~ $SENS } keys %$x };
    }
    return [ map { _clean($_) } @$x ] if ref $x eq 'ARRAY';
    return ref $x ? "$x" : $x;    # objetos (ObjectId, DateTime) -> string
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
my $LIST = { _id => 0, mid => 1, name => 1, moniker => 1, active => 1, collection => 1 };
my $r;

if ( $tipo eq 'clases' ) {
    my @c = mdb->master_doc->aggregate( [ { '$group' => { _id => '$collection', n => { '$sum' => 1 } } }, { '$sort' => { _id => 1 } } ] )->all;
    $r = { clases => [ map { { clase => $_->{_id}, cantidad => $_->{n} } } @c ] };
}
elsif ( $tipo eq 'ci' && $p->{mid} ) {
    my $d = mdb->master_doc->find_one( { mid => "$p->{mid}" } );
    $r = $d ? { ci => _clean($d), relaciones => _rels( $p->{mid} ) } : { error => "CI $p->{mid} no encontrado" };
}
elsif ( $tipo eq 'ci' && $p->{clase} ) {
    my @l = mdb->master_doc->find( { collection => "$p->{clase}" } )->fields($LIST)->limit($limit)->all;
    $r = { clase => $p->{clase}, total => scalar(@l), cis => \@l };
}
elsif ( $tipo eq 'usuarios' ) {
    my @l = mdb->master_doc->find( { collection => 'user' } )->fields( { _id => 0, mid => 1, name => 1, realname => 1, email => 1, active => 1 } )->limit($limit)->all;
    $r = { total => scalar(@l), usuarios => [ sort { ( $a->{name} // '' ) cmp( $b->{name} // '' ) } @l ] };
}
elsif ( $tipo eq 'usuario' && $p->{name} ) {
    my $d = mdb->master_doc->find_one( { collection => 'user', name => "$p->{name}" } );
    if ($d) {
        my @g = mdb->master_doc->find( { collection => 'UserGroup' } )->all;
        my @mios = grep {
            my $g = $_;
            grep { ( ref $_ ? ( $_->{mid} // '' ) : $_ ) eq $d->{mid} } @{ ref $g->{users} eq 'ARRAY' ? $g->{users} : [] }
        } @g;
        my @rel_g = mdb->master_rel->find( { '$or' => [ { from_mid => $d->{mid} }, { to_mid => $d->{mid} } ] } )->fields( { _id => 0 } )->limit(1000)->all;
        $r = { usuario => _clean($d), grupos => [ map { $_->{name} } @mios ], relaciones => \@rel_g };
    }
    else { $r = { error => "Usuario $p->{name} no encontrado" } }
}
elsif ( $tipo eq 'grupos' ) {
    my @l = mdb->master_doc->find( { collection => 'UserGroup' } )->limit($limit)->all;
    $r = { total => scalar(@l), grupos => [ map { { mid => $_->{mid}, name => $_->{name}, roles => _clean( $_->{roles} // $_->{role} ), usuarios => ( ref $_->{users} eq 'ARRAY' ? scalar @{ $_->{users} } : undef ) } } @l ] };
}
elsif ( $tipo eq 'grupo' && $p->{name} ) {
    my $d = mdb->master_doc->find_one( { collection => 'UserGroup', name => "$p->{name}" } );
    $r = $d ? { grupo => _clean($d), relaciones => _rels( $d->{mid} ) } : { error => "Grupo $p->{name} no encontrado" };
}
elsif ( $tipo eq 'roles' ) {
    my @l = mdb->role->find( {} )->fields( { _id => 0, id => 1, role => 1, description => 1 } )->limit($limit)->all;
    $r = { total => scalar(@l), roles => [ sort { ( $a->{role} // '' ) cmp( $b->{role} // '' ) } @l ] };
}
elsif ( $tipo eq 'rol' && ( $p->{id} || $p->{name} ) ) {
    my $d = $p->{id} ? ( mdb->role->find_one( { id => "$p->{id}" } ) // mdb->role->find_one( { id => 0 + $p->{id} } ) ) : mdb->role->find_one( { role => "$p->{name}" } );
    $r = $d ? { rol => _clean($d), campos => [ sort keys %$d ] } : { error => 'Rol no encontrado' };
}
else {
    $r = { error => 'Parámetro tipo inválido', tipos => [qw(clases ci usuarios usuario grupos grupo roles rol)] };
}

$r->{success} = $r->{error} ? \0 : \1;
$stash->{ws_response} = $p->{utf8} ? _enc_deep($r) : $r;
