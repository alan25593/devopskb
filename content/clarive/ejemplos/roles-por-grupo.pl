my $roles_x_grupo = mdb->master_doc->aggregate([
    { '$match' => { collection => 'UserGroup' } },
    { '$project' => { realname => 1, name => 1, 'project_security' => 1, '_id' => 0 } },
    { '$unwind'  => '$project_security' },
    { '$lookup' => {
            from         => 'master_doc',
            localField   => 'project_security.mid',
            foreignField => 'mid',
            as           => 'ci'
        }
    },
    { '$unwind' => '$ci'},
    {   '$project' => {
            realname => 1,
            name     => 1,
            role     => '$project_security.id_role',
            project  => '$ci.name',
            type     => '$ci.collection'
        }
    },
    { '$lookup' => {
            from         => 'role',
            localField   => 'role',
            foreignField => 'id',
            as           => 'role_data'
        }
    },
    { '$unwind' => '$role_data'},
    { '$project' => { realname => 1, name => 1, role => '$role_data.role', project => 1 } }, 
    
    { '$group' => {
        '_id' => { 
            name => '$name',
            project => '$project'
        },
        'roles' => { '$push' => '$role' },
        'realname' => { '$first' => '$realname' }
    } },
    
    { '$project' => {
        _id => 0,
        name => '$_id.name',
        project => '$_id.project',
        realname => '$realname',
        roles => '$roles'
    }}
])->all;

use Data::Dumper;
print Dumper($roles_x_grupo);
