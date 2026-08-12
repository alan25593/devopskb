my @topicos = mdb->topic->find({
        category_name     => 'Soporte',
        created_by        => 'olmedo',
        nivel_afectacion  => 'BFNivelAfectacion-9'
})->fields({ _id => 0, mid => 1 })->all;

foreach my $t (@topicos) {
    print "Encontrado Soporte MID: $t->{mid}\n";
}
