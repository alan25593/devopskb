my $rango_encontrado;
my $presupuesto = $stash->{topic_data}->{presupuesto_total}; 
my @all_rangos = ci->BFRangosResponsable->find()->all();

foreach my $rango (@all_rangos) {
    my $minimo = $rango->{minimo};
    my $maximo = $rango->{maximo};
    
    $minimo = $minimo + 0;
    $maximo = defined $maximo ? $maximo + 0 : undef;
    
    if ($presupuesto >= $minimo && (!defined($maximo) || $presupuesto <= $maximo)) {
        $rango_encontrado = $rango;
        last;
    }
}

$rango_encontrado = $rango_encontrado->{mid};
$rango_encontrado;
