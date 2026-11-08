# api_rule_get — Regla WEBSERVICE de SOLO LECTURA (crear solo en DEV)
# Un único nodo "Server CODE" (statement.code.server), lang perl.
#
# Uso:
#   /rule/json/api_rule_get?api_key=...&list=1             -> lista id, nombre y tipo de todas las reglas
#   /rule/json/api_rule_get?api_key=...&id=406             -> regla completa (meta + árbol)
#   /rule/json/api_rule_get?api_key=...&name=mi_regla      -> por nombre
#   &meta=1                                                -> sin el árbol (más liviano)
#
# Nota: /rule/json solo serializa ws_response si es hashref/arrayref (un string devuelve {}).

use JSON::XS;
use Encode ();

my $p = $stash->{ws_params} // {};

# Fix de acentos: /rule/json saca los strings como latin1. Con &utf8=1 se codifica todo a bytes UTF-8.
sub _enc_deep {
    my ($x) = @_;
    return [ map { _enc_deep($_) } @$x ] if ref $x eq 'ARRAY';
    return { map { $_ => _enc_deep($x->{$_}) } keys %$x } if ref $x eq 'HASH';
    return ( defined $x && !ref $x && utf8::is_utf8($x) ) ? Encode::encode('UTF-8', $x) : $x;
}
my $json = JSON::XS->new->utf8(0)->allow_nonref;

if ( $p->{list} ) {
    my @rules = mdb->rule->find({})->fields({ _id => 0, id => 1, rule_name => 1, rule_type => 1, rule_event => 1, rule_active => 1, ts => 1, username => 1 })->all;
    @rules = sort { ($a->{rule_name} // '') cmp ($b->{rule_name} // '') } @rules;
    $stash->{ws_response} = { success => \1, total => scalar(@rules), rules => \@rules };
}
else {
    my $doc;
    if ( defined $p->{id} && length $p->{id} ) {
        $doc = mdb->rule->find_one({ id => "$p->{id}" });
        $doc //= mdb->rule->find_one({ id => 0 + $p->{id} }) if $p->{id} =~ /^\d+$/;
    }
    elsif ( defined $p->{name} && length $p->{name} ) {
        $doc = mdb->rule->find_one({ rule_name => "$p->{name}" });
    }

    if ( !$doc ) {
        $stash->{ws_response} = { success => \0, msg => 'Regla no encontrada. Pasar id=... o name=... (o list=1)', params => $p };
    }
    else {
        delete $doc->{_id};
        my $tree = $doc->{rule_tree};
        if ( defined $tree && !ref $tree ) {
            my $dec = eval { $json->decode($tree) };
            $tree = $dec if $dec;
        }
        my %meta = map { $_ => $doc->{$_} } grep { $_ ne 'rule_tree' && !ref $doc->{$_} } keys %$doc;
        $stash->{ws_response} = {
            success => \1,
            meta    => \%meta,
            campos  => [ sort keys %$doc ],
            ( $p->{meta} ? () : ( rule_tree => $tree ) ),
        };
    }
}

$stash->{ws_response} = _enc_deep( $stash->{ws_response} ) if $p->{utf8};
