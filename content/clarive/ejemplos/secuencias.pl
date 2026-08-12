# Consultar el valor actual de una secuencia (ej. ref_audi)
my $val = mdb->seq('ref_audi');

print "El valor actual es: $val\n";

# Actualizar la secuencia (¡PRECAUCIÓN!)
# mdb->seq('ref_audi', 1017);
