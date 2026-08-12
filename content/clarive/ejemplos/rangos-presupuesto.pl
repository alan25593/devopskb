my $topic = mdb->topic->find_one({ mid => '92000' });

my @all_rangos = ci->BFRangosResponsable->find()->all();
my $presupuesto = $topic->{presupuesto_total};
my $rango_encontrado;

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

if ($rango_encontrado) {
    my $rango_id = $rango_encontrado->{mid};
    print "El presupuesto $presupuesto está en el rango $rango_id\n";
} else {
    print "El presupuesto $presupuesto no se encuentra en ningún rango\n";
}
