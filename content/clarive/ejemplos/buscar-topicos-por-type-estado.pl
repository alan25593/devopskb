my @topicos = mdb->topic->find({
    category_name          => 'Soporte',
    'category_status.id'   => 'status-61',
    'category_status.type' => 'G'
})->fields({mid => 1, title => 1})->all;

foreach my $t (@topicos) {
    print "$t->{mid} - $t->{title}\n";
}
