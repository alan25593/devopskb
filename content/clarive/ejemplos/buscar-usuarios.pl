my @emails = (
    'alan.lampert@equila.com.ar',
    # ... pegá el resto acá
);

print "--- Inicio de búsqueda ---\n";

foreach my $mail (@emails) {

    # Limpiar posibles espacios provenientes de Excel
    $mail =~ s/^\s+|\s+$//g;

    my $user = ci->user->find_one({
        email => $mail
    });

    if ($user) {

        # En Clarive, el ID de login suele estar en 'name'
        my $username = $user->{name} || $user->{username};

        if ($username) {
            print "Mail: $mail -> Username: $username\n";
        }
        else {
            print "Mail: $mail -> Encontrado pero sin campo 'name'\n";
        }

    }
    else {
        print "ERROR: No se encontró el mail: $mail\n";
    }
}

print "--- Proceso finalizado ---\n";
