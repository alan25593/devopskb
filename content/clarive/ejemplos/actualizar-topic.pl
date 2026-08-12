# Actualización de datos de un tópico
mdb->topic->update(
    { mid => '274758' },
    {
        '$set' => {
            fecha_emision => '2025-09-19 00:00:00'
        }
    }
);
